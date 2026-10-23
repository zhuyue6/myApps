<template>
  <div class="login-page">
    <div class="card">
      <h1>目标打卡</h1>
      <p>管理后台</p>
      <el-alert
        v-if="formError"
        class="alert"
        :title="formError"
        type="error"
        show-icon
        :closable="false"
      />
      <el-form label-position="top" @submit.prevent="onSubmit">
        <el-form-item label="用户名" :error="errors.userName">
          <el-input v-model="form.userName" placeholder="请输入用户名" maxlength="10" />
        </el-form-item>
        <el-form-item label="密码" :error="errors.password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入密码"
            maxlength="20"
            @keyup.enter="onSubmit"
          />
        </el-form-item>
        <el-button class="submit" type="primary" :loading="submitting" @click="onSubmit">登录</el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const form = reactive({ userName: '', password: '' })
const errors = reactive({ userName: '', password: '' })
const formError = ref('')
const submitting = ref(false)

function onSubmit() {
  errors.userName = form.userName.trim() ? '' : '请填写用户名'
  errors.password = form.password ? '' : '请填写密码'
  formError.value = ''
  if (errors.userName || errors.password || submitting.value) return
  submitting.value = true
  auth.login(form.userName.trim(), form.password).then(() => {
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    router.replace(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/users')
  }).catch((error: Error) => {
    formError.value = error.message || '登录失败'
  }).finally(() => {
    submitting.value = false
  })
}
</script>

<style scoped>
.login-page {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cmg-bg);
}

.card {
  width: 420px;
  padding: 36px 32px 32px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(28, 40, 52, 0.06);
}

h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: var(--cmg-text);
}

p {
  margin: 8px 0 24px;
  color: var(--cmg-muted);
}

.alert {
  margin-bottom: 16px;
}

.alert :deep(.el-alert__title) {
  line-height: 1.5;
  white-space: normal;
  word-break: break-word;
}

.submit {
  width: 100%;
  height: 40px;
  margin-top: 8px;
}
</style>
