<template>
  <main class="page-shell">
    <h1>{{ t('command.title') }}</h1>
    <RefreshNotice :message="refreshError" />
    <form class="command-form" @submit.prevent="submitCommand">
      <label>
        <span>{{ t('command.fields.gatewayId') }}</span>
        <input v-model="form.gatewayId" type="text" />
      </label>
      <label>
        <span>{{ t('command.fields.type') }}</span>
        <select v-model="form.type">
          <option value="system.info">{{ t('command.types.systemInfo') }}</option>
          <option value="config.get">{{ t('command.types.configGet') }}</option>
          <option value="firewall.get">{{ t('command.types.firewallGet') }}</option>
          <option value="network.get">{{ t('command.types.networkGet') }}</option>
        </select>
      </label>
      <label v-if="form.type === 'config.get'">
        <span>{{ t('command.fields.pid') }}</span>
        <input v-model="form.pid" type="text" />
      </label>
      <button type="submit" :disabled="creating">{{ t('command.submit') }}</button>
    </form>
    <div v-if="createMessage" class="state-box command-message">{{ createMessage }}</div>
    <div class="filter-bar">
      <label>
        <span>{{ t('command.fields.gatewayId') }}</span>
        <input
          v-model="gatewayFilter"
          :placeholder="t('command.filters.anyGateway')"
          type="text"
          @keyup.enter="loadCommands()"
        />
      </label>
      <label>
        <span>{{ t('command.fields.status') }}</span>
        <select v-model="statusFilter" @change="loadCommands()">
          <option value="">{{ t('command.filters.allStatuses') }}</option>
          <option value="queued">{{ t('status.queued') }}</option>
          <option value="sent">{{ t('status.sent') }}</option>
          <option value="running">{{ t('status.running') }}</option>
          <option value="success">{{ t('status.success') }}</option>
          <option value="failed">{{ t('status.failed') }}</option>
          <option value="timeout">{{ t('status.timeout') }}</option>
          <option value="rejected">{{ t('status.rejected') }}</option>
        </select>
      </label>
      <button type="button" @click="loadCommands()">{{ t('command.filters.apply') }}</button>
    </div>
    <div v-if="loading" class="state-box">{{ t('command.loadingList') }}</div>
    <div v-else-if="error" class="state-box">{{ error }}</div>
    <div v-else>
      <table class="data-table">
        <thead>
          <tr>
            <th>{{ t('command.fields.commandId') }}</th>
            <th>{{ t('command.fields.gateway') }}</th>
            <th>{{ t('command.fields.type') }}</th>
            <th>{{ t('command.fields.status') }}</th>
            <th>{{ t('command.fields.initiator') }}</th>
            <th>{{ t('command.fields.requested') }}</th>
            <th>{{ t('command.fields.finished') }}</th>
            <th>{{ t('command.details') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in commands" :key="item.commandId">
            <td><RouterLink :to="`/commands/${item.commandId}`">{{ item.commandId }}</RouterLink></td>
            <td><RouterLink :to="`/gateways/${item.gatewayId}`">{{ item.gatewayId }}</RouterLink></td>
            <td>{{ item.type }}</td>
            <td>{{ t(`status.${item.status}`) }}</td>
            <td>{{ item.initiator ?? '-' }}</td>
            <td>{{ formatTime(item.requestedAt) }}</td>
            <td>{{ formatTime(item.finishedAt) }}</td>
            <td><button class="link-button" type="button" @click="loadCommandDetail(item.commandId)">{{ t('command.details') }}</button></td>
          </tr>
        </tbody>
      </table>
      <CommandDetailPanel v-if="selectedCommand" :command="selectedCommand" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import CommandDetailPanel from '@/components/CommandDetailPanel.vue'
import RefreshNotice from '@/components/RefreshNotice.vue'
import { createCommand, fetchCommand, fetchCommands, type CommandDetailItem, type CommandListItem } from '@/api/commands'
import type { CommandStatus } from '@/types/common'

const { t, locale } = useI18n()
const commands = ref<CommandListItem[]>([])
const selectedCommand = ref<CommandDetailItem | null>(null)
const loading = ref(false)
const creating = ref(false)
const error = ref<string | null>(null)
const refreshError = ref<string | null>(null)
const createMessage = ref<string | null>(null)
const gatewayFilter = ref('')
const statusFilter = ref<CommandStatus | ''>('')
let refreshTimer: number | undefined
const form = ref({
  gatewayId: 'gw-001',
  type: 'system.info',
  pid: 'org.eclipse.kura.net.admin.FirewallConfigurationService',
})

function formatTime(value?: string | number | null) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString(locale.value)
}

async function loadCommands(options: { silent?: boolean } = {}) {
  if (!options.silent) {
    loading.value = true
    error.value = null
  }
  try {
    const response = await fetchCommands({ gatewayId: gatewayFilter.value.trim(), status: statusFilter.value })
    commands.value = response.items
    refreshError.value = null
  } catch (err) {
    const message = err instanceof Error ? err.message : t('command.failedList')
    if (!options.silent || commands.value.length === 0) {
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

async function submitCommand() {
  creating.value = true
  createMessage.value = null
  try {
    const payload =
      form.value.type === 'config.get'
        ? { pid: form.value.pid }
        : {}
    await createCommand({
      gatewayId: form.value.gatewayId,
      type: form.value.type,
      payload,
    })
    createMessage.value = t('command.created')
    await loadCommands({ silent: true })
  } catch (err) {
    createMessage.value = err instanceof Error ? err.message : t('command.createFailed')
  } finally {
    creating.value = false
  }
}

async function loadCommandDetail(commandId: string) {
  selectedCommand.value = await fetchCommand(commandId)
}

onMounted(() => {
  void loadCommands()
  refreshTimer = window.setInterval(() => {
    void loadCommands({ silent: true })
    if (selectedCommand.value) {
      void loadCommandDetail(selectedCommand.value.commandId)
    }
  }, 5000)
})

onUnmounted(() => {
  if (refreshTimer !== undefined) {
    window.clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.command-form {
  align-items: end;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  margin-top: 16px;
  padding: 16px;
}

.command-form label {
  display: grid;
  gap: 6px;
}

.command-form input,
.command-form select,
.command-form button {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font: inherit;
  min-height: 38px;
  padding: 8px 10px;
}

.command-form button {
  background: #111827;
  color: #fff;
  cursor: pointer;
}

.command-form button:disabled {
  cursor: default;
  opacity: 0.6;
}

.command-message {
  margin-top: 12px;
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

.filter-bar input,
.filter-bar select,
.filter-bar button {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font: inherit;
  min-height: 38px;
  padding: 8px 10px;
}

.filter-bar button {
  background: #111827;
  color: #fff;
  cursor: pointer;
}

.data-table {
  border-collapse: collapse;
  margin-top: 16px;
  width: 100%;
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

.link-button {
  background: transparent;
  border: 0;
  color: #2563eb;
  cursor: pointer;
  font: inherit;
  padding: 0;
}

</style>
