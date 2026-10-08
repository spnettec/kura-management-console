<template>
  <div class="config-panel">
    <div class="panel-heading">
      <a-button type="primary" size="small" :loading="busy" @click="loadConfigList">
        <template #icon><ReloadOutlined /></template>
        {{ t('config.loadList') }}
      </a-button>
    </div>

    <a-alert v-if="message" :message="message" type="info" show-icon closable style="margin-bottom: 12px" />

    <a-table
      v-if="configs.length"
      :data-source="configs"
      :columns="columns"
      :loading="busy"
      :pagination="{ pageSize: 10, hideOnSinglePage: true }"
      row-key="pid"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'pid'">
          <a-tag>{{ record.pid }}</a-tag>
        </template>
        <template v-else-if="column.key === 'factoryPid'">
          {{ record.factoryPid || '-' }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button size="small" type="link" :disabled="busy" @click="loadConfig(record.pid)">
            {{ t('config.edit') }}
          </a-button>
        </template>
      </template>
    </a-table>

    <a-card v-if="editing" size="small" class="config-editor" :title="selectedPid">
      <template #extra>
        <a-space>
          <a-button size="small" :disabled="busy" @click="closeEditor">{{ t('config.cancel') }}</a-button>
          <a-button size="small" type="primary" :loading="busy" @click="saveConfig">
            {{ t('config.save') }}
          </a-button>
        </a-space>
      </template>
      <a-empty v-if="!Object.keys(editValues).length" :description="t('config.noProperties')" />
      <div class="config-fields">
        <div v-for="(entry, name) in editValues" :key="name" class="config-field">
          <span class="field-name">{{ name }} <a-tag style="margin-left: 4px">{{ entry.type }}</a-tag></span>
          <a-input-password
            v-if="isPasswordField(entry)"
            v-model:value="entry.text"
            :placeholder="t('config.passwordPlaceholder')"
            autocomplete="new-password"
          />
          <a-input v-else v-model:value="entry.text" />
        </div>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ReloadOutlined } from '@ant-design/icons-vue'
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

const columns = computed(() => [
  { title: t('config.pid'), key: 'pid', ellipsis: true },
  { title: t('config.factoryPid'), key: 'factoryPid', ellipsis: true },
  { title: '', key: 'action', width: 80 },
])

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
    const configurations = (reply.configs as Array<{ pid: string; properties?: Record<string, KuraProperty> }>) ?? []
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

.config-editor {
  border-radius: 8px;
}

.config-fields {
  display: grid;
  gap: 12px;
}

.config-field {
  display: grid;
  gap: 6px;
}

.field-name {
  font-weight: 500;
}
</style>
