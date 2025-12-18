<template>
  <div class="top-control-bar">
    <div class="control-buttons">
      <button 
        class="btn" 
        :class="{ active: isRunning }" 
        @click="toggleDataStream"
      >
        {{ isRunning ? '暂停' : '启动' }}数据流
      </button>
      <button class="btn" @click="refreshData">
        刷新数据
      </button>
      <button class="btn" @click="toggleTheme">
        切换主题
      </button>
    </div>
    
    <div class="search-box">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="搜索服务器/任务/集群..." 
        class="search-input"
        @input="onSearch"
      />
    </div>
    
    <div class="user-info">
      <span style="color: var(--text-secondary);">管理员</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { systemState, setRunning } from '../services/systemState'

const emit = defineEmits<{
  toggleDataStream: []
  refreshData: []
  search: [query: string]
  toggleTheme: []
}>()

const isRunning = ref(true)
const searchQuery = ref('')

// 同步全局状态
watchEffect(() => {
  isRunning.value = systemState.value.running
})

const toggleDataStream = () => {
  const newStatus = !systemState.value.running
  setRunning(newStatus)
  emit('toggleDataStream')
}

const refreshData = () => {
  emit('refreshData')
}

const onSearch = () => {
  emit('search', searchQuery.value)
}

const toggleTheme = () => {
  emit('toggleTheme')
}
</script>
