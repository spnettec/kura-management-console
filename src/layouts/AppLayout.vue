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
        <span>{{ auth.tenantId }}</span>
        <div class="topbar-right">
          <span class="topbar-user">{{ auth.displayName || auth.username }}</span>
          <button type="button" class="logout-btn" @click="doLogout">{{ t('nav.logout') }}</button>
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
        </div>
      </header>
      <RouterView />
    </section>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale, supportedLocales } from '@/i18n'
import { useAuthStore } from '@/store/auth'

const { t, locale } = useI18n()
const router = useRouter()
const auth = useAuthStore()

async function doLogout() {
  await auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.topbar-right {
  align-items: center;
  display: flex;
  gap: 12px;
}

.topbar-user {
  font-weight: 600;
}

.logout-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: 4px 10px;
}

.logout-btn:hover {
  border-color: rgba(255, 255, 255, 0.8);
}
</style>
