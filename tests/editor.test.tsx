import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Editor } from '../components/editor/Editor';
import Home from '../app/page';
import {
  generateRoomId,
  getStoredUserName,
  setStoredUserName,
  getStoredRoomName,
  setStoredRoomName,
} from '../lib/room-storage';
import { SyncClient } from '../lib/sync-client';
import type { PeerInfo, SyncMessage } from '../sync-server/server';
import { RGA } from '../crdt-engine/src/rga';

// Mock next/navigation useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('Direct Room URL Identity Flow and Join Gate', () => {
  it('renders Join Room gate on direct URL visit when no user identity is present', () => {
    const html1 = renderToString(<Editor documentId="doc-direct123" />);
    const html2 = renderToString(<Editor documentId="doc-direct123" />);

    // Both SSR renders are completely deterministic and identical
    expect(html1).toBe(html2);

    // Gate elements must be present
    expect(html1).toContain('Join Room');
    expect(html1).toContain('Your Name');
    expect(html1).toContain('doc-direct123');
    expect(html1).toContain('Live Collaborative Session');

    // Editor textarea and presence must NOT be active
    expect(html1).not.toContain('CRDT nodes');
    expect(html1).not.toContain('tombstones');
    expect(html1).not.toContain('Peer-');
  });

  it('bypasses Join Room gate and immediately renders editor when user identity is provided', () => {
    const html = renderToString(
      <Editor
        documentId="doc-test123"
        siteId="site-custom1"
        userName="Alice"
        initialRoomName="Product Roadmap"
      />
    );

    expect(html).toContain('Alice');
    expect(html).toContain('title="You (site-custom1)"');
    expect(html).toContain('Product Roadmap');
    expect(html).toContain('doc-test123');
    expect(html).toContain('CRDT nodes');
    expect(html).toContain('tombstones');
    expect(html).not.toContain('Join Room');
  });

  it('room-scoped storage isolates identities between different rooms', () => {
    setStoredUserName('Alice', 'room-alpha');
    setStoredUserName('Bob', 'room-beta');

    expect(getStoredUserName('room-alpha')).toBe('Alice');
    expect(getStoredUserName('room-beta')).toBe('Bob');
  });
});

describe('Landing Page and Room Flows', () => {
  it('renders the Landing Page with Create and Join tabs', () => {
    const html = renderToString(<Home />);
    expect(html).toContain('Braid');
    expect(html).toContain('Create a Room');
    expect(html).toContain('Join a Room');
    expect(html).toContain('Room Name');
    expect(html).toContain('Your Name');
  });

  it('room-storage utility generates valid room IDs and manages storage', () => {
    const id = generateRoomId();
    expect(id).toMatch(/^doc-[a-z0-9]+$/);

    setStoredRoomName('doc-123', 'Sprint Planning');
    expect(getStoredRoomName('doc-123')).toBe('Sprint Planning');
  });
});

describe('Peer Presence and Collaborator Management in SyncClient', () => {
  it('tracks peer join, update, and leave presence events accurately', () => {
    let presenceList: PeerInfo[] = [];
    const rga = new RGA('site-me');

    const client = new SyncClient({
      serverUrl: 'ws://mock-presence',
      docId: 'presence-doc',
      siteId: rga.siteId,
      autoConnect: false,
      onPresenceChange: (peers) => {
        presenceList = peers;
      },
    });

    const clientInternal = client as unknown as { handleServerMessage: (msg: SyncMessage) => void };

    // Simulate handleServerMessage with sync message
    clientInternal.handleServerMessage({
      type: 'sync',
      docId: 'presence-doc',
      history: [],
      peers: [{ siteId: 'site-peer1', name: 'Bob', color: '#B0D0F5' }],
    });

    expect(client.connectedPeers.length).toBe(1);
    expect(presenceList.length).toBe(1);
    expect(presenceList[0].name).toBe('Bob');

    // Simulate new peer joining
    clientInternal.handleServerMessage({
      type: 'presence',
      docId: 'presence-doc',
      siteId: 'site-peer2',
      name: 'Charlie',
      color: '#B0F5D0',
      action: 'join',
    });

    expect(client.connectedPeers.length).toBe(2);
    expect(presenceList.length).toBe(2);

    // Simulate peer leaving
    clientInternal.handleServerMessage({
      type: 'presence',
      docId: 'presence-doc',
      siteId: 'site-peer1',
      action: 'leave',
    });

    expect(client.connectedPeers.length).toBe(1);
    expect(presenceList.length).toBe(1);
    expect(presenceList[0].name).toBe('Charlie');

    client.disconnect();
    expect(client.connectedPeers.length).toBe(0);
  });
});
