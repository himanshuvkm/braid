/**
 * Every operation gets a unique, totally-ordered ID: a Lamport counter
 * paired with a site (replica) identifier as a tiebreaker. This is what
 * lets independently-generated concurrent operations be ordered the
 * same way on every replica, which is the whole basis for convergence.
 */
export interface OpId {
  counter: number;
  siteId: string;
}

export function idKey(id: OpId): string {
  return `${id.counter}:${id.siteId}`;
}

export function idsEqual(a: OpId, b: OpId): boolean {
  return a.counter === b.counter && a.siteId === b.siteId;
}

/** Total order over OpIds: counter first, siteId as deterministic tiebreak. */
export function compareId(a: OpId, b: OpId): number {
  if (a.counter !== b.counter) return a.counter - b.counter;
  if (a.siteId === b.siteId) return 0;
  return a.siteId < b.siteId ? -1 : 1;
}

export class LamportClock {
  private counter = 0;

  constructor(private readonly siteId: string) {}

  /** Generate a fresh, locally-unique ID and advance the clock. */
  tick(): OpId {
    this.counter += 1;
    return { counter: this.counter, siteId: this.siteId };
  }

  /**
   * Fold a remote timestamp into the local clock (standard Lamport rule).
   * Must be called for every remote op BEFORE any local tick that should
   * causally follow it, or causality guarantees break.
   */
  observe(remote: OpId): void {
    this.counter = Math.max(this.counter, remote.counter);
  }

  get site(): string {
    return this.siteId;
  }

  get value(): number {
    return this.counter;
  }
}
