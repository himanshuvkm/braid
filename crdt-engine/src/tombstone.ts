import type { RGA } from "./rga";

/**
 * Why tombstones exist at all: if a delete just removed the node outright,
 * a concurrent insert on another replica that was anchored to that node
 * (originId pointing at it) would have nowhere to attach when it arrives —
 * you'd either drop the insert or crash. Keeping a deleted-but-present
 * tombstone means every replica always has a stable anchor for any
 * concurrent op that references it, no matter what order things arrive in.
 *
 * The tradeoff: tombstones accumulate forever unless something reclaims
 * them. That's only safe once a tombstone is "causally stable" — every
 * replica has already seen the delete AND can no longer generate a new
 * insert anchored to it (because a new insert would have to descend from
 * an op that replica has already observed).
 *
 * In production this stability point is computed from a vector clock
 * (per-site "I have seen everything up to counter N from you"), which
 * needs an out-of-band ack channel from the sync server. This module
 * takes that computed safe point as an argument rather than owning the
 * ack protocol itself, so it can be unit-tested without a network.
 */

/**
 * Physically remove tombstoned nodes whose id is causally older than
 * every entry in `stableCounters` (site -> highest counter that site's
 * writes are known to be stable up to). A node is safe to purge only if
 * ALL sites have reached at least its counter — otherwise some replica
 * might still be about to deliver an insert anchored to it.
 */
export function garbageCollect(rga: RGA, stableCounters: ReadonlyMap<string, number>): number {
  if (stableCounters.size === 0) return 0;
  const minStable = Math.min(...Array.from(stableCounters.values()));
  if (!Number.isFinite(minStable)) return 0;
  return rga.compact(minStable);
}

/** Convenience: build a stableCounters map from a set of per-site vector clocks. */
export function computeStableCounters(
  vectorClocks: ReadonlyArray<ReadonlyMap<string, number>>
): Map<string, number> {
  const sites = new Set<string>();
  for (const vc of vectorClocks) for (const s of vc.keys()) sites.add(s);

  const result = new Map<string, number>();
  for (const site of sites) {
    let min = Infinity;
    for (const vc of vectorClocks) {
      min = Math.min(min, vc.get(site) ?? 0);
    }
    result.set(site, min);
  }
  return result;
}
