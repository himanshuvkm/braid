import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getCurrentUser, SESSION_COOKIE_NAME } from '../../lib/auth';
import { getProject } from '../../lib/db';
import { createWebSocketToken } from '../../lib/ws-token';
import { ProjectEditor } from '../../components/project/ProjectEditor';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ name?: string; user?: string }>;
}

export default async function DocumentPage(props: PageProps) {
  const { id: rawId } = await props.params;
  const docId = decodeURIComponent(rawId);
  const sp = props.searchParams ? await props.searchParams : {};
  const customName = sp.name ? decodeURIComponent(sp.name) : undefined;
  const customUser = sp.user ? decodeURIComponent(sp.user) : undefined;

  // 1. Get logged-in user or provide lightweight collaborator identity
  const loggedInUser = await getCurrentUser();
  const user = loggedInUser || {
    id: `guest-${Math.random().toString(36).substring(2, 8)}`,
    name: customUser || 'Collaborator',
    email: 'collaborator@braid.app',
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  // 2. Query project from database or initialize open collaborative room
  let project = await getProject(docId);
  if (!project) {
    const documentTitle = customName || (docId.startsWith('proj-') || docId.startsWith('doc-') ? 'Untitled Document' : docId);
    project = {
      id: docId,
      name: documentTitle,
      content: `# ${documentTitle}\n\nStart writing, or type / for commands...`,
      owner_id: user.id,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
  }

  // 3. Generate initial WebSocket token for zero-waterfall instant CRDT connection
  let initialWsToken: string | undefined;
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    initialWsToken = createWebSocketToken({
      userId: user.id,
      sessionId: sessionCookie?.value || `guest-session-${user.id}`,
      expiresInSeconds: 300,
    });
  } catch {}

  // 4. Render collaborative ProjectEditor with open access
  return (
    <ProjectEditor
      project={project}
      user={user}
      role="OWNER"
      initialWsToken={initialWsToken}
    />
  );
}
