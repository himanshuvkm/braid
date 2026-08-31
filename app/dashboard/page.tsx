import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import { listProjectsForUser } from '../../lib/db';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?from=/dashboard');
  }

  const initialProjects = listProjectsForUser(user.id);

  return <DashboardClient user={user} initialProjects={initialProjects} />;
}
