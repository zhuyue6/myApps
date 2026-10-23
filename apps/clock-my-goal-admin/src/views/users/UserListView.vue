<template>
  <div class="page">
    <section class="panel filters">
      <span class="label">用户名</span>
      <el-input v-model="draft.keyword" clearable placeholder="请输入用户名" class="keyword" @keyup.enter="onSearch" />
      <span class="label">状态</span>
      <el-select v-model="draft.status" class="status">
        <el-option label="全部" value="all" />
        <el-option label="正常" :value="1" />
        <el-option label="停用" :value="0" />
      </el-select>
      <el-button type="primary" @click="onSearch">查询</el-button>
      <el-button @click="onReset">重置</el-button>
    </section>

    <section class="panel">
      <el-alert v-if="loadError" class="load-error" :title="loadError" type="error" show-icon :closable="false" />
      <el-table v-loading="loading" :data="list" empty-text="没有符合条件的用户">
        <el-table-column label="头像" width="72">
          <template #default="{ row }">
            <el-avatar :size="32" :src="avatarSrc(row.avatarUrl) || undefined" :icon="UserFilled" />
          </template>
        </el-table-column>
        <el-table-column prop="userName" label="用户名" min-width="120" />
        <el-table-column label="性别" width="80">
          <template #default="{ row }">{{ sexText(row.sex) }}</template>
        </el-table-column>
        <el-table-column label="年龄" width="80">
          <template #default="{ row }">{{ ageText(row.age) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" effect="light">
              {{ row.status === 1 ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" min-width="160">
          <template #default="{ row }">{{ timeText(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
            <el-button v-if="row.status === 1" link type="danger" @click="askStatus(row, 0)">停用</el-button>
            <el-button v-else link type="primary" @click="askStatus(row, 1)">启用</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="load"
          @size-change="onSizeChange"
        />
      </div>
    </section>

    <UserDetailDrawer ref="drawerRef" :user-id="detailId" @close="detailId = null" @change-status="askStatus" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UserFilled } from '@element-plus/icons-vue'
import { getUserList, updateUserStatus } from '@/api/user'
import type { MiniUser } from '@/types/user'
import { ageText, avatarSrc, sexText, timeText } from '@/utils/display'
import UserDetailDrawer from './UserDetailDrawer.vue'

const draft = reactive<{ keyword: string; status: 'all' | 0 | 1 }>({ keyword: '', status: 'all' })
const applied = reactive<{ keyword: string; status: 'all' | 0 | 1 }>({ keyword: '', status: 'all' })
const list = ref<MiniUser[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const loadError = ref('')
const detailId = ref<number | null>(null)
const drawerRef = ref<{ reload: () => void } | null>(null)
let requestSeq = 0

function load() {
  const seq = ++requestSeq
  loading.value = true
  loadError.value = ''
  const requestData: { keyword?: string; status?: 0 | 1; pageNum: number; pageSize: number } = {
    pageNum: page.value,
    pageSize: pageSize.value,
  }
  if (applied.keyword) requestData.keyword = applied.keyword
  if (applied.status === 0 || applied.status === 1) requestData.status = applied.status
  getUserList(requestData).then((data) => {
    if (seq !== requestSeq) return
    list.value = data.data || []
    total.value = data.total || 0
  }).catch((error: Error) => {
    if (seq !== requestSeq) return
    loadError.value = error.message || '加载失败'
  }).finally(() => {
    if (seq === requestSeq) loading.value = false
  })
}

function onSearch() {
  applied.keyword = draft.keyword.trim()
  applied.status = draft.status
  page.value = 1
  load()
}

function onReset() {
  draft.keyword = ''
  draft.status = 'all'
  applied.keyword = ''
  applied.status = 'all'
  page.value = 1
  load()
}

function onSizeChange() {
  page.value = 1
  load()
}

function openDetail(id: number) {
  detailId.value = id
}

async function askStatus(user: { id: number; userName: string }, status: 0 | 1) {
  const disabling = status === 0
  try {
    await ElMessageBox.confirm(
      disabling
        ? `「${user.userName}」停用后将无法登录小程序，已有计划和打卡记录会保留。`
        : `启用后「${user.userName}」可以重新登录小程序。`,
      disabling ? '停用这个用户？' : '启用这个用户？',
      {
        confirmButtonText: disabling ? '停用' : '启用',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: disabling ? 'el-button--danger' : '',
      },
    )
  } catch {
    return
  }
  try {
    await updateUserStatus(user.id, status)
    ElMessage.success(disabling ? '已停用' : '已启用')
    load()
    if (detailId.value === user.id) drawerRef.value?.reload()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败')
  }
}

onMounted(load)
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px 20px;
}

.filters {
  display: flex;
  align-items: center;
  gap: 12px;
}

.label {
  color: var(--cmg-text);
  font-size: 14px;
  white-space: nowrap;
}

.keyword {
  width: 220px;
}

.status {
  width: 140px;
}

.load-error {
  margin-bottom: 12px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
