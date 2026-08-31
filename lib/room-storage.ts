/**
 * Lightweight client-side helper for room metadata and user identity storage.
 * Designed so a persistence layer (e.g. database/API) can be slotted in seamlessly later.
 */

const memoryStore: Record<string, string> = {};

export function generateRoomId(): string {
  // Generates clean, human-readable room IDs (e.g. doc-4k9z2a)
  return `doc-${Math.random().toString(36).substring(2, 8)}`;
}

export function getStoredUserName(roomId?: string): string | null {
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (roomId) {
        const roomVal = sessionStorage.getItem(`braid:userName:${roomId}`);
        if (roomVal) return roomVal;
      }
      const generalVal = sessionStorage.getItem('braid:userName');
      if (generalVal) return generalVal;
    }
    if (typeof localStorage !== 'undefined') {
      if (roomId) {
        const roomVal = localStorage.getItem(`braid:userName:${roomId}`);
        if (roomVal) return roomVal;
      }
      const generalVal = localStorage.getItem('braid:userName');
      if (generalVal) return generalVal;
    }
  } catch {}

  if (roomId && memoryStore[`braid:userName:${roomId}`]) {
    return memoryStore[`braid:userName:${roomId}`];
  }
  return memoryStore['braid:userName'] || null;
}

export function setStoredUserName(name: string, roomId?: string): void {
  if (!name.trim()) return;
  const trimmed = name.trim();
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (roomId) sessionStorage.setItem(`braid:userName:${roomId}`, trimmed);
      sessionStorage.setItem('braid:userName', trimmed);
    }
    if (typeof localStorage !== 'undefined') {
      if (roomId) localStorage.setItem(`braid:userName:${roomId}`, trimmed);
      localStorage.setItem('braid:userName', trimmed);
    }
  } catch {}

  if (roomId) {
    memoryStore[`braid:userName:${roomId}`] = trimmed;
  }
  memoryStore['braid:userName'] = trimmed;
}

export function getStoredRoomName(roomId: string): string | null {
  if (!roomId) return null;
  const key = `braid_room_name_${roomId}`;
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(key);
      if (val) return val;
    }
  } catch {}
  return memoryStore[key] || null;
}

export function setStoredRoomName(roomId: string, roomName: string): void {
  if (!roomId || !roomName.trim()) return;
  const key = `braid_room_name_${roomId}`;
  const trimmed = roomName.trim();
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, trimmed);
  } catch {}
  memoryStore[key] = trimmed;
}
