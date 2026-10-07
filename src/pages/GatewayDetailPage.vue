<template>
  <main class="page-shell">
    <h1>{{ t('gateway.detailTitle') }}</h1>
    <RefreshNotice :message="refreshError" />
    <div v-if="loading" class="state-box">{{ t('gateway.loadingDetail') }}</div>
    <div v-else-if="error" class="state-box">{{ error }}</div>
    <div v-else-if="gateway" class="detail-grid">
      <section class="detail-panel">
        <h2>{{ t('gateway.summary') }}</h2>
        <dl>
          <dt>{{ t('gateway.fields.name') }}</dt>
          <dd>{{ gateway.name }}</dd>
          <dt>{{ t('gateway.fields.gatewayId') }}</dt>
          <dd>{{ gateway.gatewayId }}</dd>
          <dt>{{ t('gateway.fields.status') }}</dt>
          <dd><StatusPill :status="gateway.status" /></dd>
          <dt>{{ t('gateway.fields.enabled') }}</dt>
          <dd>
            <button type="button" class="inline-button" :disabled="savingGateway" @click="toggleGateway">
              {{ gateway.enabled ? t('common.enabled') : t('common.disabled') }}
            </button>
          </dd>
          <dt>{{ t('gateway.fields.lastSeen') }}</dt>
          <dd>{{ formatTime(gateway.lastSeenAt) }}</dd>
          <dt>{{ t('gateway.fields.kura') }}</dt>
          <dd>{{ gateway.kuraVersion ?? '-' }}</dd>
          <dt>{{ t('gateway.fields.os') }}</dt>
          <dd>{{ gateway.osVersion ?? '-' }}</dd>
          <dt>{{ t('gateway.fields.ip') }}</dt>
          <dd>{{ gateway.ipAddrs.join(', ') || '-' }}</dd>
          <dt>{{ t('gateway.fields.mac') }}</dt>
          <dd>{{ gateway.macAddrs.join(', ') || '-' }}</dd>
          <dt>{{ t('gateway.fields.tags') }}</dt>
          <dd>{{ gateway.tags.join(', ') || '-' }}</dd>
          <dt>{{ t('gateway.fields.firewall') }}</dt>
          <dd>
            {{ translateStatus(gateway.firewallStatus.running ? 'running' : (gateway.firewallStatus.serviceState || (gateway.firewallStatus.enabled ? 'enabled' : 'disabled'))) }}
            <strong :class="gateway.firewallStatus.healthy ? 'health-ok' : 'health-bad'">
              {{ gateway.firewallStatus.healthy ? t('status.normal') : t('status.abnormal') }}
            </strong>
            <span v-if="gateway.firewallStatus.serviceState">
              ({{ t('firewall.systemdState') }}: {{ translateStatus(gateway.firewallStatus.systemdState || 'unknown') }})
            </span>
          </dd>
        </dl>
      </section>

      <section class="detail-panel">
        <h2>{{ t('gateway.credentials') }}</h2>
        <div v-if="credentialError" class="state-box">{{ credentialError }}</div>
        <dl v-else-if="credential">
          <dt>{{ t('gateway.fields.username') }}</dt>
          <dd>{{ credential.gatewayId }}</dd>
          <dt>{{ t('gateway.fields.enabled') }}</dt>
          <dd>{{ credential.enabled ? t('common.yes') : t('common.no') }}</dd>
          <dt>{{ t('gateway.fields.createdAt') }}</dt>
          <dd>{{ formatTime(credential.createdAt) }}</dd>
          <dt>{{ t('gateway.fields.rotatedAt') }}</dt>
          <dd>{{ formatTime(credential.rotatedAt) }}</dd>
          <dt>{{ t('gateway.fields.lastUsedAt') }}</dt>
          <dd>{{ formatTime(credential.lastUsedAt) }}</dd>
        </dl>
        <div class="action-grid">
          <button type="button" :disabled="credentialRunning" @click="rotateCredential">
            {{ t('gateway.rotateCredential') }}
          </button>
          <button v-if="credential" type="button" :disabled="credentialRunning" @click="toggleCredential">
            {{ credential.enabled ? t('gateway.disableCredential') : t('gateway.enableCredential') }}
          </button>
        </div>
        <div v-if="credentialSecret" class="secret-box">
          <dl>
            <dt>{{ t('gateway.fields.username') }}</dt>
            <dd>{{ credentialSecret.username }}</dd>
            <dt>{{ t('gateway.fields.secret') }}</dt>
            <dd><code>{{ credentialSecret.secret }}</code></dd>
          </dl>
          <p>{{ t('gateway.secretHint') }}</p>
        </div>
      </section>

      <section class="detail-panel">
        <h2>{{ t('gateway.resources') }}</h2>
        <dl>
          <dt>{{ t('gateway.fields.cpu') }}</dt>
          <dd>{{ gateway.resources.cpu }}%</dd>
          <dt>{{ t('gateway.fields.memory') }}</dt>
          <dd>{{ gateway.resources.mem }}%</dd>
          <dt>{{ t('gateway.fields.disk') }}</dt>
          <dd>{{ gateway.resources.disk }}%</dd>
          <dt>{{ t('gateway.fields.uptime') }}</dt>
          <dd>{{ gateway.resources.uptimeSec }}s</dd>
        </dl>
      </section>

      <section class="detail-panel">
        <h2>{{ t('gateway.services') }}</h2>
        <ul class="service-list">
          <li v-for="(value, key) in gateway.services" :key="key">
            <span>{{ key }}</span>
            <strong>{{ translateStatus(value) }}</strong>
          </li>
        </ul>
      </section>

      <section class="detail-panel">
        <h2>{{ t('gateway.actions') }}</h2>
        <div class="action-grid">
          <button type="button" :disabled="commandRunning" @click="runGatewayCommand('system.info')">
            {{ t('command.types.systemInfo') }}
          </button>
          <button type="button" :disabled="commandRunning" @click="readFirewallRules">
            {{ t('command.types.firewallGet') }}
          </button>
          <button type="button" :disabled="commandRunning" @click="readNetworkStatus">
            {{ t('command.types.networkGet') }}
          </button>
        </div>
        <p v-if="commandMessage" class="action-message">{{ commandMessage }}</p>
      </section>

      <section class="detail-panel firewall-panel">
        <div class="panel-heading">
          <h2>{{ t('gateway.firewall') }}</h2>
          <div v-if="firewallCommandId" class="panel-actions">
            <span v-if="firewallUpdatedAt">{{ t('gateway.firewallFromCommand', { time: formatTime(firewallUpdatedAt) }) }}</span>
            <RouterLink :to="`/commands/${firewallCommandId}`">
              {{ t('gateway.viewCommand') }}
            </RouterLink>
          </div>
        </div>
        <div v-if="gateway.firewallStatus" class="firewall-status-strip">
          <span>{{ t('firewall.ipv4') }}: <strong>{{ gateway.firewallStatus.ipv4RuleCount ?? 0 }}</strong></span>
          <span>{{ t('firewall.ipv6') }}: <strong>{{ gateway.firewallStatus.ipv6RuleCount ?? 0 }}</strong></span>
          <span>{{ t('firewall.health') }}: <strong>{{ gateway.firewallStatus.healthy ? t('status.normal') : t('status.abnormal') }}</strong></span>
          <span>{{ t('firewall.source') }}: <strong>{{ gateway.firewallStatus.source || '-' }}</strong></span>
          <span>{{ t('firewall.collectedAt') }}: <strong>{{ formatTime(gateway.firewallStatus.collectedAt) }}</strong></span>
        </div>
        <div v-if="firewallLoading" class="state-box">{{ t('gateway.loadingFirewall') }}</div>
        <div v-else-if="firewallError" class="state-box">{{ firewallError }}</div>
        <div v-else-if="firewallConfig">
          <FirewallRulesView :config="firewallConfig" />
        </div>
        <div v-else class="state-box">{{ t('gateway.noFirewallData') }}</div>
      </section>

      <section class="detail-panel network-panel">
        <div class="panel-heading">
          <h2>{{ t('gateway.network') }}</h2>
          <div v-if="networkCommandId" class="panel-actions">
            <span v-if="networkUpdatedAt">{{ t('gateway.networkFromCommand', { time: formatTime(networkUpdatedAt) }) }}</span>
            <RouterLink :to="`/commands/${networkCommandId}`">
              {{ t('gateway.viewCommand') }}
            </RouterLink>
          </div>
        </div>
        <div v-if="networkLoading" class="state-box">{{ t('gateway.loadingNetwork') }}</div>
        <div v-else-if="networkError" class="state-box">{{ networkError }}</div>
        <NetworkStatusView v-else-if="networkConfig" :config="networkConfig" />
        <div v-else class="state-box">{{ t('gateway.noNetworkData') }}</div>
      </section>

      <section class="detail-panel config-panel-section">
        <h2>{{ t('gateway.config') }}</h2>
        <ConfigPanel :gateway-id="gateway.gatewayId" />
      </section>

      <section class="detail-panel snapshot-panel-section">
        <h2>{{ t('gateway.snapshots') }}</h2>
        <SnapshotPanel :gateway-id="gateway.gatewayId" />
      </section>

      <section class="detail-panel heartbeat-panel">
        <h2>{{ t('gateway.heartbeats') }}</h2>
        <div v-if="heartbeats.length === 0" class="state-box">{{ t('gateway.noHeartbeats') }}</div>
        <div v-else>
          <dl>
            <dt>{{ t('gateway.fields.reportedAt') }}</dt>
            <dd>{{ formatTime(heartbeats[0].ts) }}</dd>
            <dt>{{ t('gateway.fields.status') }}</dt>
            <dd><StatusPill :status="heartbeats[0].online ? 'online' : 'offline'" /></dd>
            <dt>{{ t('gateway.fields.ip') }}</dt>
            <dd>{{ heartbeats[0].ipAddrs.join(', ') || '-' }}</dd>
            <dt>{{ t('gateway.fields.uptime') }}</dt>
            <dd>{{ heartbeats[0].uptimeSec ?? 0 }}s</dd>
          </dl>
          <pre>{{ formatJson(heartbeats[0].rawPayload) }}</pre>
        </div>
      </section>

      <section class="detail-panel commands-panel">
        <h2>{{ t('gateway.commands') }}</h2>
        <div v-if="commands.length === 0" class="state-box">{{ t('gateway.noCommands') }}</div>
        <table v-else class="mini-table">
          <thead>
            <tr>
              <th>{{ t('command.fields.commandId') }}</th>
              <th>{{ t('command.fields.type') }}</th>
              <th>{{ t('command.fields.status') }}</th>
              <th>{{ t('command.fields.requested') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="command in commands" :key="command.commandId">
              <td><RouterLink :to="`/commands/${command.commandId}`">{{ command.commandId }}</RouterLink></td>
              <td>{{ command.type }}</td>
              <td>{{ t(`status.${command.status}`) }}</td>
              <td>{{ formatTime(command.requestedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import StatusPill from '@/components/StatusPill.vue'
import FirewallRulesView, { type FirewallConfigPayload } from '@/components/FirewallRulesView.vue'
import RefreshNotice from '@/components/RefreshNotice.vue'
import NetworkStatusView, { type NetworkConfigPayload } from '@/components/NetworkStatusView.vue'
import ConfigPanel from '@/components/ConfigPanel.vue'
import SnapshotPanel from '@/components/SnapshotPanel.vue'
import { createCommand, fetchCommand, fetchCommands, type CommandListItem } from '@/api/commands'
import {
  fetchGateway,
  fetchGatewayCredential,
  fetchGatewayHeartbeats,
  rotateGatewayCredential,
  setGatewayCredentialEnabled,
  setGatewayEnabled,
  type GatewayCredential,
  type GatewayCredentialSecret,
  type GatewayDetailItem,
  type GatewayHeartbeatItem,
} from '@/api/gateways'

const props = defineProps<{
  gatewayId?: string
}>()

const route = useRoute()
const { t, locale } = useI18n()
const gateway = ref<GatewayDetailItem | null>(null)
const heartbeats = ref<GatewayHeartbeatItem[]>([])
const credential = ref<GatewayCredential | null>(null)
const credentialSecret = ref<GatewayCredentialSecret | null>(null)
const commands = ref<CommandListItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const refreshError = ref<string | null>(null)
const credentialError = ref<string | null>(null)
const commandRunning = ref(false)
const commandMessage = ref<string | null>(null)
const firewallLoading = ref(false)
const firewallError = ref<string | null>(null)
const firewallConfig = ref<FirewallConfigPayload | null>(null)
const firewallCommandId = ref<string | null>(null)
const firewallUpdatedAt = ref<string | number | null>(null)
const networkLoading = ref(false)
const networkError = ref<string | null>(null)
const networkConfig = ref<NetworkConfigPayload | null>(null)
const networkCommandId = ref<string | null>(null)
const networkUpdatedAt = ref<string | number | null>(null)
const credentialRunning = ref(false)
const savingGateway = ref(false)
let refreshTimer: number | undefined
let loadedFirewallCommandId: string | null = null
let loadedNetworkCommandId: string | null = null

const resolvedGatewayId = computed(() => String(props.gatewayId ?? route.params.gatewayId ?? ''))

function formatTime(value?: string | number | null) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString(locale.value)
}

function translateStatus(value: string) {
  return t(`status.${value}`, value)
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

async function runGatewayCommand(type: 'system.info' | 'firewall.get' | 'network.get') {
  const gatewayId = resolvedGatewayId.value
  if (!gatewayId) {
    commandMessage.value = t('gateway.missingId')
    return
  }

  commandRunning.value = true
  commandMessage.value = null
  try {
    await createCommand({
      gatewayId,
      type,
      payload: {},
    })
    commandMessage.value = t('command.created')
    await loadGateway({ silent: true })
    window.setTimeout(() => {
      void loadGateway({ silent: true })
    }, 1000)
  } catch (err) {
    commandMessage.value = err instanceof Error ? err.message : t('command.createFailed')
  } finally {
    commandRunning.value = false
  }
}

async function readNetworkStatus() {
  const gatewayId = resolvedGatewayId.value
  if (!gatewayId) {
    networkError.value = t('gateway.missingId')
    return
  }

  commandRunning.value = true
  networkLoading.value = true
  networkError.value = null
  commandMessage.value = null
  try {
    const created = await createCommand({
      gatewayId,
      type: 'network.get',
      payload: {},
    })
    networkCommandId.value = created.commandId
    commandMessage.value = t('command.created')
    const detail = await waitForCommandReply(created.commandId)
    if (detail.status !== 'success') {
      throw new Error(detail.errorMessage || t('gateway.networkFailed'))
    }
    const payload = detail.replyPayload?.payload
    if (!isNetworkConfigPayload(payload)) {
      throw new Error(t('gateway.invalidNetworkReply'))
    }
    applyNetworkConfig(payload, detail.commandId, detail.finishedAt ?? detail.requestedAt)
    await loadGateway({ silent: true })
  } catch (err) {
    networkError.value = err instanceof Error ? err.message : t('gateway.networkFailed')
  } finally {
    commandRunning.value = false
    networkLoading.value = false
  }
}

async function readFirewallRules() {
  const gatewayId = resolvedGatewayId.value
  if (!gatewayId) {
    firewallError.value = t('gateway.missingId')
    return
  }

  commandRunning.value = true
  firewallLoading.value = true
  firewallError.value = null
  commandMessage.value = null
  try {
    const created = await createCommand({
      gatewayId,
      type: 'firewall.get',
      payload: {},
    })
    firewallCommandId.value = created.commandId
    commandMessage.value = t('command.created')
    const detail = await waitForCommandReply(created.commandId)
    if (detail.status !== 'success') {
      throw new Error(detail.errorMessage || t('gateway.firewallFailed'))
    }
    const payload = detail.replyPayload?.payload
    if (!isFirewallConfigPayload(payload)) {
      throw new Error(t('gateway.invalidFirewallReply'))
    }
    applyFirewallConfig(payload, detail.commandId, detail.finishedAt ?? detail.requestedAt)
    await loadGateway({ silent: true })
  } catch (err) {
    firewallError.value = err instanceof Error ? err.message : t('gateway.firewallFailed')
  } finally {
    commandRunning.value = false
    firewallLoading.value = false
  }
}

function applyFirewallConfig(payload: FirewallConfigPayload, commandId: string, updatedAt?: string | number | null) {
  firewallConfig.value = payload
  firewallCommandId.value = commandId
  firewallUpdatedAt.value = updatedAt ?? null
  loadedFirewallCommandId = commandId
}

function resetFirewallState() {
  firewallLoading.value = false
  firewallError.value = null
  firewallConfig.value = null
  firewallCommandId.value = null
  firewallUpdatedAt.value = null
  loadedFirewallCommandId = null
}

function applyNetworkConfig(payload: NetworkConfigPayload, commandId: string, updatedAt?: string | number | null) {
  networkConfig.value = payload
  networkCommandId.value = commandId
  networkUpdatedAt.value = updatedAt ?? null
  loadedNetworkCommandId = commandId
}

function resetNetworkState() {
  networkLoading.value = false
  networkError.value = null
  networkConfig.value = null
  networkCommandId.value = null
  networkUpdatedAt.value = null
  loadedNetworkCommandId = null
}

async function loadLatestFirewallFromCommands(commandItems: CommandListItem[]) {
  const latest = commandItems.find((command) => command.type === 'firewall.get' && command.status === 'success')
  if (!latest || latest.commandId === loadedFirewallCommandId) {
    return
  }

  const detail = await fetchCommand(latest.commandId)
  const payload = detail.replyPayload?.payload
  if (detail.status === 'success' && isFirewallConfigPayload(payload)) {
    applyFirewallConfig(payload, detail.commandId, detail.finishedAt ?? detail.requestedAt)
  }
}

async function loadLatestNetworkFromCommands(commandItems: CommandListItem[]) {
  const latest = commandItems.find((command) => command.type === 'network.get' && command.status === 'success')
  if (!latest || latest.commandId === loadedNetworkCommandId) {
    return
  }

  const detail = await fetchCommand(latest.commandId)
  const payload = detail.replyPayload?.payload
  if (detail.status === 'success' && isNetworkConfigPayload(payload)) {
    applyNetworkConfig(payload, detail.commandId, detail.finishedAt ?? detail.requestedAt)
  }
}

async function waitForCommandReply(commandId: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const detail = await fetchCommand(commandId)
    if (detail.status === 'success' || detail.status === 'failed' || detail.status === 'timeout') {
      return detail
    }
    await delay(500)
  }
  throw new Error(t('gateway.firewallTimeout'))
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function isFirewallConfigPayload(value: unknown): value is FirewallConfigPayload {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Partial<FirewallConfigPayload>
  return typeof candidate.enabled === 'boolean'
    && typeof candidate.packageInstalled === 'boolean'
    && Array.isArray(candidate.parsedRules)
}

function isNetworkConfigPayload(value: unknown): value is NetworkConfigPayload {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Partial<NetworkConfigPayload>
  return Array.isArray(candidate.interfaces)
    && Array.isArray(candidate.routes)
    && Array.isArray(candidate.dnsServers)
}

async function loadCredential() {
  const gatewayId = resolvedGatewayId.value
  if (!gatewayId) {
    return
  }
  credentialError.value = null
  try {
    credential.value = await fetchGatewayCredential(gatewayId)
  } catch (err) {
    credential.value = null
    credentialError.value = err instanceof Error ? err.message : t('gateway.noCredential')
  }
}

async function rotateCredential() {
  credentialRunning.value = true
  credentialError.value = null
  try {
    credentialSecret.value = await rotateGatewayCredential(resolvedGatewayId.value)
    credential.value = credentialSecret.value
  } catch (err) {
    credentialError.value = err instanceof Error ? err.message : t('gateway.credentialFailed')
  } finally {
    credentialRunning.value = false
  }
}

async function toggleCredential() {
  if (!credential.value) {
    return
  }
  credentialRunning.value = true
  credentialError.value = null
  try {
    credential.value = await setGatewayCredentialEnabled(resolvedGatewayId.value, !credential.value.enabled)
  } catch (err) {
    credentialError.value = err instanceof Error ? err.message : t('gateway.credentialFailed')
  } finally {
    credentialRunning.value = false
  }
}

async function toggleGateway() {
  if (!gateway.value) {
    return
  }
  savingGateway.value = true
  try {
    gateway.value = await setGatewayEnabled(gateway.value.gatewayId, !gateway.value.enabled)
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('gateway.failedDetail')
  } finally {
    savingGateway.value = false
  }
}

async function loadGateway(options: { silent?: boolean } = {}) {
  const gatewayId = resolvedGatewayId.value
  if (!gatewayId) {
    error.value = t('gateway.missingId')
    return
  }

  if (!options.silent) {
    loading.value = true
    error.value = null
  }
  try {
    const [gatewayResponse, heartbeatResponse, commandResponse] = await Promise.all([
      fetchGateway(gatewayId),
      fetchGatewayHeartbeats(gatewayId),
      fetchCommands({ gatewayId }),
    ])
    gateway.value = gatewayResponse
    heartbeats.value = heartbeatResponse.items
    commands.value = commandResponse.items
    refreshError.value = null
    await Promise.all([
      loadCredential(),
      loadLatestFirewallFromCommands(commandResponse.items),
      loadLatestNetworkFromCommands(commandResponse.items),
    ])
  } catch (err) {
    const message = err instanceof Error ? err.message : t('gateway.failedDetail')
    if (!options.silent || !gateway.value) {
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

onMounted(() => {
  void loadGateway()
  refreshTimer = window.setInterval(() => {
    void loadGateway({ silent: true })
  }, 15000)
})

onUnmounted(() => {
  if (refreshTimer !== undefined) {
    window.clearInterval(refreshTimer)
  }
})

watch(resolvedGatewayId, () => {
  resetFirewallState()
  resetNetworkState()
  void loadGateway()
})
</script>

<style scoped>
.detail-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  margin-top: 16px;
}

.detail-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 16px;
}

dl {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 8px 12px;
}

dt {
  color: #6b7280;
}

dd {
  margin: 0;
}

.service-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.service-list li {
  align-items: center;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.action-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.action-grid button {
  background: #111827;
  border: 1px solid #111827;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  font: inherit;
  min-height: 38px;
  padding: 8px 10px;
}

.action-grid button:disabled {
  cursor: default;
  opacity: 0.6;
}

.action-message {
  color: #374151;
  margin: 12px 0 0;
}

.inline-button {
  background: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font: inherit;
  min-height: 30px;
  padding: 4px 10px;
}

.secret-box {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-top: 12px;
  padding: 12px;
}

.secret-box code {
  overflow-wrap: anywhere;
}

.secret-box p {
  color: #6b7280;
  margin: 8px 0 0;
}

.panel-heading {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.panel-heading h2 {
  margin: 0;
}

.panel-heading a {
  color: #2563eb;
  text-decoration: none;
}

.panel-actions {
  align-items: center;
  color: #6b7280;
  display: flex;
  flex-wrap: wrap;
  font-size: 13px;
  gap: 10px;
  justify-content: flex-end;
}

.firewall-status-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 12px 0;
}

.firewall-status-strip span {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px 10px;
}

.health-ok {
  color: #047857;
  margin-left: 6px;
}

.health-bad {
  color: #b91c1c;
  margin-left: 6px;
}

.heartbeat-panel,
.firewall-panel,
.network-panel,
.commands-panel {
  grid-column: 1 / -1;
}

.mini-table {
  border-collapse: collapse;
  width: 100%;
}

.mini-table th,
.mini-table td {
  border-bottom: 1px solid #e5e7eb;
  padding: 10px 8px;
  text-align: left;
}

.mini-table th {
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

pre {
  background: #0f172a;
  border-radius: 6px;
  color: #e5e7eb;
  margin: 16px 0 0;
  max-height: 320px;
  overflow: auto;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
