<template>
  <span class="status-pill" :data-status="status">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { GatewayStatus } from '@/types/common'

const props = defineProps<{
  status: GatewayStatus
}>()

const { t } = useI18n()
const label = computed(() => t(`status.${props.status}`))
</script>
