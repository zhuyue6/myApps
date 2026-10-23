import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from './api/http'
import { useAuthStore } from './stores/auth'
import './styles/index.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

setUnauthorizedHandler(() => {
  useAuthStore().clear()
  const current = router.currentRoute.value
  if (current.path === '/login') return
  router.push({ path: '/login', query: { redirect: current.fullPath } })
})

app.mount('#app')
