import { describe, it, expect } from "vitest";
import { RGA } from "../src/rga";

describe("causality", () => {
  it("refuses to integrate an insert whose origin hasn't arrived yet", () => {
    const remote = new RGA("remote");
    const opA = remote.localInsert(null, "A");
    const opB = remote.localInsert(opA.id, "B"); // causally depends on opA

    const local = new RGA("local");
    expect(() => local.applyRemote(opB)).toThrow(/not yet known/);

    // Once the dependency arrives, it integrates fine.
    local.applyRemote(opA);
    local.applyRemote(opB);
    expect(local.getText()).toBe("AB");
  });

  it("refuses to delete a node that hasn't arrived yet", () => {
    const remote = new RGA("remote");
    const op = remote.localInsert(null, "Z");
    const del = remote.localDelete(op.id);

    const local = new RGA("local");
    expect(() => local.applyRemote(del)).toThrow(/not yet known/);

    local.applyRemote(op);
    local.applyRemote(del);
    expect(local.getText()).toBe("");
  });

  it("applying the same insert twice is a no-op (idempotence)", () => {
    const a = new RGA("a");
    const op = a.localInsert(null, "Q");

    const b = new RGA("b");
    b.applyRemote(op);
    b.applyRemote(op); // duplicate delivery — network retries do this
    b.applyRemote(op);

    expect(b.getText()).toBe("Q");
  });

  it("lamport clock advances past the highest counter it has observed", () => {
    const a = new RGA("a");
    const opsA = ["h", "i"].map((ch) => a.localInsert(null, ch));

    const b = new RGA("b");
    for (const op of opsA) b.applyRemote(op);

    // b's next local op must sort after everything it has already seen.
    const opB = b.localInsert(opsA[opsA.length - 1].id, "!");
    expect(opB.id.counter).toBeGreaterThan(opsA[opsA.length - 1].id.counter);
  });
});
