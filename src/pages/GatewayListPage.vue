<template>
  <main class="page-shell">
    <h1>{{ t('gateway.listTitle') }}</h1>
    <RefreshNotice :message="refreshError" />
    <div class="summary-grid">
      <button type="button" @click="setStatusFilter('')">
        <span>{{ t('gateway.summaryFields.total') }}</span>
        <strong>{{ summary.total }}</strong>
      </button>
      <button type="button" @click="setStatusFilter('online')">
        <span>{{ t('status.online') }}</span>
        <strong>{{ summary.online }}</strong>
      </button>
      <button type="button" @click="setStatusFilter('offline')">
        <span>{{ t('status.offline') }}</span>
        <strong>{{ summary.offline }}</strong>
      </button>
      <button type="button" @click="setStatusFilter('unknown')">
        <span>{{ t('status.unknown') }}</span>
        <strong>{{ summary.unknown }}</strong>
      </button>
    </div>
    <div class="filter-bar">
      <label>
        <span>{{ t('gateway.fields.status') }}</span>
        <select v-model="statusFilter" @change="loadGateways()">
          <option value="">{{ t('gateway.filters.allStatuses') }}</option>
          <option value="online">{{ t('status.online') }}</option>
          <option value="offline">{{ t('status.offline') }}</option>
          <option value="unknown">{{ t('status.unknown') }}</option>
        </select>
      </label>
    </div>
    <form class="create-form" @submit.prevent="submitGateway">
      <label>
        <span>{{ t('gateway.fields.gatewayId') }}</span>
        <input v-model="newGateway.gatewayId" required />
      </label>
      <label>
        <span>{{ t('gateway.fields.name') }}</span>
        <input v-model="newGateway.name" />
      </label>
      <button type="submit" :disabled="creatingGateway">{{ t('gateway.create') }}</button>
    </form>
    <p v-if="createMessage" class="form-message">{{ createMessage }}</p>
    <div v-if="loading" class="state-box">{{ t('gateway.loadingList') }}</div>
    <div v-else-if="error" class="state-box">{{ error }}</div>
    <div v-else>
      <table class="data-table">
        <thead>
          <tr>
            <th>{{ t('gateway.fields.name') }}</th>
            <th>{{ t('gateway.fields.gatewayId') }}</th>
            <th>{{ t('gateway.fields.status') }}</th>
            <th>{{ t('gateway.fields.enabled') }}</th>
            <th>{{ t('gateway.fields.lastSeen') }}</th>
            <th>{{ t('gateway.fields.kura') }}</th>
            <th>{{ t('gateway.fields.os') }}</th>
            <th>{{ t('gateway.fields.ip') }}</th>
            <th>{{ t('gateway.fields.config') }}</th>
            <th>{{ t('gateway.fields.alerts') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in gateways" :key="item.gatewayId">
            <td><RouterLink :to="`/gateways/${item.gatewayId}`">{{ item.name }}</RouterLink></td>
            <td>{{ item.gatewayId }}</td>
            <td><StatusPill :status="item.status" /></td>
            <td>{{ item.enabled ? t('common.yes') : t('common.no') }}</td>
            <td>{{ formatTime(item.lastSeenAt) }}</td>
            <td>{{ item.kuraVersion ?? '-' }}</td>
            <td>{{ item.osVersion ?? '-' }}</td>
            <td>{{ item.ipAddrs.join(', ') || '-' }}</td>
            <td>{{ item.configRevision ?? '-' }}</td>
            <td>{{ item.alertCount }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import StatusPill from '@/components/StatusPill.vue'
import RefreshNotice from '@/components/RefreshNotice.vue'
import {
  createGateway,
  fetchGateways,
  fetchGatewaySummary,
  type GatewayListItem,
  type GatewaySummary,
} from '@/api/gateways'
import type { GatewayStatus } from '@/types/common'

const { t, locale } = useI18n()
const gateways = ref<GatewayListItem[]>([])
const summary = ref<GatewaySummary>({
  total: 0,
  online: 0,
  offline: 0,
  unknown: 0,
})
const loading = ref(false)
const error = ref<string | null>(null)
const refreshError = ref<string | null>(null)
const statusFilter = ref<GatewayStatus | ''>('')
const creatingGateway = ref(false)
const createMessage = ref<string | null>(null)
const newGateway = ref({
  gatewayId: '',
  name: '',
})
let refreshTimer: number | undefined

function formatTime(value?: string | number | null) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString(locale.value)
}

async function loadGateways(options: { silent?: boolean } = {}) {
  if (!options.silent) {
    loading.value = true
    error.value = null
  }
  try {
    const [response, summaryResponse] = await Promise.all([
      fetchGateways({ status: statusFilter.value }),
      fetchGatewaySummary(),
    ])
    gateways.value = response.items
    summary.value = summaryResponse
    refreshError.value = null
  } catch (err) {
    const message = err instanceof Error ? err.message : t('gateway.failedList')
    if (!options.silent || gateways.value.length === 0) {
      error.value = message
    } else {
      refreshError.value = message
    }
  } finally {
    if (!options.silent) {
      loading.value = false
    }
  }
}

function setStatusFilter(status: GatewayStatus | '') {
  statusFilter.value = status
  void loadGateways()
}

async function submitGateway() {
  creatingGateway.value = true
  createMessage.value = null
  try {
    await createGateway({
      gatewayId: newGateway.value.gatewayId,
      name: newGateway.value.name,
    })
    createMessage.value = t('gateway.created')
    newGateway.value = { gatewayId: '', name: '' }
    await loadGateways()
  } catch (err) {
    createMessage.value = err instanceof Error ? err.message : t('gateway.createFailed')
  } finally {
    creatingGateway.value = false
  }
}

onMounted(() => {
  void loadGateways()
  refreshTimer = window.setInterval(() => {
    void loadGateways({ silent: true })
  }, 15000)
})

onUnmounted(() => {
  if (refreshTimer !== undefined) {
    window.clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.data-table {
  border-collapse: collapse;
  margin-top: 16px;
  width: 100%;
}

.summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  margin-top: 16px;
}

.summary-grid button {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  display: grid;
  gap: 6px;
  padding: 14px;
  text-align: left;
}

.summary-grid span {
  color: #6b7280;
  font-size: 12px;
}

.summary-grid strong {
  color: #111827;
  font-size: 24px;
}

.filter-bar {
  align-items: end;
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.filter-bar label {
  display: grid;
  gap: 6px;
  min-width: 220px;
}

.filter-bar select {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font: inherit;
  min-height: 38px;
  padding: 8px 10px;
}

.create-form {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) auto;
  margin-top: 12px;
}

.create-form label {
  display: grid;
  gap: 6px;
}

.create-form input {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font: inherit;
  min-height: 38px;
  padding: 8px 10px;
}

.create-form button {
  background: #111827;
  border: 1px solid #111827;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  font: inherit;
  min-height: 38px;
  padding: 8px 14px;
}

.form-message {
  color: #374151;
}

.data-table th,
.data-table td {
  border-bottom: 1px solid #e5e7eb;
  padding: 10px 8px;
  text-align: left;
  vertical-align: middle;
}

.data-table th {
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.data-table a {
  color: #2563eb;
  text-decoration: none;
}
</style>
