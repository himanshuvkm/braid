import { describe, it, expect } from "vitest";
import { RGA } from "../src/rga";
import { garbageCollect, computeStableCounters } from "../src/tombstone";

describe("tombstone garbage collection", () => {
  it("does not purge anything until a delete is causally stable everywhere", () => {
    const a = new RGA("a");
    const opX = a.localInsert(null, "X");
    a.localDelete(opX.id);

    // Simulate: this replica has only seen its own writes (counter=2 for
    // itself: insert + delete), and doesn't yet know site "b" exists.
    const stable = computeStableCounters([new Map([["a", 2]])]);
    const removed = garbageCollect(a, stable);

    expect(removed).toBe(1);
    expect(a.getText()).toBe(""); // visible text unaffected by GC either way
    expect(a.getNodes().length).toBe(0); // tombstone actually purged
  });

  it("withholds GC when any replica has not yet caught up (the whole point of tombstones)", () => {
    const a = new RGA("a");
    const opX = a.localInsert(null, "X");
    const del = a.localDelete(opX.id);

    // Replica "b" is lagging — it's only seen up through counter 1, not
    // the delete at counter 2. If we purged now and a new op from "b"
    // arrived anchored to opX, it would have nowhere to attach.
    const stable = computeStableCounters([
      new Map([["a", 2]]), // a's own view
      new Map([["a", 1]]), // what we know "b" has acked so far
    ]);
    const removed = garbageCollect(a, stable);

    expect(removed).toBe(0);
    expect(a.getNodes().length).toBe(1); // tombstone preserved as a safe anchor

    // Prove the anchor is actually still usable: a late insert from b,
    // referencing the not-yet-purged tombstone, still integrates.
    const b = new RGA("b");
    b.applyRemote(opX);
    const lateInsert = b.localInsert(opX.id, "late");
    a.applyRemote(del); // no-op, already applied
    expect(() => a.applyRemote(lateInsert)).not.toThrow();
    expect(a.getText()).toBe("late");
  });

  it("visible text never changes as a result of GC — it only reclaims memory", () => {
    const a = new RGA("a");
    a.localInsert(null, "keep");
    const before = a.getText();

    const stable = computeStableCounters([new Map([["a", 4]])]);
    garbageCollect(a, stable);

    expect(a.getText()).toBe(before);
  });
});
