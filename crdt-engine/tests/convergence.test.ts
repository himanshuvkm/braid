import { describe, it, expect } from "vitest";
import { RGA } from "../src/rga";
import type { Op } from "../src/op";

/**
 * The central claim of a CRDT is: given the same set of operations,
 * every replica converges to the identical final state, NO MATTER
 * what order those operations are applied in locally. These tests
 * apply the same op set in multiple different orders and assert
 * the resulting documents are byte-identical.
 */

function shuffledCopy<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  // deterministic Fisher-Yates using a simple LCG, so failures are reproducible
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

describe("convergence: sequential typing replays identically regardless of delivery order", () => {
  it("two replicas typing independently onto the same origin converge", () => {
    const a = new RGA("site-a");
    const b = new RGA("site-b");

    // Both start from an empty doc and insert at position 0 concurrently —
    // the classic "two people type at the same spot at once" case.
    const opA = a.localInsert(null, "A");
    const opB = b.localInsert(null, "B");

    // Deliver in opposite orders to each replica.
    a.applyRemote(opB);
    b.applyRemote(opA);

    expect(a.getText()).toBe(b.getText());
    expect(a.getText().length).toBe(2);
  });

  it("converges across many random delivery orderings of the same op set", () => {
    const author = new RGA("author");
    const ops: Op[] = [];
    let cursor: Parameters<RGA["localInsert"]>[0] = null;
    for (const ch of "hello world") {
      const op = author.localInsert(cursor, ch);
      ops.push(op);
      cursor = op.id;
    }

    const reference = author.getText();
    expect(reference).toBe("hello world");

    for (let seed = 1; seed <= 8; seed++) {
      const replica = new RGA(`replica-${seed}`);
      // Causal order must still be respected (an insert's origin must
      // exist before it's applied) — we shuffle only among ops whose
      // relative causal order is preserved, which for a straight typing
      // sequence means we can't shuffle at all without violating
      // causality. So instead: replay them out of REAL-TIME order by
      // buffering and retrying, proving the engine tolerates delayed
      // delivery as long as causal order is eventually satisfied.
      const pending = shuffledCopy(ops, seed);
      let remaining = pending;
      let guard = 0;
      while (remaining.length > 0 && guard < ops.length * ops.length + 10) {
        const next: Op[] = [];
        for (const op of remaining) {
          try {
            replica.applyRemote(op);
          } catch {
            next.push(op); // origin not yet integrated — retry later
          }
        }
        remaining = next;
        guard++;
      }
      expect(remaining.length).toBe(0);
      expect(replica.getText()).toBe(reference);
    }
  });

  it("concurrent inserts at the same anchor point are ordered identically on every replica", () => {
    const base = new RGA("seed");
    const first = base.localInsert(null, "X");

    const siteA = new RGA("site-a");
    const siteB = new RGA("site-b");
    siteA.applyRemote(first);
    siteB.applyRemote(first);

    // Both sites now independently insert right after "X" — a genuine
    // concurrent edit at the identical position.
    const opA = siteA.localInsert(first.id, "1");
    const opB = siteB.localInsert(first.id, "2");

    // Cross-deliver, in opposite arrival order on each side.
    siteA.applyRemote(opB);
    siteB.applyRemote(opA);

    expect(siteA.getText()).toBe(siteB.getText());
  });

  it("concurrent delete + concurrent insert-after-the-deleted-node both resolve consistently", () => {
    const seed = new RGA("seed");
    const opX = seed.localInsert(null, "X");

    const siteA = new RGA("site-a");
    const siteB = new RGA("site-b");
    siteA.applyRemote(opX);
    siteB.applyRemote(opX);

    // Site A deletes X while, concurrently, Site B inserts right after X.
    const delOp = siteA.localDelete(opX.id);
    const insOp = siteB.localInsert(opX.id, "Y");

    siteA.applyRemote(insOp);
    siteB.applyRemote(delOp);

    // X is gone from visible text on both sides, but Y survives on both —
    // this is exactly the scenario tombstones exist to make possible.
    expect(siteA.getText()).toBe("Y");
    expect(siteB.getText()).toBe("Y");
  });
});
