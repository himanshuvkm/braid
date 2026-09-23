import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage(props: PageProps) {
  const { id: projectId } = await props.params;
  redirect(`/${encodeURIComponent(projectId)}`);
}
