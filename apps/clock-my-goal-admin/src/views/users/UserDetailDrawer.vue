<template>
  <el-drawer
    :model-value="visible"
    title="用户详情"
    size="480px"
    @close="emit('close')"
  >
    <div v-loading="loading">
      <template v-if="detail">
        <div class="section-title">账号</div>
        <div class="profile">
          <el-avatar :size="56" :src="avatarSrc(detail.avatarUrl) || undefined" :icon="UserFilled" />
          <div>
            <div class="user-name">{{ detail.userName }}</div>
            <div class="user-id">用户 ID {{ detail.id }}</div>
          </div>
        </div>
        <div class="facts">
          <div>
            <span>性别</span>
            <strong>{{ sexText(detail.sex) }}</strong>
          </div>
          <div>
            <span>状态</span>
            <el-tag class="status-tag":type="detail.status === 1 ? 'success' : 'info'" effect="light">
              {{ detail.status === 1 ? '正常' : '停用' }}
            </el-tag>
          </div>
          <div>
            <span>年龄</span>
            <strong>{{ ageText(detail.age) }}</strong>
          </div>
          <div>
            <span>注册时间</span>
            <strong>{{ timeText(detail.createTime) }}</strong>
          </div>
        </div>

        <div class="section-title">打卡概况</div>
        <div class="stats">
          <div>
            <strong class="ongoing">{{ detail.ongoing }}</strong>
            <span>进行中</span>
          </div>
          <div>
            <strong class="done">{{ detail.completed }}</strong>
            <span>已完成</span>
          </div>
          <div>
            <strong class="expired">{{ detail.expired }}</strong>
            <span>已过期</span>
          </div>
        </div>
        <div class="labels">标签 {{ detail.labelCount }} 个</div>

        <el-table v-if="detail.plans.length" :data="detail.plans" size="small">
          <el-table-column prop="name" label="计划名称" min-width="96" show-overflow-tooltip />
          <el-table-column label="周期" width="56">
            <template #default="{ row }">{{ cycleText(row.cycle) }}</template>
          </el-table-column>
          <el-table-column label="进度" width="72">
            <template #default="{ row }">{{ row.clockInCount }}/{{ row.targetClockInCount }}</template>
          </el-table-column>
          <el-table-column label="状态" width="84">
            <template #default="{ row }">
              <el-tag :type="planStatusType(row.status)" effect="light">{{ planStatusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="截止时间" min-width="128">
            <template #default="{ row }">{{ timeText(row.expireTime) }}</template>
          </el-table-column>
        </el-table>
        <div v-else class="empty">还没有打卡计划</div>
      </template>
    </div>
    <template v-if="detail" #footer>
      <el-button v-if="detail.status === 1" type="danger" plain @click="emit('change-status', detail, 0)">停用</el-button>
      <el-button v-else type="primary" @click="emit('change-status', detail, 1)">启用</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { UserFilled } from '@element-plus/icons-vue'
import { getUser } from '@/api/user'
import type { MiniUserDetail } from '@/types/user'
import { ageText, avatarSrc, cycleText, planStatusText, planStatusType, sexText, timeText } from '@/utils/display'

const props = defineProps<{
  userId: number | null
}>()

const emit = defineEmits<{
  close: []
  'change-status': [user: MiniUserDetail, status: 0 | 1]
}>()

const visible = ref(false)
const loading = ref(false)
const detail = ref<MiniUserDetail | null>(null)
let requestSeq = 0

watch(() => props.userId, (id) => {
  visible.value = id != null
  detail.value = null
  if (id == null) return
  const seq = ++requestSeq
  loading.value = true
  getUser(id).then((data) => {
    if (seq !== requestSeq) return
    detail.value = data
  }).catch((error: Error) => {
    if (seq !== requestSeq) return
    ElMessage.error(error.message || '加载失败')
    emit('close')
  }).finally(() => {
    if (seq === requestSeq) loading.value = false
  })
})

function reload() {
  if (props.userId == null) return
  const seq = ++requestSeq
  loading.value = true
  getUser(props.userId).then((data) => {
    if (seq !== requestSeq) return
    detail.value = data
  }).catch((error: Error) => {
    if (seq !== requestSeq) return
    ElMessage.error(error.message || '加载失败')
  }).finally(() => {
    if (seq === requestSeq) loading.value = false
  })
}

defineExpose({ reload })
</script>

<style scoped>
.section-title {
  margin: 8px 0 12px;
  font-weight: 600;
}

.profile {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.user-name {
  font-size: 16px;
  font-weight: 600;
}

.user-id,
.labels,
.empty {
  color: var(--cmg-muted);
  font-size: 13px;
}

.status-tag {
  width: 60px;
  display: flex!important;
  justify-content: center;
  align-items: center;
}

.facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 16px;
  margin-bottom: 20px;
}

.facts span {
  display: block;
  margin-bottom: 4px;
  color: var(--cmg-muted);
  font-size: 13px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-bottom: 8px;
}

.stats strong {
  display: block;
  font-size: 22px;
}

.stats span {
  color: var(--cmg-muted);
  font-size: 13px;
}

.ongoing { color: #5a8fc7; }
.done { color: #3d9a62; }
.expired { color: #d9893b; }

.labels {
  margin-bottom: 12px;
}

.empty {
  padding: 24px 0;
}
</style>
