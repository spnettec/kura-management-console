<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="brand">{{ t('app.brand') }}</div>
      <nav>
        <RouterLink to="/gateways">{{ t('nav.gateways') }}</RouterLink>
        <RouterLink to="/commands">{{ t('nav.commands') }}</RouterLink>
      </nav>
    </aside>
    <section class="workspace">
      <header class="topbar">
        <span>{{ t('app.tenant') }}</span>
        <div class="locale-switch" :aria-label="t('app.language')">
          <button
            v-for="item in supportedLocales"
            :key="item"
            type="button"
            :class="{ active: locale === item }"
            @click="setLocale(item)"
          >
            {{ item === 'zh-CN' ? '中文' : 'EN' }}
          </button>
        </div>
      </header>
      <RouterView />
    </section>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale, supportedLocales } from '@/i18n'

const { t, locale } = useI18n()
</script>
