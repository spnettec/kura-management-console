<template>
  <div class="config-panel">
    <div class="panel-heading">
      <button type="button" :disabled="busy" @click="loadConfigList">
        {{ t('config.loadList') }}
      </button>
    </div>

    <p v-if="message" class="action-message">{{ message }}</p>

    <table v-if="configs.length" class="data-table">
      <thead>
        <tr>
          <th>{{ t('config.pid') }}</th>
          <th>{{ t('config.factoryPid') }}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in configs" :key="item.pid" :class="{ selected: item.pid === selectedPid }">
          <td>{{ item.pid }}</td>
          <td>{{ item.factoryPid || '-' }}</td>
          <td>
            <button type="button" :disabled="busy" @click="loadConfig(item.pid)">
              {{ t('config.edit') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="editing" class="config-editor">
      <h3>{{ selectedPid }}</h3>
      <p v-if="!Object.keys(editValues).length" class="action-message">{{ t('config.noProperties') }}</p>
      <div v-for="(entry, name) in editValues" :key="name" class="config-field">
        <label>
          <span class="field-name">{{ name }} <em>({{ entry.type }})</em></span>
          <input
            v-if="isPasswordField(entry)"
            v-model="entry.text"
            type="password"
            :placeholder="t('config.passwordPlaceholder')"
            autocomplete="new-password"
          />
          <input v-else v-model="entry.text" type="text" />
        </label>
      </div>
      <div class="action-grid">
        <button type="button" :disabled="busy" @click="saveConfig">
          {{ t('config.save') }}
        </button>
        <button type="button" :disabled="busy" @click="closeEditor">
          {{ t('config.cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { createCommandAndWait } from '@/api/commands'

interface ConfigDescriptor {
  pid: string
  factoryPid: string | null
}

interface KuraProperty {
  type: string
  value: unknown
}

interface EditableField {
  type: string
  isPassword: boolean
  text: string
  isPlaceholder: boolean
}

const PASSWORD_PLACEHOLDER = 'placeholder'
const PASSWORD_TYPES = new Set(['PASSWORD', 'com.fasterxml.jackson.databind.node.TextNode'])

const props = defineProps<{ gatewayId: string }>()
const { t } = useI18n()

const busy = ref(false)
const message = ref('')
const configs = ref<ConfigDescriptor[]>([])
const selectedPid = ref('')
const editing = ref(false)
const editValues = ref<Record<string, EditableField>>({})

function toText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return JSON.stringify(value)
  return String(value)
}

function isPasswordField(entry: EditableField): boolean {
  return entry.isPassword
}

async function run(type: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const detail = await createCommandAndWait({ gatewayId: props.gatewayId, type, payload })
  if (detail.status === 'success') {
    return detail.replyPayload ?? {}
  }
  throw new Error(detail.errorMessage || t('config.commandFailed'))
}

async function loadConfigList() {
  busy.value = true
  message.value = ''
  editing.value = false
  try {
    const reply = await run('config.list', {})
    configs.value = ((reply.configs as ConfigDescriptor[]) ?? []).slice().sort((a, b) => a.pid.localeCompare(b.pid))
    message.value = t('config.listLoaded', { count: configs.value.length })
  } catch (e) {
    message.value = String((e as Error).message || e)
  } finally {
    busy.value = false
  }
}

async function loadConfig(pid: string) {
  busy.value = true
  message.value = ''
  try {
    const reply = await run('config.get', { pid })
    const configurations = (reply.configurations as Array<{ pid: string; properties?: Record<string, KuraProperty> }>) ?? []
    const configuration = configurations.find((c) => c.pid === pid) ?? configurations[0]
    const properties = configuration?.properties ?? {}
    const fields: Record<string, EditableField> = {}
    for (const [name, property] of Object.entries(properties)) {
      const isPassword = String(property.type ?? '').toUpperCase() === 'PASSWORD'
      const raw = property.value
      const isPlaceholder = isPassword && raw === PASSWORD_PLACEHOLDER
      fields[name] = {
        type: String(property.type ?? '-'),
        isPassword,
        text: isPlaceholder ? '' : toText(raw),
        isPlaceholder,
      }
    }
    selectedPid.value = pid
    editValues.value = fields
    editing.value = true
  } catch (e) {
    message.value = String((e as Error).message || e)
  } finally {
    busy.value = false
  }
}

async function saveConfig() {
  busy.value = true
  message.value = ''
  try {
    const properties: Record<string, { type: string; value: unknown }> = {}
    for (const [name, entry] of Object.entries(editValues.value)) {
      if (entry.isPassword && entry.isPlaceholder && entry.text === '') {
        // untouched password placeholder: omit so Kura keeps the stored secret
        continue
      }
      let value: unknown = entry.text
      if (entry.text.startsWith('[') || entry.text.startsWith('{')) {
        try {
          value = JSON.parse(entry.text)
        } catch {
          // keep as plain string when it is not valid JSON
        }
      }
      properties[name] = { type: entry.type, value }
    }
    await run('config.put', {
      pid: selectedPid.value,
      configuration: { pid: selectedPid.value, properties },
    })
    message.value = t('config.saved')
    editing.value = false
  } catch (e) {
    message.value = String((e as Error).message || e)
  } finally {
    busy.value = false
  }
}

function closeEditor() {
  editing.value = false
}
</script>

<style scoped>
.config-panel {
  display: grid;
  gap: 12px;
}

.panel-heading {
  display: flex;
  justify-content: flex-end;
}

.selected {
  background: #f0f9ff;
}

.config-editor {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  display: grid;
  gap: 10px;
  padding: 14px;
}

.config-field label {
  display: grid;
  gap: 4px;
}

.field-name em {
  color: #6b7280;
  font-size: 12px;
  font-style: normal;
}

input {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font: inherit;
  font-family: monospace;
  padding: 6px 8px;
}
</style>
