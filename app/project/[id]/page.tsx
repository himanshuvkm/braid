import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../../lib/auth';
import { getProject, getProjectRole } from '../../../lib/db';
import { ProjectEditor } from '../../../components/project/ProjectEditor';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage(props: PageProps) {
  const { id: projectId } = await props.params;

  // 1. Authenticate user
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?from=/project/${projectId}`);
  }

  // 2. Query project from database
  const project = getProject(projectId);
  if (!project) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#ffffff] border border-[#e4e4e7] rounded-3xl p-8 text-center shadow-xs flex flex-col items-center gap-4">
          <span className="text-4xl">🔍</span>
          <h1 className="text-xl font-bold text-[#000000]">Document Not Found</h1>
          <p className="text-xs text-[#666666]">
            The document <span className="font-mono bg-[#ececf0] px-1.5 py-0.5 rounded">{projectId}</span> does not exist or has been deleted.
          </p>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-full bg-[#000000] text-[#ffffff] text-xs font-bold hover:opacity-90 transition-opacity mt-2"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // 3. Check authorization role
  const role = getProjectRole(projectId, user.id);
  if (!role) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#ffffff] border border-[#e4e4e7] rounded-3xl p-8 text-center shadow-xs flex flex-col items-center gap-4">
          <span className="text-4xl">🔒</span>
          <h1 className="text-xl font-bold text-[#000000]">Access Denied</h1>
          <p className="text-xs text-[#666666]">
            You do not have permission to view or edit this document. Contact the project owner to request access.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-full bg-[#000000] text-[#ffffff] text-xs font-bold hover:opacity-90 transition-opacity"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Render ProjectEditor with persisted snapshot & role
  return <ProjectEditor project={project} user={user} role={role} />;
}
