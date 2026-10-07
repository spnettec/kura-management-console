<template>
  <section class="command-detail">
    <h2>{{ t('command.details') }} {{ command.commandId }}</h2>
    <div class="timeline">
      <h3>{{ t('command.events') }}</h3>
      <ol>
        <li v-for="event in command.events" :key="event.eventId">
          <span class="timeline-time">{{ formatTime(event.createdAt) }}</span>
          <strong>{{ t(`command.eventTypes.${event.eventType}`, event.eventType) }}</strong>
          <span>{{ event.message ?? '-' }}</span>
        </li>
      </ol>
    </div>
    <div class="json-grid">
      <div>
        <h3>{{ t('command.requestPayload') }}</h3>
        <pre>{{ formatJson(command.requestPayload) }}</pre>
      </div>
      <div>
        <h3>{{ t('command.replyPayload') }}</h3>
        <pre>{{ command.replyPayload ? formatJson(command.replyPayload) : t('command.noReply') }}</pre>
      </div>
    </div>
    <FirewallRulesView v-if="firewallConfig" :config="firewallConfig" />
    <NetworkStatusView v-if="networkConfig" :config="networkConfig" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CommandDetailItem } from '@/api/commands'
import FirewallRulesView, { type FirewallConfigPayload } from '@/components/FirewallRulesView.vue'
import NetworkStatusView, { type NetworkConfigPayload } from '@/components/NetworkStatusView.vue'

const props = defineProps<{
  command: CommandDetailItem
}>()

const { t, locale } = useI18n()

const firewallConfig = computed(() => {
  const payload = props.command.replyPayload?.payload
  if (isFirewallConfigPayload(payload)) {
    return payload
  }
  return null
})

const networkConfig = computed(() => {
  const payload = props.command.replyPayload?.payload
  if (isNetworkConfigPayload(payload)) {
    return payload
  }
  return null
})

function formatTime(value?: string | number | null) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString(locale.value)
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2)
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
</script>

<style scoped>
.command-detail {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-top: 16px;
  padding: 16px;
}

.json-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.timeline {
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
  padding-bottom: 16px;
}

.timeline ol {
  display: grid;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.timeline li {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 180px 90px 1fr;
}

.timeline-time {
  color: #6b7280;
  font-size: 12px;
}

pre {
  background: #111827;
  border-radius: 6px;
  color: #f9fafb;
  margin: 0;
  overflow: auto;
  padding: 12px;
}
</style>
