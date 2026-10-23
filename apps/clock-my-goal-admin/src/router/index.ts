import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AdminLayout from '@/layouts/AdminLayout.vue'
import LoginView from '@/views/login/LoginView.vue'
import UserListView from '@/views/users/UserListView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true },
    },
    {
      path: '/',
      component: AdminLayout,
      children: [
        { path: '', redirect: '/users' },
        { path: 'users', name: 'users', component: UserListView },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/users' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (auth.token && to.path === '/login') {
      const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : ''
      return redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/users'
    }
    return true
  }
  if (!auth.token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
