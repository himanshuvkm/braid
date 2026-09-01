import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../../lib/auth';
import { getProject, getProjectRole } from '../../../lib/db';
import { ProjectEditor } from '../../../components/project/ProjectEditor';
import { Icons } from '../../../components/ui/icons';

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
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 selection:bg-[#191919]/10">
        <div className="w-full max-w-md bg-[#ffffff] border border-[#e8e6e1] rounded-3xl p-8 sm:p-10 text-center shadow-card flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-[#f4f3ef] flex items-center justify-center text-[#64635e]">
            <Icons.Search size={22} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#191919]">Document Not Found</h1>
          <p className="text-xs text-[#64635e] leading-relaxed">
            The document <span className="font-mono bg-[#f4f3ef] px-1.5 py-0.5 rounded text-[#191919]">{projectId}</span> does not exist or has been deleted.
          </p>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-[#191919] text-[#ffffff] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-xs inline-flex items-center gap-1.5 mt-2"
          >
            <Icons.ArrowLeft size={12} />
            <span>Back to Workspace</span>
          </Link>
        </div>
      </div>
    );
  }

  // 3. Check authorization role
  const role = getProjectRole(projectId, user.id);
  if (!role) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 selection:bg-[#191919]/10">
        <div className="w-full max-w-md bg-[#ffffff] border border-[#e8e6e1] rounded-3xl p-8 sm:p-10 text-center shadow-card flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center">
            <Icons.Shield size={22} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#191919]">Access Denied</h1>
          <p className="text-xs text-[#64635e] leading-relaxed">
            You do not have permission to access <span className="font-semibold text-[#191919]">&quot;{project.name}&quot;</span>. Contact the project owner to request collaborator access.
          </p>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-[#191919] text-[#ffffff] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-xs inline-flex items-center gap-1.5 mt-2"
          >
            <Icons.ArrowLeft size={12} />
            <span>Back to Workspace</span>
          </Link>
        </div>
      </div>
    );
  }

  // 4. Render ProjectEditor with persisted snapshot & role
  return <ProjectEditor project={project} user={user} role={role} />;
}
