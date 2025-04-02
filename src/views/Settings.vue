<template>
  <div class="settings">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>系统设置</span>
        </div>
      </template>

      <div class="settings-section">
        <h3>数据管理</h3>
        <div class="settings-group">
          <el-button type="danger" @click="handleClearPassengers">清空旅客数据</el-button>
          <el-button type="danger" @click="handleClearTrains">清空车次数据</el-button>
          <el-button type="danger" @click="handleClearStaff">清空员工数据</el-button>
        </div>
      </div>

      <div class="settings-section">
        <h3>全部清空</h3>
        <div class="settings-group">
          <el-button type="danger" @click="handleClearAll">清空所有数据</el-button>
        </div>
      </div>

      <div class="settings-section">
        <h3>系统性能优化</h3>
        <div class="settings-group">
          <el-button type="primary" @click="handleOptimizePerformance">优化系统性能</el-button>
        </div>
      </div>

      <div class="settings-section">
        <h3>系统信息</h3>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="版本">1.7.0</el-descriptions-item>
          <el-descriptions-item label="存储位置">LocalStorage</el-descriptions-item>
          <el-descriptions-item label="旅客数据数量">{{ passengerCount }}</el-descriptions-item>
          <el-descriptions-item label="车次数据数量">{{ trainCount }}</el-descriptions-item>
          <el-descriptions-item label="员工数据数量">{{ staffCount }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePassengerStore } from '../store/passenger'
import { useTrainStore } from '../store/train'
import { useStaffStore } from '../store/staff'
import { ElMessage, ElMessageBox } from 'element-plus'

const passengerStore = usePassengerStore()
const trainStore = useTrainStore()
const staffStore = useStaffStore()

// 计算数据计数
const passengerCount = computed(() => passengerStore.passengerList.length)
const trainCount = computed(() => trainStore.trainList.length)
const staffCount = computed(() => staffStore.staffList.length)

// 清空旅客数据
const handleClearPassengers = () => {
  ElMessageBox.confirm('确认清空所有旅客数据？此操作不可恢复！', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    passengerStore.clearAllPassengers()
    ElMessage.success('旅客数据已清空')
  }).catch(() => {
    ElMessage.info('已取消操作')
  })
}

// 清空车次数据
const handleClearTrains = () => {
  ElMessageBox.confirm('确认清空所有车次数据？此操作不可恢复！', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    trainStore.clearAllTrains()
    ElMessage.success('车次数据已清空')
  }).catch(() => {
    ElMessage.info('已取消操作')
  })
}

// 清空员工数据
const handleClearStaff = () => {
  ElMessageBox.confirm('确认清空所有员工数据？此操作不可恢复！', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    staffStore.clearAllStaff()
    ElMessage.success('员工数据已清空')
  }).catch(() => {
    ElMessage.info('已取消操作')
  })
}

// 清空所有数据
const handleClearAll = () => {
  ElMessageBox.confirm('确认清空所有数据？包括旅客、车次和员工数据，此操作不可恢复！', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
    confirmButtonClass: 'el-button--danger'
  }).then(() => {
    passengerStore.clearAllPassengers()
    trainStore.clearAllTrains()
    staffStore.clearAllStaff()
    ElMessage.success('所有数据已清空')
  }).catch(() => {
    ElMessage.info('已取消操作')
  })
}

// 优化系统性能
const handleOptimizePerformance = () => {
  // 清除所有不需要的localStorage数据
  for(let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && 
        key !== 'passengerList' && 
        key !== 'trainList' && 
        key !== 'staff-list' && 
        key !== 'staff-list-nextId') {
      localStorage.removeItem(key)
    }
  }

  // 清除可能的孤立数据
  localStorage.setItem('passengerList', JSON.stringify(passengerStore.passengerList))
  localStorage.setItem('trainList', JSON.stringify(trainStore.trainList))
  localStorage.setItem('staff-list', JSON.stringify(staffStore.staffList))
  
  ElMessage.success('系统性能已优化')
}

// 页面加载时更新数据计数
onMounted(() => {
  console.log('Settings component mounted')
  console.log(`当前数据统计: 旅客=${passengerCount.value}, 车次=${trainCount.value}, 员工=${staffCount.value}`)
})
</script>

<style scoped>
.settings {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header span {
  font-size: 18px;
  font-weight: bold;
}

.settings-section {
  margin-bottom: 30px;
}

.settings-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  color: #606266;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 10px;
}

.settings-group {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}
</style> 