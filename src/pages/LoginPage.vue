<template>
  <main class="page-shell login-shell">
    <section class="login-card">
      <h1>{{ t('auth.signIn') }}</h1>
      <form class="login-form" @submit.prevent="submit">
        <label>
          <span>{{ t('auth.username') }}</span>
          <input v-model="username" type="text" autocomplete="username" />
        </label>
        <label>
          <span>{{ t('auth.password') }}</span>
          <input v-model="password" type="password" autocomplete="current-password" />
        </label>
        <p v-if="error" class="login-error">{{ error }}</p>
        <button type="submit" :disabled="submitting">{{ t('auth.submit') }}</button>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/store/auth'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function submit() {
  if (!username.value || !password.value || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    await auth.login(username.value, password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/gateways'
    router.push(redirect)
  } catch (e) {
    error.value = t('auth.loginFailed')
    password.value = ''
  } finally {
    submitting.value = false
  }
}
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

button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.login-error {
  color: #b91c1c;
  font-size: 13px;
  margin: 0;
}
</style>
