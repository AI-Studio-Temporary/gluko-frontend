'use client'

import ChatView from '@/components/ChatView'
import { use } from 'react'

export default function ChatSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ChatView sessionId={Number(id)} />
}
