import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true, title: 'ZOO-IN' },
  },
  {
    path: '/life-grid',
    name: 'life-grid',
    component: () => import('@/views/LifeGridView.vue'),
    meta: { requiresAuth: true, title: 'Life Grid 2027' },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { requiresAuth: true, title: '管理員後台' },
  },
  {
    path: '/admin/life-grid-2027',
    name: 'admin-life-grid-2027',
    component: () => import('@/views/AdminLifeGridView.vue'),
    meta: { requiresAuth: true, title: 'Life Grid 2027 設定' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
