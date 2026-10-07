<template>
  <div v-if="message" class="refresh-notice" role="status">
    <WarningOutlined aria-hidden="true" />
    <span>{{ t('common.refreshFailed') }}</span>
    <strong>{{ message }}</strong>
  </div>
</template>

<script setup lang="ts">
import { WarningOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  message?: string | null
}>()

const { t } = useI18n()
</script>

<style scoped>
.refresh-notice {
  align-items: center;
  background: #fffbeb;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  color: #92400e;
  display: inline-flex;
  gap: 8px;
  margin-top: 12px;
  min-height: 34px;
  padding: 6px 10px;
}

.refresh-notice :deep(svg) {
  flex: 0 0 auto;
  height: 16px;
  width: 16px;
}

.refresh-notice strong {
  font-weight: 500;
}
</style>
