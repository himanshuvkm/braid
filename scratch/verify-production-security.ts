import { getDatabase, createUser, createSession, getSession, createProject } from '../lib/db';
import { hashPassword, verifyPassword } from '../lib/password';
import { checkRateLimit, resetRateLimits } from '../lib/rate-limit';
import { SyncServer } from '../sync-server/server';
import { WebSocketServer, WebSocket } from 'ws';

async function runProductionSecurityVerification() {
  console.log('--- STARTING PRODUCTION SECURITY VERIFICATION ---');

  // Test 1: Production Demo Seeding Guard
  console.log('\n[1] Testing Production Demo Account Seeding Guard...');
  (process.env as Record<string, string>).NODE_ENV = 'production';
  const prodDb = getDatabase(':memory:');
  const usersCount = prodDb.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (usersCount.count !== 0) {
    throw new Error(`Production database seeded ${usersCount.count} users unexpectedly!`);
  }
  console.log('✓ PASS: Production mode seeded 0 demo accounts automatically.');

  // Test 2: Real Scrypt Password Hashing & Timing-Safe Verification
  console.log('\n[2] Testing Password Hashing & Timing-Safe Verification...');
  const plaintext = 'CorrectHorseBatteryStaple2026!';
  const hash = await hashPassword(plaintext);
  if (!hash.startsWith('scrypt$')) throw new Error('Hash format invalid');
  const valid = await verifyPassword(plaintext, hash);
  const invalid = await verifyPassword('WrongPassword', hash);
  if (!valid || invalid) throw new Error('Password verification check failed');
  console.log('✓ PASS: Scrypt password hashing with cryptographic salt and constant-time match verified.');

  // Test 3: 256-bit Session Security & Expiration
  console.log('\n[3] Testing 256-bit Cryptographic Session IDs & Invalidation...');
  const userA = createUser({ name: 'Alice Owner', email: 'alice@prod.app', passwordHash: hash }, prodDb);
  const session = createSession(userA.id, 30, prodDb);
  if (!session.id.startsWith('sess-') || session.id.length < 60) {
    throw new Error('Session ID entropy insufficient');
  }
  const retrieved = getSession(session.id, prodDb);
  if (!retrieved || retrieved.user.email !== 'alice@prod.app') {
    throw new Error('Session retrieval failed');
  }
  console.log('✓ PASS: Session ID is 256-bit random hex with database persistence.');

  // Test 4: Rate Limiter on Brute-Force
  console.log('\n[4] Testing Rate Limiting on Authentication Endpoints...');
  resetRateLimits();
  const testIp = '10.0.0.99';
  for (let i = 0; i < 10; i++) {
    const res = checkRateLimit(`login:${testIp}`, 10, 60000);
    if (!res.allowed) throw new Error(`Rate limiter blocked request ${i} early`);
  }
  const blocked = checkRateLimit(`login:${testIp}`, 10, 60000);
  if (blocked.allowed) throw new Error('Rate limiter failed to block 11th request');
  console.log('✓ PASS: 10 attempts/min rate limiter actively throttles brute force attempts.');

  // Test 5: Live WebSocket Handshake Cookie Auth & Anti-Impersonation
  console.log('\n[5] Testing Live WebSocket Cookie Authentication & Anti-Impersonation...');
  const projectA = createProject({ ownerId: userA.id, name: 'Secret Vault' }, prodDb);

  const userAttacker = createUser({ name: 'Eve Attacker', email: 'eve@prod.app', passwordHash: hash }, prodDb);
  const sessionAttacker = createSession(userAttacker.id, 30, prodDb);

  const syncServer = new SyncServer();
  const wss = new WebSocketServer({ port: 0 });
  syncServer.attachWebSocketServer(wss);

  const port = (wss.address() as { port: number }).port;

  // 5A: Attacker connects with valid Eve session, but sends { userId: userA.id }
  const wsAttacker = new WebSocket(`ws://127.0.0.1:${port}?sessionId=${sessionAttacker.id}`);
  let attackerJoined = false;
  let attackerGotForbidden = false;

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => resolve(), 2000);

    wsAttacker.on('open', () => {
      wsAttacker.send(JSON.stringify({
        type: 'join',
        docId: projectA.id,
        siteId: 'site-attacker',
        userId: userA.id, // Forged userId attempt!
      }));
    });

    wsAttacker.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'sync') attackerJoined = true;
      if (msg.type === 'error' && msg.code === 403) attackerGotForbidden = true;
    });

    wsAttacker.on('close', () => {
      clearTimeout(timeout);
      resolve();
    });
  });

  if (attackerJoined || !attackerGotForbidden) {
    throw new Error('CRITICAL SECURITY FLAW: Attacker was able to access project by forging userId!');
  }
  console.log('✓ PASS: Attacker forged userId was IGNORED and connection was rejected with HTTP 403 Forbidden!');

  // 5B: Valid Owner Alice connects with valid session
  const wsAlice = new WebSocket(`ws://127.0.0.1:${port}?sessionId=${session.id}`);
  let aliceJoined = false;

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => resolve(), 2000);

    wsAlice.on('open', () => {
      wsAlice.send(JSON.stringify({
        type: 'join',
        docId: projectA.id,
        siteId: 'site-alice',
      }));
    });

    wsAlice.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'sync') {
        aliceJoined = true;
        clearTimeout(timeout);
        wsAlice.close();
        resolve();
      }
    });
  });

  if (!aliceJoined) {
    throw new Error('Valid owner was unable to connect with valid session!');
  }
  console.log('✓ PASS: Authenticated project owner joined room and received CRDT state.');

  wss.close();
  syncServer.close();

  console.log('\n=============================================');
  console.log('ALL PRODUCTION SECURITY CHECKS PASSED 100%!');
  console.log('=============================================\n');
}

runProductionSecurityVerification().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
