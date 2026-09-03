import { LamportClock, OpId, compareId, idKey, idsEqual } from "./clock";
import type { Op, InsertOp, DeleteOp } from "./op";

export interface Node {
  id: OpId;
  originId: OpId | null;
  value: string;
  deleted: boolean;
  /** id of the delete op that tombstoned this node, if any (see tombstone.ts). */
  deletedAt: OpId | null;
}

/**
 * RGA (Replicated Growable Array).
 *
 * The document is a sequence of nodes (including tombstoned ones — see
 * tombstone.ts). Every node knows which node it was inserted immediately
 * after (originId). The convergence guarantee comes entirely from
 * `integrate`: given the same set of ops, every replica places them in
 * the same final order, REGARDLESS of the order those ops were applied
 * in locally. That property — not any particular UI behavior — is what
 * this package's tests exist to prove.
 */
export class RGA {
  private readonly clock: LamportClock;
  private seq: Node[] = [];
  private readonly index = new Map<string, number>(); // idKey -> position in seq

  constructor(siteId: string) {
    this.clock = new LamportClock(siteId);
  }

  get siteId(): string {
    return this.clock.site;
  }

  // ---- local mutations (produce an Op to broadcast) ----------------------

  /** Insert `value` immediately after the node with id `afterId` (null = start). */
  localInsert(afterId: OpId | null, value: string): InsertOp {
    const id = this.clock.tick();
    const op: InsertOp = { type: "insert", id, originId: afterId, value };
    this.applyInsert(op);
    return op;
  }

  localDelete(targetId: OpId): DeleteOp {
    const id = this.clock.tick();
    const op: DeleteOp = { type: "delete", id, targetId };
    this.applyDelete(op);
    return op;
  }

  // ---- remote application (idempotent, order-independent) ----------------

  /**
   * Apply an op received from another replica. Safe to call multiple
   * times with the same op (idempotent) and safe to call with ops in
   * any order relative to other remote ops, AS LONG AS an insert's
   * originId has already been integrated (standard causal-delivery
   * requirement — buffer out-of-order ops upstream if your transport
   * doesn't guarantee this).
   */
  applyRemote(op: Op): void {
    this.clock.observe(op.id);
    if (op.type === "insert") {
      if (this.index.has(idKey(op.id))) return; // already integrated
      this.applyInsert(op);
    } else {
      this.applyDelete(op);
    }
  }

  private applyInsert(op: InsertOp): void {
    const node: Node = {
      id: op.id,
      originId: op.originId,
      value: op.value,
      deleted: false,
      deletedAt: null,
    };

    const originIdx = op.originId === null ? -1 : this.index.get(idKey(op.originId));
    if (op.originId !== null && originIdx === undefined) {
      throw new Error(
        `Cannot integrate insert ${idKey(op.id)}: origin ${idKey(op.originId)} not yet known. ` +
          `Ops must be delivered in causal order.`
      );
    }

    let i = (originIdx ?? -1) + 1;

    // Skip forward over any nodes that were concurrently inserted "in front
    // of" this one at the same anchor point, so every replica lands on the
    // same final position regardless of delivery order. Two rules:
    //  1. Direct siblings of the same origin are ordered by id, descending
    //     (higher id sorts closer to the origin) — a fixed tiebreak for
    //     truly concurrent inserts at the identical spot.
    //  2. A node whose own origin lies at-or-after our origin is causally
    //     "nested" ahead of us and must be skipped too.
    const originsMatch = (a: OpId | null, b: OpId | null): boolean =>
      a === null && b === null ? true : a !== null && b !== null ? idsEqual(a, b) : false;

    while (i < this.seq.length) {
      const other = this.seq[i];
      const otherOriginIdx = other.originId === null ? -1 : this.index.get(idKey(other.originId))!;

      if (originsMatch(other.originId, op.originId)) {
        // Direct siblings of the same anchor (including two independent
        // root-level inserts, both null) — deterministic tiebreak by id,
        // descending, so every replica lands on the same order regardless
        // of which insert it happened to see first.
        if (compareId(other.id, op.id) > 0) {
          i++;
          continue;
        }
        break;
      }

      if (otherOriginIdx >= (originIdx ?? -1)) {
        i++;
        continue;
      }
      break;
    }

    this.seq.splice(i, 0, node);
    this.reindexFrom(i);
  }

  private applyDelete(op: DeleteOp): void {
    const idx = this.index.get(idKey(op.targetId));
    if (idx === undefined) {
      throw new Error(
        `Cannot delete ${idKey(op.targetId)}: not yet known. Ops must be delivered in causal order ` +
          `(the insert must arrive before a delete that targets it).`
      );
    }
    this.seq[idx].deleted = true;
    // Idempotent: keep the earliest delete's id if this target was somehow
    // deleted more than once (shouldn't happen from a single well-behaved
    // client, but a duplicate/retried delete op must not regress state).
    if (this.seq[idx].deletedAt === null || compareId(op.id, this.seq[idx].deletedAt!) < 0) {
      this.seq[idx].deletedAt = op.id;
    }
  }

  private reindexFrom(start: number): void {
    for (let i = start; i < this.seq.length; i++) {
      this.index.set(idKey(this.seq[i].id), i);
    }
  }

  // ---- read model ----------------------------------------------------------

  /** Visible document text — tombstones excluded. */
  getText(): string {
    return this.seq
      .filter((n) => !n.deleted)
      .map((n) => n.value)
      .join("");
  }

  /** String representation of document text (alias for getText). */
  toString(): string {
    return this.getText();
  }

  /** Full node list including tombstones — used by tombstone.ts / debugging. */
  getNodes(): readonly Node[] {
    return this.seq;
  }

  /** id of the last visible node before the given visible-text offset (for cursor mapping). */
  idAtVisibleOffset(offset: number): OpId | null {
    let seen = 0;
    let last: OpId | null = null;
    for (const n of this.seq) {
      if (n.deleted) continue;
      if (seen === offset) return last;
      last = n.id;
      seen++;
    }
    return last;
  }

  /**
   * Physically drop tombstoned nodes whose id.counter <= minStableCounter.
   * Caller (tombstone.ts) is responsible for proving that counter is
   * causally stable across every replica before calling this — RGA itself
   * has no visibility into other replicas' state.
   */
  compact(minStableCounter: number): number {
    const before = this.seq.length;
    this.seq = this.seq.filter(
      (n) => !(n.deleted && n.deletedAt !== null && n.deletedAt.counter <= minStableCounter)
    );
    this.index.clear();
    this.reindexFrom(0);
    return before - this.seq.length;
  }
}
