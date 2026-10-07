<template>
  <main class="page-shell login-shell">
    <section class="login-card">
      <h1>{{ t('auth.signIn') }}</h1>
      <form class="login-form" @submit.prevent>
        <label>
          <span>{{ t('auth.username') }}</span>
          <input v-model="username" type="text" autocomplete="username" />
        </label>
        <label>
          <span>{{ t('auth.password') }}</span>
          <input v-model="password" type="password" autocomplete="current-password" />
        </label>
        <button type="submit">{{ t('auth.submit') }}</button>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const username = ref('')
const password = ref('')
</script>

<style scoped>
.login-shell {
  align-items: center;
  display: grid;
  min-height: 100vh;
  place-items: center;
}

.login-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  min-width: 320px;
  padding: 24px;
}

.login-form {
  display: grid;
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
}

input,
button {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font: inherit;
  padding: 10px 12px;
}

button {
  background: #111827;
  color: #fff;
  cursor: pointer;
}
</style>
