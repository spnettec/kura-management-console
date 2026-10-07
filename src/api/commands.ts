import { request } from './http'
import type { CommandStatus, ListResponse } from '@/types/common'

export type ApiTimestamp = string | number

export interface CommandListItem {
  commandId: string
  gatewayId: string
  type: string
  status: CommandStatus
  initiator?: string | null
  requestedAt: ApiTimestamp
  finishedAt?: ApiTimestamp | null
  errorCode?: string | null
  errorMessage?: string | null
}

export interface CommandDetailItem extends CommandListItem {
  tenantId: string
  requestPayload: Record<string, unknown>
  replyPayload?: Record<string, unknown> | null
  correlationId?: string | null
  sentAt?: ApiTimestamp | null
  startedAt?: ApiTimestamp | null
  timeoutAt?: ApiTimestamp | null
  events: CommandEventItem[]
}

export interface CommandEventItem {
  eventId: number
  eventType: string
  status?: CommandStatus | null
  message?: string | null
  createdAt: ApiTimestamp
}

export function fetchCommands(params?: { gatewayId?: string; status?: CommandStatus | '' }) {
  const searchParams = new URLSearchParams()
  if (params?.gatewayId) {
    searchParams.set('gatewayId', params.gatewayId)
  }
  if (params?.status) {
    searchParams.set('status', params.status)
  }
  const query = searchParams.toString()
  return request<ListResponse<CommandListItem>>(`/api/commands${query ? `?${query}` : ''}`)
}

export function fetchCommand(commandId: string) {
  return request<CommandDetailItem>(`/api/commands/${commandId}`)
}

export function createCommand(payload: {
  gatewayId: string
  type: string
  payload: Record<string, unknown>
}) {
  return request<{ commandId: string; status: string }>('/api/commands', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
