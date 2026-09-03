import { getAdapter } from '../db';
import { runMigrations } from './migrations';

async function main() {
  console.log('[Braid Database Migration] Running migrations...');
  const adapter = getAdapter();
  console.log(`[Braid Database Migration] Database adapter: ${adapter.type}`);

  try {
    const result = await runMigrations(adapter);
    if (result.applied.length > 0) {
      console.log(`[Braid Database Migration] Successfully applied ${result.applied.length} migration(s):`);
      for (const name of result.applied) {
        console.log(`  + ${name}`);
      }
    } else {
      console.log('[Braid Database Migration] Database is already up to date.');
    }

    if (result.alreadyApplied.length > 0) {
      console.log(`[Braid Database Migration] Previously applied (${result.alreadyApplied.length}): ${result.alreadyApplied.join(', ')}`);
    }

    await adapter.close();
    process.exit(0);
  } catch (err) {
    console.error('[Braid Database Migration] Migration failed:', err);
    await adapter.close();
    process.exit(1);
  }
}

main();
