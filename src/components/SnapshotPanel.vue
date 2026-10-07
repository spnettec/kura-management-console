<template>
  <div class="snapshot-panel">
    <div class="panel-heading">
      <button type="button" :disabled="busy" @click="writeSnapshot">
        {{ t('snapshot.write') }}
      </button>
      <button type="button" :disabled="busy" @click="refresh">
        {{ t('snapshot.refresh') }}
      </button>
    </div>

    <p v-if="message" class="action-message">{{ message }}</p>

    <table v-if="rows.length" class="data-table">
      <thead>
        <tr>
          <th>{{ t('snapshot.id') }}</th>
          <th>{{ t('snapshot.archivedAt') }}</th>
          <th>{{ t('snapshot.by') }}</th>
          <th>{{ t('snapshot.source') }}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td>{{ row.id }}</td>
          <td>{{ row.archivedAt ? formatTime(row.archivedAt) : t('snapshot.notArchived') }}</td>
          <td>{{ row.by || '-' }}</td>
          <td>
            <RouterLink v-if="row.sourceCommandId" :to="`/commands/${row.sourceCommandId}`">
              {{ row.sourceCommandId }}
            </RouterLink>
            <template v-else>-</template>
          </td>
          <td>
            <button type="button" :disabled="busy" @click="rollback(row.id)">
              {{ t('snapshot.rollback') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="!busy" class="action-message">{{ t('snapshot.empty') }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { createCommandAndWait } from '@/api/commands'
import { request } from '@/api/http'
import type { ListResponse } from '@/types/common'

interface ArchivedSnapshot {
  gatewaySnapshotId: number
  createdAt: string | number
  createdBy?: string | null
  sourceCommandId?: string | null
}

interface SnapshotRow {
  id: number
  archivedAt: string | number | null
  by: string | null
  sourceCommandId: string | null
}

const props = defineProps<{ gatewayId: string }>()
const { t, locale } = useI18n()

const busy = ref(false)
const message = ref('')
const rows = ref<SnapshotRow[]>([])

function formatTime(value: string | number | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString(locale.value)
}

async function run(type: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const detail = await createCommandAndWait({ gatewayId: props.gatewayId, type, payload })
  if (detail.status === 'success') {
    return detail.replyPayload ?? {}
  }
  throw new Error(detail.errorMessage || t('snapshot.commandFailed'))
}

async function refresh() {
  busy.value = true
  message.value = ''
  try {
    const [reply, archived] = await Promise.all([
      run('snapshot.list', {}),
      request<ListResponse<ArchivedSnapshot>>(`/api/gateways/${props.gatewayId}/snapshots`),
    ])
    const archiveById = new Map<number, ArchivedSnapshot>()
    for (const item of archived.items ?? []) {
      archiveById.set(item.gatewaySnapshotId, item)
    }
    const gatewayIds = ((reply.snapshots as number[]) ?? []).slice().sort((a, b) => b - a)
    for (const archivedItem of archived.items ?? []) {
      if (!gatewayIds.includes(archivedItem.gatewaySnapshotId)) {
        gatewayIds.push(archivedItem.gatewaySnapshotId)
      }
    }
    rows.value = gatewayIds.map((id) => {
      const match = archiveById.get(id)
      return {
        id,
        archivedAt: match?.createdAt ?? null,
        by: match?.createdBy ?? null,
        sourceCommandId: match?.sourceCommandId ?? null,
      }
    })
    message.value = t('snapshot.listLoaded', { count: rows.value.length })
  } catch (e) {
    message.value = String((e as Error).message || e)
  } finally {
    busy.value = false
  }
}

async function writeSnapshot() {
  busy.value = true
  message.value = ''
  try {
    const reply = await run('snapshot.take', {})
    const id = (reply as { snapshotId?: number }).snapshotId
    message.value = t('snapshot.written', { id: id ?? '?' })
    await refresh()
  } catch (e) {
    message.value = String((e as Error).message || e)
  } finally {
    busy.value = false
  }
}

async function rollback(snapshotId: number) {
  busy.value = true
  message.value = ''
  try {
    const reply = await run('snapshot.rollback', { snapshotId })
    const id = (reply as { snapshotId?: number }).snapshotId
    message.value = t('snapshot.rolledBack', { id: snapshotId, newId: id ?? '?' })
  } catch (e) {
    message.value = String((e as Error).message || e)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.snapshot-panel {
  display: grid;
  gap: 12px;
}

.panel-heading {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
