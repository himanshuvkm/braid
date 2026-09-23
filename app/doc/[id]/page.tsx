import { redirect } from 'next/navigation';

interface DocPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ name?: string; user?: string }>;
}

export default async function DocPage({ params, searchParams }: DocPageProps) {
  const { id } = await params;
  const docId = decodeURIComponent(id);
  const sp = searchParams ? await searchParams : {};
  const query = new URLSearchParams();
  if (sp.name) query.set('name', sp.name);
  if (sp.user) query.set('user', sp.user);
  const queryString = query.toString() ? `?${query.toString()}` : '';

  redirect(`/${encodeURIComponent(docId)}${queryString}`);
}
