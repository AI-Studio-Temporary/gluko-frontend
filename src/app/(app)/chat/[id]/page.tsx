'use client'

import ChatView from '@/components/ChatView'

export default function ChatSessionPage({ params }: { params: { id: string } }) {
  return <ChatView sessionId={Number(params.id)} />
}
