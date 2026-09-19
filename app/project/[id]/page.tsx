import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUser, SESSION_COOKIE_NAME } from '../../../lib/auth';
import { getProject, getProjectRole } from '../../../lib/db';
import { createWebSocketToken } from '../../../lib/ws-token';
import { ProjectEditor } from '../../../components/project/ProjectEditor';
import { Icons } from '../../../components/ui/icons';
import { Button } from '../../../components/ui/button';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage(props: PageProps) {
  const { id: projectId } = await props.params;
  redirect(`/${encodeURIComponent(projectId)}`);
}
