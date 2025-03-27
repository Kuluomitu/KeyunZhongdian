<template>
  <div class="home">
    <el-row :gutter="20">
      <el-col :span="20">
        <el-card class="welcome-card">
          <template #header>
            <div class="welcome-header">
              <span>今日待办</span>
              <el-tag type="success">{{ currentTime }}</el-tag>
            </div>
          </template>
          <div class="welcome-content">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-statistic title="剩余重点旅客数" :value="passengerCount">
                  <template #prefix>
                    <el-icon><User /></el-icon>
                  </template>
                </el-statistic>
              </el-col>
              <el-col :span="12">
                <el-statistic title="已服务重点旅客数" :value="servedCount">
                  <template #prefix>
                    <el-icon><Check /></el-icon>
                  </template>
                </el-statistic>
              </el-col>
            </el-row>
          </div>
        </el-card>

        <!-- 将开检提醒移到这里 -->
        <el-card class="notification-card" style="margin-top: 20px;">
          <template #header>
            <div class="notification-header">
              <el-icon><Bell /></el-icon>
              开检提醒
            </div>
          </template>
          <div class="notification-content">
            <!-- 提醒将在这里显示 -->
          </div>
        </el-card>

        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="24">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>重点旅客登记</span>
                  <el-button-group>
                    <el-button type="success" @click="handleAdd">
                      <el-icon><Plus /></el-icon>
                      添加旅客
                    </el-button>
                  </el-button-group>
                </div>
              </template>
              
              <el-table 
                :data="todayPassengers" 
                style="width: 100%"
                :row-class-name="getRowClassName">
                <el-table-column prop="trainNo" label="车次" width="90" />
                <el-table-column prop="name" label="姓名" width="90" />
                <el-table-column prop="type" label="类别" width="70">
                  <template #default="{ row }">
                    <el-tag :type="getTypeTagType(row.type)">{{ row.type }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="service" label="服务" width="120" show-overflow-tooltip />
                <el-table-column prop="staffName" label="服务人员" width="90" />
                <el-table-column prop="cardNo" label="牌号" width="70" />
                <el-table-column label="开检时间" width="90">
                  <template #default="scope">
                    {{ getTicketTime(scope.row.trainNo) }}
                  </template>
                </el-table-column>
                <el-table-column prop="companions" label="同行" width="60" align="center" />
                <el-table-column prop="remark" label="备注" width="120" show-overflow-tooltip />
                <el-table-column label="操作" width="240">
                  <template #default="scope">
                    <el-button-group>
                      <el-button size="small" @click="showTrainInfo(scope.row.trainNo)">
                        车次信息
                      </el-button>
                      <el-button 
                        size="small" 
                        type="primary"
                        @click="handleEdit(scope.row)">
                        编辑
                      </el-button>
                      <el-button 
                        size="small" 
                        type="success"
                        :disabled="scope.row.isLeft"
                        @click="handleMarkAsLeft(scope.row)">
                        离厅
                      </el-button>
                    </el-button-group>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </el-col>

      <el-col :span="2">
        <div class="notification-container">
          <div class="notification-header">
            <el-icon><Bell /></el-icon>
            开检提醒
          </div>
          <div class="notification-content">
            <!-- 提醒将在这里显示 -->
          </div>
        </div>
      </el-col>
    </el-row>

    <el-dialog 
      v-model="dialogVisible" 
      title="车次详细信息"
      width="800px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="车次">{{ currentTrain?.trainNo }}</el-descriptions-item>
        <el-descriptions-item label="担当局">{{ currentTrain?.bureau }}</el-descriptions-item>
        <el-descriptions-item label="运行区间1">{{ currentTrain?.route }}</el-descriptions-item>
        <el-descriptions-item label="运行区间2">{{ currentTrain?.route2 }}</el-descriptions-item>
        <el-descriptions-item label="到点">{{ currentTrain?.arrivalTime }}</el-descriptions-item>
        <el-descriptions-item label="开点">{{ currentTrain?.departureTime }}</el-descriptions-item>
        <el-descriptions-item label="股道">{{ currentTrain?.track }}</el-descriptions-item>
        <el-descriptions-item label="站台">{{ currentTrain?.platform }}</el-descriptions-item>
        <el-descriptions-item label="站停">{{ currentTrain?.stopTime }}</el-descriptions-item>
        <el-descriptions-item label="开检时间">
          <el-time-picker
            v-if="currentTrain"
            v-model="currentTrain.ticketTime"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="选择开检时间"
            @change="handleTicketTimeChange"
            style="width: 120px"
          />
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 新增/编辑旅客对话框 -->
    <el-dialog 
      v-model="addDialogVisible" 
      :title="isEdit ? '编辑旅客' : '新增旅客'"
      width="600px">
      <el-form 
        :model="form" 
        :rules="rules"
        ref="formRef"
        label-width="100px">
        <el-form-item label="日期" prop="date">
          <el-date-picker 
            v-model="form.date" 
            type="date" 
            placeholder="选择日期"
            value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="车次" prop="trainNo">
          <el-select 
            v-model="form.trainNo" 
            placeholder="请选择车次"
            filterable>
            <el-option
              v-for="train in trainStore.trainList"
              :key="train.trainNo"
              :label="train.trainNo"
              :value="train.trainNo"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="类别" prop="type">
          <el-select v-model="form.type" placeholder="请选择类别">
            <el-option label="老" value="老" />
            <el-option label="弱" value="弱" />
            <el-option label="病" value="病" />
            <el-option label="残" value="残" />
            <el-option label="孕" value="孕" />
            <el-option label="特殊" value="特殊" />
          </el-select>
        </el-form-item>
        <el-form-item label="服务" :required="false">
          <el-select v-model="form.service" placeholder="请选择服务类型" style="width: 100%" clearable>
            <el-option label="引导" value="引导" />
            <el-option label="提供轮椅" value="提供轮椅" />
            <el-option label="提供担架" value="提供担架" />
            <el-option label="盲人" value="盲人" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="服务人员" prop="staffName">
          <el-select 
            v-model="form.staffName" 
            placeholder="请选择服务工作人员"
            filterable
            default-first-option
            style="width: 100%">
            <el-option
              v-for="staff in staffStore.getActiveStaffList()"
              :key="staff.staffNo"
              :label="staff.label"
              :value="staff.value">
              <div style="display: flex; justify-content: space-between; align-items: center">
                <span style="font-size: 14px">{{ staff.value }}</span>
                <span style="color: #909399; font-size: 12px">
                  {{ staff.staffNo }} - {{ staff.team }}
                </span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="同行人数" prop="companions">
          <el-input-number v-model="form.companions" :min="0" />
        </el-form-item>
        <el-form-item label="牌号" prop="cardNo">
          <el-input v-model="form.cardNo" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useHome } from '../composables/useHome'
import { useTrainStore } from '../store/train'
import { useStaffStore } from '../store/staff'
import { Check, Plus, User, Bell } from '@element-plus/icons-vue'

const trainStore = useTrainStore()
const staffStore = useStaffStore()

const {
  currentTime,
  dialogVisible,
  currentTrain,
  passengerCount,
  servedCount,
  todayPassengers,
  addDialogVisible,
  formRef,
  form,
  rules,
  isEdit,
  showTrainInfo,
  getTypeTagType,
  getRowClassName,
  handleMarkAsLeft,
  handleAdd,
  handleEdit,
  handleSubmit,
  getTicketTime,
  handleTicketTimeChange
} = useHome()

// 添加服务人员过滤方法
const filterStaff = (query: string) => {
  const staffList = staffStore.getActiveStaffList()
  if (!query) return staffList
  
  const lowercaseQuery = query.toLowerCase()
  return staffList.filter(staff => 
    staff.value.toLowerCase().includes(lowercaseQuery) ||  // 匹配姓名
    staff.staffNo.toLowerCase().includes(lowercaseQuery) || // 匹配工号
    staff.team.toLowerCase().includes(lowercaseQuery)      // 匹配班组
  )
}
</script>

<style scoped>
.home {
  padding: 20px;
  min-width: 1400px;
  max-width: 1920px;
  margin: 0 auto;
  box-sizing: border-box;
}

.welcome-card {
  margin-bottom: 20px;
  position: relative;
  z-index: 2;
}

.welcome-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-content {
  padding: 20px 0;
}

.card-header {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.card-header span {
  font-size: 16px;
  font-weight: bold;
}

.el-button-group {
  position: absolute;
  right: 0;
}

.el-statistic {
  text-align: center;
}

:deep(.el-statistic__number) {
  color: #409EFF;
  font-size: 24px !important;
}

:deep(.el-card__header) {
  border-bottom: 1px solid #e4e7ed;
  padding: 15px 20px;
}

.el-button-group .el-button {
  margin-left: 0;
}

.urgent-time {
  color: #db3a3a;
  font-weight: bold;
}

:deep(.el-table__row) {
  &.urgent-row {
    background-color: #f79e03 !important;
  }
  
  &.expired-row {
    background-color: #fef0f0 !important;
    color: #f56c6c !important;
  }
}

.notification-card {
  margin-bottom: 20px;
}

.notification-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.notification-content {
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
  scrollbar-width: thin;
  scrollbar-color: #909399 #f4f4f5;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.notification-content::-webkit-scrollbar {
  width: 4px;
}

.notification-content::-webkit-scrollbar-track {
  background: #f4f4f5;
  border-radius: 2px;
}

.notification-content::-webkit-scrollbar-thumb {
  background: #909399;
  border-radius: 2px;
}

:deep(.urgent-notification) {
  position: relative !important;
  margin: 0;
  width: 100%;
  background-color: #fff;
  border: 1px solid #e4e7ed;
  padding: 6px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

.notification-container {
  display: none;
}

.el-card {
  position: relative;
  z-index: 2;
}

@media screen and (max-width: 1600px) {
  .notification-container {
    width: 250px;
  }
  
  :deep(.el-table) {
    font-size: 13px;
  }
  
  :deep(.el-button) {
    font-size: 13px;
  }
}

.el-row .el-col-20 {
  width: calc(100% - 80px);
  min-width: 1000px;
}

.el-row .el-col-4 {
  width: 300px;
}
</style> 