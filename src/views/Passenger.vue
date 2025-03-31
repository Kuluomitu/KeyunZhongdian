<template>
  <div class="passenger">
    <h2>重点旅客历史记录</h2>
    
    <div class="operation-buttons">
      <el-button type="danger" @click="handleClearAll">清空历史记录</el-button>
      <el-button type="primary" @click="handleExportExcel">导出Excel</el-button>
    </div>

    <el-table :data="passengerStore.getAllPassengers()" style="width: 100%; margin-top: 20px">
      <el-table-column prop="id" label="序号" width="80" />
      <el-table-column prop="date" label="日期" />
      <el-table-column prop="trainNo" label="车次" />
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="service" label="服务" />
      <el-table-column prop="phone" label="联系电话" />
      <el-table-column prop="staffName" label="服务人员" width="100" />
      <el-table-column label="开检时间">
        <template #default="scope">
          {{ getTicketTime(scope.row.trainNo) }}
        </template>
      </el-table-column>
      <el-table-column prop="companions" label="同行人数" />
      <el-table-column prop="cardNo" label="牌号" />
      <el-table-column prop="source" label="来源" width="70">
        <template #default="{ row }">
          <el-tag :type="row.source === 'online' ? 'success' : 'info'">
            {{ row.source === 'online' ? '线上' : '线下' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.isServed ? 'success' : 'info'">
            {{ row.isServed ? '已服务' : '未服务' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="scope">
          <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePassengerStore } from '../store/passenger'
import { useTrainStore } from '../store/train'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Passenger } from '../types/passenger'
import { PassengerType, PageType } from '../types/passenger'
import * as XLSX from 'xlsx'

const passengerStore = usePassengerStore()
const trainStore = useTrainStore()

onMounted(() => {
  console.log('Passenger component mounted')
  console.log('Initial passengerList:', passengerStore.getAllPassengers())
})

// 根据类别返回标签类型
const getTypeTagType = (type: PassengerType): string => {
  const typeMap: Record<PassengerType, string> = {
    [PassengerType.MILITARY]: 'success',
    [PassengerType.ELDERLY]: 'warning',
    [PassengerType.WEAK]: 'info',
    [PassengerType.SICK]: 'danger',
    [PassengerType.DISABLED]: 'danger'
  }
  return typeMap[type] || ''
}

const handleDelete = (row: Passenger) => {
  ElMessageBox.confirm('确认删除该旅客信息？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    passengerStore.deletePassenger(row.id)
    ElMessage.success('删除成功')
  })
}

// 获取车次的开检时间
const getTicketTime = (trainNo: string): string => {
  const train = trainStore.getTrainByNo(trainNo)
  return train ? train.ticketTime : ''
}

// 清空所有历史记录
const handleClearAll = () => {
  ElMessageBox.confirm('确认清空所有历史记录？此操作不可恢复！', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    try {
      passengerStore.clearAllPassengers()
      console.log('清空后的数据：', passengerStore.getAllPassengers())
      ElMessage.success('历史记录已清空')
    } catch (error) {
      console.error('清空历史记录失败：', error)
      ElMessage.error('清空历史记录失败')
    }
  }).catch(() => {
    ElMessage.info('已取消清空操作')
  })
}

// 导出Excel
const handleExportExcel = () => {
  const passengers = passengerStore.getAllPassengers()
  const data = passengers.map(p => ({
    '序号': p.id,
    '日期': p.date,
    '车次': p.trainNo,
    '姓名': p.name,
    '服务': p.service,
    '联系电话': p.phone,
    '服务人员': p.staffName,
    '开检时间': getTicketTime(p.trainNo),
    '同行人数': p.companions,
    '牌号': p.cardNo,
    '来源': p.source === 'online' ? '线上' : '线下',
    '备注': p.remark,
    '状态': p.isServed ? '已服务' : '未服务'
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '重点旅客历史记录')
  XLSX.writeFile(wb, '重点旅客历史记录.xlsx')
  ElMessage.success('导出成功')
}
</script>

<style scoped>
.passenger {
  padding: 20px;
}

.operation-buttons {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}
</style> 