import React from 'react';
import { Editor } from '../../../components/editor/Editor';

interface DocPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ name?: string; user?: string }>;
}

export default async function DocPage({ params, searchParams }: DocPageProps) {
  const { id } = await params;
  const docId = decodeURIComponent(id);

  const sp = searchParams ? await searchParams : {};
  const roomName = sp.name ? decodeURIComponent(sp.name) : undefined;
  const userName = sp.user ? decodeURIComponent(sp.user) : undefined;

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-[#000000] p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl flex flex-col gap-4 flex-1">
        {/* Main Editor Component */}
        <main className="w-full flex-1 flex flex-col min-h-[560px]">
          <Editor
            documentId={docId}
            initialRoomName={roomName}
            initialUserName={userName}
          />
        </main>
      </div>
    </div>
  );
}
