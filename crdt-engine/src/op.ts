import type { OpId } from "./clock";

/**
 * Insert a single character (or grapheme cluster) immediately after the
 * node identified by originId (null = insert at the very start of the doc).
 * originId anchors the insert causally — it's what lets us re-derive a
 * consistent position even when other inserts have happened concurrently
 * at the same spot on other replicas.
 */
export interface InsertOp {
  type: "insert";
  id: OpId;
  originId: OpId | null;
  value: string;
}

/**
 * Deletes are tombstones, not removals — see tombstone.ts for why.
 * A delete gets its own id (separate from targetId) because GC stability
 * has to be judged by when the DELETE became known everywhere, not when
 * the original character was inserted.
 */
export interface DeleteOp {
  type: "delete";
  id: OpId;
  targetId: OpId;
}

export type Op = InsertOp | DeleteOp;
