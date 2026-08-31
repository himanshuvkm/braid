import { RGA } from '../crdt-engine/src/index';
import type { Op, OpId } from '../crdt-engine/src/index';
import { CausalBuffer } from '../lib/sync-client';

interface BenchmarkResult {
  numPeers: number;
  totalOps: number;
  elapsedMs: number;
  opsPerSec: number;
  converged: boolean;
  finalLength: number;
}

export function runConcurrentEditorsBenchmark(
  numPeers: number = 5,
  opsPerPeer: number = 200
): BenchmarkResult {
  console.log(`\n=== Running CRDT Benchmark: ${numPeers} Peers, ${opsPerPeer} ops/peer ===`);

  const peers: RGA[] = [];
  for (let i = 0; i < numPeers; i++) {
    peers.push(new RGA(`peer-${i}`));
  }

  const allGeneratedOps: { originPeerIdx: number; op: Op }[] = [];

  const startTime = performance.now();

  // 1. Generate concurrent local operations across peers
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
  for (let step = 0; step < opsPerPeer; step++) {
    for (let peerIdx = 0; peerIdx < numPeers; peerIdx++) {
      const doc = peers[peerIdx];
      const currentLength = doc.getText().length;
      const shouldInsert = currentLength === 0 || Math.random() > 0.3;

      if (shouldInsert) {
        const char = alphabet[Math.floor(Math.random() * alphabet.length)];
        const insertIdx = Math.floor(Math.random() * (currentLength + 1));
        const afterId: OpId | null =
          insertIdx === 0 ? null : doc.idAtVisibleOffset(insertIdx);
        const op = doc.localInsert(afterId, char);
        allGeneratedOps.push({ originPeerIdx: peerIdx, op });
      } else {
        const deleteIdx = Math.floor(Math.random() * currentLength);
        const targetId = doc.idAtVisibleOffset(deleteIdx + 1);
        if (targetId) {
          const op = doc.localDelete(targetId);
          allGeneratedOps.push({ originPeerIdx: peerIdx, op });
        }
      }
    }
  }

  // 2. Cross-deliver all operations to all other peers using CausalBuffer
  const buffers: CausalBuffer[] = peers.map(() => new CausalBuffer());
  for (const { originPeerIdx, op } of allGeneratedOps) {
    for (let targetPeerIdx = 0; targetPeerIdx < numPeers; targetPeerIdx++) {
      if (targetPeerIdx !== originPeerIdx) {
        buffers[targetPeerIdx].tryApply(peers[targetPeerIdx], op);
      }
    }
  }

  // Drain any remaining buffered ops
  for (let targetPeerIdx = 0; targetPeerIdx < numPeers; targetPeerIdx++) {
    buffers[targetPeerIdx].flush(peers[targetPeerIdx]);
  }

  const elapsedMs = performance.now() - startTime;
  const totalOps = allGeneratedOps.length;
  const opsPerSec = totalOps / (elapsedMs / 1000);

  // 3. Verify complete convergence
  const baseline = peers[0].getText();
  let converged = true;
  for (let i = 1; i < numPeers; i++) {
    if (peers[i].getText() !== baseline) {
      converged = false;
      break;
    }
  }

  console.log(`Completed in: ${elapsedMs.toFixed(2)}ms`);
  console.log(`Throughput: ${opsPerSec.toFixed(2)} ops/sec`);
  console.log(`Converged: ${converged ? 'YES (All peers identical)' : 'FAILED'}`);
  console.log(`Final Doc Length: ${baseline.length}`);

  return {
    numPeers,
    totalOps,
    elapsedMs,
    opsPerSec,
    converged,
    finalLength: baseline.length,
  };
}

if (typeof require !== 'undefined' && require.main === module) {
  runConcurrentEditorsBenchmark(5, 500);
}
