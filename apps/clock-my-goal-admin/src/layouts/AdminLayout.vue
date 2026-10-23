<template>
  <div class="shell">
    <aside class="sider">
      <div class="brand">目标打卡管理后台</div>
      <el-menu :default-active="route.path" router>
        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
      </el-menu>
    </aside>
    <div class="main">
      <header class="top">
        <div class="account">
          <el-avatar :size="32" :icon="UserFilled" />
          <span class="name">{{ auth.userName || '管理员' }}</span>
          <el-divider direction="vertical" />
          <el-button link :loading="leaving" @click="onLogout">退出</el-button>
        </div>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { User, UserFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const leaving = ref(false)

async function onLogout() {
  if (leaving.value) return
  leaving.value = true
  try {
    await auth.logout()
    router.replace('/login')
  } finally {
    leaving.value = false
  }
}
</script>

<style scoped>
.shell {
  display: flex;
  min-height: 100%;
  background: var(--cmg-bg);
}

.sider {
  width: 200px;
  flex: none;
  background: #fff;
  border-right: 1px solid #eef1f6;
}

.brand {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-size: 16px;
  font-weight: 600;
}

.sider :deep(.el-menu) {
  border-right: 0;
}

.sider :deep(.el-menu-item.is-active) {
  background: #e8f4fc;
  color: #5a8fc7;
}

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.top {
  height: 56px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 24px;
  border-bottom: 1px solid #eef1f6;
}

.title {
  font-size: 16px;
  font-weight: 600;
}

.account {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--cmg-text);
}

.name {
  font-size: 14px;
}

.content {
  padding: 16px;
}
</style>
