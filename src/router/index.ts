import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import LoginPage from '@/pages/LoginPage.vue'
import GatewayListPage from '@/pages/GatewayListPage.vue'
import GatewayDetailPage from '@/pages/GatewayDetailPage.vue'
import CommandListPage from '@/pages/CommandListPage.vue'
import CommandDetailPage from '@/pages/CommandDetailPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/gateways' },
    { path: '/login', component: LoginPage },
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: 'gateways', component: GatewayListPage },
        { path: 'gateways/:gatewayId', component: GatewayDetailPage, props: true },
        { path: 'commands', component: CommandListPage },
        { path: 'commands/:commandId', component: CommandDetailPage, props: true },
      ],
    },
  ],
})

export default router
