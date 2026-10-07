<template>
  <section class="firewall-view">
    <h3>{{ t('firewall.title') }}</h3>
    <div class="firewall-summary">
      <span>{{ t('firewall.enabled') }}: <strong>{{ config.enabled ? t('common.yes') : t('common.no') }}</strong></span>
      <span>{{ t('firewall.running') }}: <strong>{{ config.running ? t('status.running') : t('status.inactive') }}</strong></span>
      <span>{{ t('firewall.health') }}: <strong>{{ config.healthy ? t('status.normal') : t('status.abnormal') }}</strong></span>
      <span>{{ t('firewall.packageInstalled') }}: <strong>{{ config.packageInstalled ? t('common.yes') : t('common.no') }}</strong></span>
      <span>{{ t('firewall.serviceState') }}: <strong>{{ translateState(config.serviceState) }}</strong></span>
      <span>{{ t('firewall.systemdState') }}: <strong>{{ translateState(config.systemdState) }}</strong></span>
      <span>{{ t('firewall.collectedAt') }}: <strong>{{ formatTimestamp(config.collectedAt) }}</strong></span>
      <span>{{ t('firewall.source') }}: <strong>{{ config.source || '-' }}</strong></span>
      <span>{{ t('firewall.ruleTotals') }}: <strong>{{ totalRuleCount }}</strong></span>
    </div>
    <div v-if="config.errorMessage" class="state-box">{{ config.errorMessage }}</div>
    <div v-if="config.healthMessage && !config.healthy" class="state-box">{{ config.healthMessage }}</div>

    <div class="firewall-controls">
      <div class="version-toggle" role="group" :aria-label="t('firewall.filters.ipVersion')">
        <button
          v-for="option in ipVersionOptions"
          :key="option.value"
          type="button"
          :class="{ active: ipVersionFilter === option.value }"
          @click="ipVersionFilter = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <label>
        <span>{{ t('firewall.filters.table') }}</span>
        <select v-model="tableFilter">
          <option value="">{{ t('firewall.filters.allTables') }}</option>
          <option v-for="tableName in tableOptions" :key="tableName" :value="tableName">{{ tableName }}</option>
        </select>
      </label>
      <label class="search-control">
        <span>{{ t('firewall.filters.search') }}</span>
        <input v-model.trim="searchText" type="search" :placeholder="t('firewall.filters.searchPlaceholder')" />
      </label>
    </div>

    <div v-if="visibleTableCount === 0" class="state-box">{{ t('firewall.noRules') }}</div>
    <div v-for="ruleSet in visibleRuleSets" :key="ruleSet.ipVersion" class="ruleset">
      <h4>{{ t(`firewall.${ruleSet.ipVersion}`, ruleSet.ipVersion) }}</h4>
      <div v-if="ruleSet.tables.length === 0" class="state-box">{{ t('firewall.noRules') }}</div>
      <section v-for="table in ruleSet.tables" :key="`${ruleSet.ipVersion}-${table.name}`" class="table-block">
        <div class="table-heading">
          <h5>{{ table.name }}</h5>
          <span>{{ t('firewall.ruleCount', { count: table.rules.length }) }}</span>
        </div>
        <table v-if="table.chains.length > 0" class="chains-table">
          <thead>
            <tr>
              <th>{{ t('firewall.fields.chain') }}</th>
              <th>{{ t('firewall.fields.policy') }}</th>
              <th>{{ t('firewall.fields.counters') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="chain in table.chains" :key="chain.name">
              <td><code>{{ chain.name }}</code></td>
              <td>{{ chain.policy || '-' }}</td>
              <td><code>{{ chain.counters || '-' }}</code></td>
            </tr>
          </tbody>
        </table>
        <table class="rules-table">
          <thead>
            <tr>
              <th>{{ t('firewall.fields.action') }}</th>
              <th>{{ t('firewall.fields.chain') }}</th>
              <th>{{ t('firewall.fields.expression') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(rule, index) in table.rules" :key="`${rule.action}-${rule.chain}-${index}`">
              <td>{{ rule.action }}</td>
              <td><code>{{ rule.chain }}</code></td>
              <td><code>{{ rule.expression || '-' }}</code></td>
            </tr>
            <tr v-if="table.rules.length === 0">
              <td colspan="3">{{ t('firewall.noRules') }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

export interface FirewallRule {
  action: string
  chain: string
  expression: string
}

export interface FirewallTable {
  name: string
  chains: Array<{ name: string; policy: string; counters: string }>
  rules: FirewallRule[]
}

export interface FirewallRuleSet {
  ipVersion: string
  tables: FirewallTable[]
}

export interface FirewallConfigPayload {
  enabled: boolean
  running?: boolean
  healthy?: boolean
  packageInstalled: boolean
  serviceState: string
  systemdState?: string | null
  healthMessage?: string | null
  collectedAt?: string | number | null
  source?: string | null
  errorMessage?: string | null
  ipv4Rules: string
  ipv6Rules: string
  parsedRules: FirewallRuleSet[]
  rules: unknown[]
}

const props = defineProps<{
  config: FirewallConfigPayload
}>()

const { t } = useI18n()
const ipVersionFilter = ref('')
const tableFilter = ref('')
const searchText = ref('')

const ipVersionOptions = computed(() => [
  { value: '', label: t('firewall.filters.allIpVersions') },
  { value: 'ipv4', label: t('firewall.ipv4') },
  { value: 'ipv6', label: t('firewall.ipv6') },
])

const tableOptions = computed(() => {
  const names = new Set<string>()
  props.config.parsedRules.forEach((ruleSet) => {
    ruleSet.tables.forEach((table) => names.add(table.name))
  })
  return Array.from(names).sort()
})

const totalRuleCount = computed(() => props.config.parsedRules.reduce((sum, ruleSet) => {
  return sum + ruleSet.tables.reduce((tableSum, table) => tableSum + table.rules.length, 0)
}, 0))

const visibleRuleSets = computed<FirewallRuleSet[]>(() => {
  const normalizedSearch = searchText.value.toLowerCase()
  return props.config.parsedRules
    .filter((ruleSet) => !ipVersionFilter.value || ruleSet.ipVersion === ipVersionFilter.value)
    .map((ruleSet) => ({
      ...ruleSet,
      tables: ruleSet.tables
        .filter((table) => !tableFilter.value || table.name === tableFilter.value)
        .map((table) => {
          if (!normalizedSearch) {
            return table
          }
          const tableMatches = includesSearch(table.name, normalizedSearch)
          const chainMatches = table.chains.some((chain) => includesSearch(chain.name, normalizedSearch)
            || includesSearch(chain.policy, normalizedSearch)
            || includesSearch(chain.counters, normalizedSearch))
          const rules = table.rules.filter((rule) => includesSearch(rule.action, normalizedSearch)
            || includesSearch(rule.chain, normalizedSearch)
            || includesSearch(rule.expression, normalizedSearch))
          return {
            ...table,
            rules: tableMatches || chainMatches ? table.rules : rules,
          }
        })
        .filter((table) => {
          if (!normalizedSearch) {
            return true
          }
          return includesSearch(table.name, normalizedSearch)
            || table.chains.some((chain) => includesSearch(chain.name, normalizedSearch)
              || includesSearch(chain.policy, normalizedSearch)
              || includesSearch(chain.counters, normalizedSearch))
            || table.rules.length > 0
        }),
    }))
    .filter((ruleSet) => ruleSet.tables.length > 0)
})

const visibleTableCount = computed(() => visibleRuleSets.value.reduce((sum, ruleSet) => sum + ruleSet.tables.length, 0))

function includesSearch(value: string | undefined, query: string) {
  return String(value ?? '').toLowerCase().includes(query)
}

function formatTimestamp(value?: string | number | null) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString()
}

function translateState(value?: string | null) {
  if (!value) {
    return '-'
  }
  return t(`status.${value}`, value)
}
</script>

<style scoped>
.firewall-view {
  border-top: 1px solid #e5e7eb;
  margin-top: 16px;
  padding-top: 16px;
}

.firewall-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.firewall-summary span {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px 10px;
}

.firewall-controls {
  align-items: end;
  display: grid;
  gap: 10px;
  grid-template-columns: auto minmax(140px, 180px) minmax(220px, 1fr);
  margin-bottom: 14px;
}

.firewall-controls label {
  color: #6b7280;
  display: grid;
  font-size: 12px;
  gap: 4px;
}

.firewall-controls input,
.firewall-controls select {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font: inherit;
  min-height: 34px;
  padding: 6px 8px;
}

.version-toggle {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  display: inline-flex;
  min-height: 34px;
  overflow: hidden;
}

.version-toggle button {
  background: #fff;
  border: 0;
  border-right: 1px solid #d1d5db;
  color: #374151;
  cursor: pointer;
  font: inherit;
  padding: 6px 10px;
}

.version-toggle button:last-child {
  border-right: 0;
}

.version-toggle button.active {
  background: #111827;
  color: #fff;
}

.ruleset {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.table-block {
  overflow: auto;
}

.table-heading {
  align-items: baseline;
  display: flex;
  gap: 10px;
  justify-content: space-between;
}

.table-heading h5 {
  margin: 0 0 8px;
}

.table-heading span {
  color: #6b7280;
  font-size: 12px;
}

.chains-table,
.rules-table {
  border-collapse: collapse;
  margin-bottom: 12px;
  width: 100%;
}

.chains-table th,
.chains-table td,
.rules-table th,
.rules-table td {
  border-bottom: 1px solid #e5e7eb;
  padding: 8px;
  text-align: left;
  vertical-align: top;
}

.chains-table th,
.rules-table th {
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

code {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

@media (max-width: 760px) {
  .firewall-controls {
    grid-template-columns: 1fr;
  }

  .version-toggle {
    width: 100%;
  }

  .version-toggle button {
    flex: 1;
  }
}
</style>
