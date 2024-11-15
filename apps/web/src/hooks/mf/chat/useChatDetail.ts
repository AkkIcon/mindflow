import { useCallback, useMemo } from 'react'
import { NEXT_PUBLIC_MF_API_URL } from '@/utils/env'
import { getData } from '../useResponse'

export type ChatType = 'rag' | 'report'
export type MessageRoleType = 'system' | 'user' | 'assistant'
export type ReportFileType = 'word' | 'pdf'

export type ReportFileData = {
  id: string
  name: string
  type: ReportFileType
}

export type ReportMessage = {
  id: number
  role: MessageRoleType
  content: string
}

export type ReportDetailData = {
  type: ChatType
  messages: ReportMessage[]
  documentId?: string
  file: ReportFileData
}

export type RagMessage = {
  id: number
  role: MessageRoleType
  content: string
}

export type RagDetailData = {
  type: ChatType
  messages: ReportMessage[]
}

export type ChatDetail = {
  code: number
  data: ReportFileData | RagDetailData
  msg: string
}

export const useChatDetail = () => {
  const getChatDetail = useCallback(async <T>(id: string, type?: ChatType): Promise<T> => {
    const res = await fetch(`${NEXT_PUBLIC_MF_API_URL()}/chat/detail`, {
      credentials: 'include',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: id,
      }),
    })
    // if (res.status > 299) {
    //   throw new Error(`Unexpected status ${res.status}`)
    // }

    return getData<T>(await res.json()) as T
  }, [])
  return useMemo(() => [{ getChatDetail }], [getChatDetail])
}