<template>
  <section class="network-view">
    <h3>{{ t('network.title') }}</h3>
    <div class="network-summary">
      <span>{{ t('network.hostname') }}: <strong>{{ config.hostname || '-' }}</strong></span>
      <span>{{ t('network.collectedAt') }}: <strong>{{ formatTimestamp(config.collectedAt) }}</strong></span>
      <span>{{ t('network.interfaces') }}: <strong>{{ config.interfaces.length }}</strong></span>
      <span>{{ t('network.routes') }}: <strong>{{ config.routes.length }}</strong></span>
      <span>{{ t('network.dns') }}: <strong>{{ config.dnsServers.join(', ') || '-' }}</strong></span>
    </div>
    <div v-if="config.errorMessage" class="state-box">{{ config.errorMessage }}</div>

    <div class="network-grid">
      <section>
        <h4>{{ t('network.interfaces') }}</h4>
        <table class="network-table">
          <thead>
            <tr>
              <th>{{ t('network.fields.name') }}</th>
              <th>{{ t('network.fields.state') }}</th>
              <th>{{ t('network.fields.mac') }}</th>
              <th>{{ t('network.fields.mtu') }}</th>
              <th>{{ t('network.fields.addresses') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in config.interfaces" :key="item.name">
              <td><code>{{ item.name }}</code></td>
              <td>{{ item.up ? t('status.up') : t('status.down') }}</td>
              <td><code>{{ item.macAddress || '-' }}</code></td>
              <td>{{ item.mtu || '-' }}</td>
              <td>
                <div v-if="item.addresses.length > 0" class="address-list">
                  <code v-for="address in item.addresses" :key="`${item.name}-${address.address}`">
                    {{ address.address }} <span>{{ address.family }}</span>
                  </code>
                </div>
                <span v-else>-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h4>{{ t('network.routes') }}</h4>
        <table class="network-table">
          <thead>
            <tr>
              <th>{{ t('network.fields.destination') }}</th>
              <th>{{ t('network.fields.gateway') }}</th>
              <th>{{ t('network.fields.device') }}</th>
              <th>{{ t('network.fields.source') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(route, index) in config.routes" :key="`${route.raw}-${index}`">
              <td><code>{{ route.destination || '-' }}</code></td>
              <td><code>{{ route.gateway || '-' }}</code></td>
              <td><code>{{ route.device || '-' }}</code></td>
              <td><code>{{ route.source || '-' }}</code></td>
            </tr>
            <tr v-if="config.routes.length === 0">
              <td colspan="4">{{ t('common.noData') }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

export interface NetworkAddressPayload {
  address: string
  family: string
  scope: string
}

export interface NetworkInterfacePayload {
  name: string
  displayName: string
  macAddress: string
  up: boolean
  loopback: boolean
  virtual: boolean
  pointToPoint: boolean
  mtu: number
  addresses: NetworkAddressPayload[]
}

export interface NetworkRoutePayload {
  destination: string
  gateway: string
  device: string
  protocol: string
  scope: string
  source: string
  raw: string
}

export interface NetworkConfigPayload {
  collectedAt?: string | number | null
  hostname: string
  interfaces: NetworkInterfacePayload[]
  routes: NetworkRoutePayload[]
  dnsServers: string[]
  source: string
  errorMessage: string
}

defineProps<{
  config: NetworkConfigPayload
}>()

const { t } = useI18n()

function formatTimestamp(value?: string | number | null) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString()
}
</script>

<style scoped>
.network-view {
  border-top: 1px solid #e5e7eb;
  margin-top: 16px;
  padding-top: 16px;
}

.network-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.network-summary span {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px 10px;
}

.network-grid {
  display: grid;
  gap: 16px;
}

.network-table {
  border-collapse: collapse;
  width: 100%;
}

.network-table th,
.network-table td {
  border-bottom: 1px solid #e5e7eb;
  padding: 8px;
  text-align: left;
  vertical-align: top;
}

.network-table th {
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.address-list {
  display: grid;
  gap: 4px;
}

code {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

code span {
  color: #6b7280;
}
</style>
