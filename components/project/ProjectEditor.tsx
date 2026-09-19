'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Editor, type AutoSaveStatus } from '../editor/Editor';
import type { User, Project, ProjectRole } from '../../lib/db';

interface ProjectEditorProps {
  project: Project;
  user: User;
  role?: ProjectRole;
  initialWsToken?: string;
}

export function ProjectEditor({ project, user, role = 'OWNER', initialWsToken }: ProjectEditorProps) {
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>('saved');

  const pendingSaveContentRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced Auto-save to Server API
  const triggerAutoSave = useCallback(
    (latestContent: string) => {
      pendingSaveContentRef.current = latestContent;
      setSaveStatus('saving');

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        const contentToSave = pendingSaveContentRef.current;
        if (contentToSave === null) return;

        try {
          const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: contentToSave }),
          });

          if (!res.ok) {
            throw new Error('Save request failed');
          }

          setSaveStatus('saved');
          pendingSaveContentRef.current = null;
        } catch {
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setSaveStatus('offline');
          } else {
            setSaveStatus('error');
          }
        }
      }, 1000); // 1-second debounce
    },
    [project.id]
  );

  const handleContentChange = useCallback(
    (newContent: string) => {
      triggerAutoSave(newContent);
    },
    [triggerAutoSave]
  );

  const flushSave = useCallback(async () => {
    if (pendingSaveContentRef.current !== null) {
      const contentToSave = pendingSaveContentRef.current;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      try {
        await fetch(`/api/projects/${encodeURIComponent(project.id)}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: contentToSave }),
        });
        setSaveStatus('saved');
        pendingSaveContentRef.current = null;
      } catch {}
    }
  }, [project.id]);

  // Immediate flush on page refresh or unload to eliminate persistence window
  useEffect(() => {
    const handleUnload = () => {
      if (pendingSaveContentRef.current !== null) {
        const payload = JSON.stringify({ content: pendingSaveContentRef.current });
        try {
          fetch(`/api/projects/${encodeURIComponent(project.id)}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          });
        } catch {}
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [project.id]);

  return (
    <Editor
      documentId={project.id}
      initialRoomName={project.name || project.id}
      userName={user.name}
      userId={user.id}
      wsToken={initialWsToken}
      isReadOnly={false}
      initialContent={project.content}
      onContentChange={handleContentChange}
      saveStatus={saveStatus}
      onFlushSave={flushSave}
    />
  );
}
