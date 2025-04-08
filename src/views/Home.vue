<template>
  <div class="home">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="welcome-card">
          <template #header>
            <div class="welcome-header">
              <span>今日待办</span>
              <div class="time-info">
                <el-tag type="success">{{ currentTime }}</el-tag>
                <el-tag size="small" type="info" class="refresh-tag">数据更新: {{ formattedLastRefreshTime }}</el-tag>
              </div>
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
              <div class="notification-title">
                <el-icon><Bell /></el-icon>
                开检提醒
              </div>
              <div class="notification-actions">
                <el-dropdown v-if="audioDevices.length > 0" @command="handleSelectDevice" trigger="click">
                  <el-button type="primary" size="small" :loading="loadingDevices">
                    <span v-if="speakerStatus.currentDevice">
                      {{ speakerStatus.currentDevice }}
                    </span>
                    <span v-else>选择音频设备</span>
                    <el-icon class="el-icon--right"><arrow-down /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item v-for="device in audioDevices" :key="device.deviceId" :command="device.deviceId">
                        {{ device.label }}
                      </el-dropdown-item>
                      <el-dropdown-item divided command="refresh">
                        <el-icon><Refresh /></el-icon> 刷新设备列表
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-button type="success" size="small" @click="handleConnectSpeaker" :loading="loadingDevices">
                  {{ speakerStatus.connected ? '已连接喇叭' : '连接喇叭' }}
                </el-button>
                <el-button 
                  type="primary" 
                  size="small"
                  :disabled="!speakerStatus.connected" 
                  @click="announcementDialogVisible = true">
                  自定义播报
                </el-button>
              </div>
            </div>
          </template>
          <div class="notification-content">
            <div v-if="getAlertPassengers().length > 0">
              <div v-for="passenger in getAlertPassengers()" :key="passenger.id" class="passenger-item">
                <div class="passenger-info">
                  <span>{{ passenger.trainNo }}次列车</span>
                  <span>牌号: {{ passenger.cardNo }}</span>
                  <span>姓名: {{ passenger.name }}</span>
                  <el-button 
                    size="small" 
                    type="primary" 
                    @click="handleAnnounce(passenger)"
                    :disabled="!speakerStatus.connected"
                    class="announce-btn">
                    <el-icon><Microphone /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>
            <div v-else class="empty-data">
              暂无开检提醒
            </div>
          </div>
        </el-card>

        <el-row :gutter="20" style="margin-top: 20px;">
          <el-col :span="24">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>重点旅客登记</span>
                  <div class="button-group-container">
                    <el-upload
                      class="upload-demo"
                      action="#"
                      :auto-upload="false"
                      :on-change="handleFileChange"
                      :show-file-list="false"
                      accept=".xlsx,.xls">
                      <el-button type="primary">
                        <el-icon><Upload /></el-icon>
                        导入Excel
                      </el-button>
                    </el-upload>
                    <el-button type="success" @click="handleAdd">
                      <el-icon><Plus /></el-icon>
                      添加旅客
                    </el-button>
                  </div>
                </div>
              </template>
              
              <el-table 
                :data="todayPassengers" 
                v-bind="tableConfig"
                :row-class-name="getRowClassName">
                <template #empty>
                  <el-empty description="今日暂无旅客数据" />
                </template>
                <el-table-column prop="date" label="日期" width="90">
                  <template #default="scope">
                    <span>{{ formatDisplayDate(scope.row.date) }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="trainNo" label="车次" width="70" />
                <el-table-column prop="name" label="姓名" width="70" />
                <el-table-column prop="phone" label="联系电话" width="110" />
                <el-table-column prop="service" label="服务" width="110" show-overflow-tooltip />
                <el-table-column prop="staffName" label="服务人员" width="90" />
                <el-table-column prop="companions" label="同行人数" width="90">
                  <template #default="scope">
                    <span>{{ scope.row.companions || 0 }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="cardNo" label="牌号" width="90">
                  <template #default="scope">
                    <span>{{ scope.row.cardNo }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="开检时间" width="100">
                  <template #default="scope">
                    <el-popover
                      placement="right"
                      :width="200"
                      trigger="click"
                      v-if="scope.row.trainNo && getTrainTypeAndRemindTime(scope.row.trainNo).type !== '终到车'"
                      @show="initTempTicketTime(scope.row.trainNo)">
                      <template #reference>
                        <div class="time-box">
                          {{ getTicketTime(scope.row.trainNo) || '无' }}
                        </div>
                      </template>
                      <div>
                        <el-time-picker
                          v-model="tempTicketTimes[scope.row.trainNo]"
                          format="HH:mm"
                          value-format="HH:mm"
                          placeholder="选择开检时间"
                          style="width: 100%;"
                          @change="handleTicketTimeChange(scope.row.trainNo, tempTicketTimes[scope.row.trainNo])"
                        />
                      </div>
                    </el-popover>
                    <div v-else class="time-box terminal-train">
                      终到车
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="到站时间" width="100">
                  <template #default="scope">
                    <div class="time-box edit-time" v-if="scope.row.trainNo === 'K213'" @click="showSetArrivalTimeDialog(scope.row.trainNo)" title="点击修改到站时间">
                      {{ trainStore.getTrainByNo('K213')?.arrivalTime || '06:30' }}
                    </div>
                    <div class="time-box" v-else-if="trainStore.getTrainByNo(scope.row.trainNo)?.route2 === '西安'">
                      <span v-if="scope.row.trainNo === 'T231'">07:25</span>
                      <span v-else-if="scope.row.trainNo === 'D6852'">09:16</span>
                      <span v-else>{{ trainStore.getTrainByNo(scope.row.trainNo)?.arrivalTime || '' }}</span>
                    </div>
                    <div class="time-box" v-else>
                      <span>--</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="remark" label="备注" width="120" show-overflow-tooltip />
                <el-table-column label="操作" width="280">
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
                        :disabled="scope.row.isServed"
                        @click="handleMarkAsLeft(scope.row)">
                        离厅
                      </el-button>
                      <el-button 
                        size="small" 
                        type="warning"
                        :disabled="!speakerStatus.connected || scope.row.isServed"
                        @click="handleAnnounce(scope.row)">
                        <el-icon><Microphone /></el-icon>
                        <el-tooltip content="播报开检提醒" placement="top">
                          <span></span>
                        </el-tooltip>
                      </el-button>
                    </el-button-group>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </el-col>

      <el-col :span="5">
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
        <el-descriptions-item label="开检时间">{{ currentTrain?.ticketTime || getTicketTime(currentTrain?.trainNo || '') }}</el-descriptions-item>
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
        <el-form-item label="服务" :required="false">
          <el-select v-model="form.service" placeholder="请选择服务类型" style="width: 100%" clearable>
            <el-option label="引导" value="引导" />
            <el-option label="提供轮椅" value="提供轮椅" />
            <el-option label="提供担架" value="提供担架" />
            <el-option label="盲人" value="盲人" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" />
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

    <!-- 播报设置对话框 -->
    <el-dialog
      v-model="announcementDialogVisible"
      title="自定义播报"
      width="500px">
      <el-form>
        <el-form-item label="播报内容">
          <el-input
            v-model="customAnnouncementText"
            type="textarea"
            :rows="4"
            placeholder="请输入自定义播报内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="announcementDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleCustomAnnounce">
            播报
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useHome } from '../composables/useHome'
import { useTrainStore } from '../store/train'
import { useStaffStore } from '../store/staff'
import { usePassengerStore } from '../store/passenger'
import { useAnnouncement } from '../composables/useAnnouncement'
import { Check, Plus, User, Bell, Upload, Refresh, ArrowDown, Loading, Microphone } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch, onBeforeUnmount } from 'vue'
import type { Passenger, PassengerForm } from '../types/passenger'

const trainStore = useTrainStore()
const staffStore = useStaffStore()
const passengerStore = usePassengerStore()
const { 
  speakerStatus, 
  audioDevices, 
  loadingDevices,
  getAudioDevices, 
  connectSpeaker, 
  connectSpecificSpeaker, 
  disconnectSpeaker, 
  announceTicketCheck, 
  announceCustom 
} = useAnnouncement()

const useHomeReturn = useHome()

const {
  currentTime = ref(new Date().toLocaleDateString()),
  dialogVisible = ref(false),
  currentTrain = ref(null),
  passengerCount = ref(0),
  servedCount = ref(0),
  todayPassengers = ref([]),
  addDialogVisible = ref(false),
  formRef = ref(),
  form,
  rules = {},
  isEdit = ref(false),
  showTrainInfo = () => {},
  getTypeTagType = () => '',
  getRowClassName = ({ row }: { row: Passenger }): string => {
    // 如果是离厅旅客，显示灰色
    if (row.isServed) {
      return 'left-row'
    }
    
    try {
      // 判断是否已过期（包括终到车）
      const isExpired = isExpiredTicketTime(row.trainNo, row.date)
      if (isExpired) {
        return 'expired-row'
      }
      
      // 如果开检/到站时间临近，显示黄色警告
      if (isNearTicketTime(row.trainNo)) {
        return 'near-row'
      }
    } catch (error) {
      console.error('计算行颜色状态出错:', error, row.trainNo)
    }
    
    return ''
  },
  handleAdd = () => {},
  handleEdit = () => {},
  handleSubmit: originalHandleSubmit = () => {},
  getTicketTime = () => '',
  handleFileChange = () => {},
  checkAndNotify = () => {},
  updateTodayPassengers = async () => {},
  updateStatistics = () => {},
  handleTicketTimeChange = () => {},
  isNearTicketTime = () => false,
  isExpiredTicketTime = () => false,
  isEarlyMorningTicketTime = () => false,
  handleCardNoChange = () => {},
  showSetArrivalTimeDialog = () => {},
  getTrainTypeAndRemindTime = () => ({ type: '', remindMinutes: 0 }),
  setStyleUpdateCallback = () => {}
} = useHomeReturn || {}

// 播报对话框相关数据
const announcementDialogVisible = ref(false)
const customAnnouncementText = ref('')

// 定时器相关变量
let checkTimer: ReturnType<typeof setInterval> | null = null
const timerInterval = 10000 // 10秒
let autoRefreshTimer: ReturnType<typeof setInterval> | null = null
let colorRefreshTimer: ReturnType<typeof setInterval> | null = null

// 刷新时间相关
const lastRefreshTime = ref(new Date())
const formattedLastRefreshTime = computed(() => {
  const now = new Date()
  const diffSeconds = Math.floor((now.getTime() - lastRefreshTime.value.getTime()) / 1000)
  
  if (diffSeconds < 60) {
    return `${diffSeconds}秒前`
  } else if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)}分钟前`
  } else {
    return `${Math.floor(diffSeconds / 3600)}小时前`
  }
})

// 统一的样式更新函数
const updateRowStyles = () => {
  console.log('开始更新样式，当前旅客数据:', todayPassengers.value)
  
  // 检查当前是否在旅客信息页面
  const currentPath = window.location.pathname
  if (currentPath.includes('/passenger') || currentPath.includes('/passengers')) {
    console.log('当前在旅客信息页面，不应用变色样式')
    return
  }
  
  // 使用 Vue nextTick 确保在 DOM 更新后执行
  nextTick(() => {
    const table = document.querySelector('.el-table__body-wrapper table')
    if (!table) {
      console.log('未找到表格元素')
      return
    }
    
    // 获取所有行，使用 tbody > tr 确保只获取数据行
    const rows = table.querySelectorAll('tbody > tr')
    if (!rows.length) {
      console.log('未找到表格行')
      return
    }
    
    // 首先移除所有行的样式类
    rows.forEach(row => {
      row.classList.remove('near-row', 'expired-row', 'left-row')
      // 移除可能的内联样式
      ;(row as HTMLElement).style.backgroundColor = ''
    })
    
    // 获取当前时间，用于判断是否临近开检
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeInMinutes = currentHour * 60 + currentMinute
    
    // 批量更新样式
    todayPassengers.value.forEach((passenger, index) => {
      if (index >= rows.length) {
        console.log(`索引 ${index} 超出表格行数 ${rows.length}`)
        return
      }
      
      const row = rows[index] as HTMLElement
      console.log(`处理第 ${index + 1} 行，旅客信息:`, passenger)
      
      // 判断是否为离厅旅客
      if (passenger.isServed) {
        console.log(`旅客 ${passenger.name} 已离厅，添加离厅样式`)
        row.classList.add('left-row')
        return
      }
      
      // 获取车次类型和提醒时间
      const { type: trainType, remindMinutes } = getTrainTypeAndRemindTime(passenger.trainNo)
      
      // 首先通过isExpiredTicketTime函数判断是否过期
      // 这是确定是否标红的唯一标准，保持与排序算法的一致性
      const shouldMarkRed = isExpiredTicketTime(passenger.trainNo, passenger.date)
      console.log(`车次 ${passenger.trainNo} 是否过期: ${shouldMarkRed}`)
      
      // 如果没有过期，判断是否临近开检/到站时间，添加黄色样式
      if (!shouldMarkRed) {
        // 判断是否临近开检/到站时间
        if (isNearTicketTime(passenger.trainNo)) {
          console.log(`车次 ${passenger.trainNo} 临近开检/到站，添加黄色样式`)
          row.classList.add('near-row')
        }
      }
      
      // 应用红色样式（如果需要）
      if (shouldMarkRed) {
        row.classList.add('expired-row')
        console.log(`车次 ${passenger.trainNo} 添加红色样式`)
        
        // 特别处理终到车
        if (trainType === '终到车') {
          // 移除可能导致闪烁的类
          row.classList.remove('near-row')
          
          // 专门为终到车添加内联样式，强制覆盖所有其他样式
          row.style.backgroundColor = '#fef0f0';
          row.style.color = '#f56c6c';
          row.style.animation = 'none';
          
          // 特殊处理K213, T231, D6852这几个车次
          if (['K213', 'T231', 'D6852', 'G657'].includes(passenger.trainNo)) {
            // 获取该行所有单元格并设置样式
            const cells = row.querySelectorAll('td');
            cells.forEach(cell => {
              (cell as HTMLElement).style.backgroundColor = '#fef0f0';
              (cell as HTMLElement).style.animation = 'none';
              (cell as HTMLElement).style.transition = 'none';
            });
            
            // 特别处理显示"终到车"的单元格
            const terminalCell = row.querySelector('.terminal-train');
            if (terminalCell) {
              (terminalCell as HTMLElement).style.backgroundColor = '#fef0f0';
              (terminalCell as HTMLElement).style.color = '#f56c6c';
              (terminalCell as HTMLElement).style.borderColor = '#fbc4c4';
              (terminalCell as HTMLElement).style.animation = 'none';
              (terminalCell as HTMLElement).style.transition = 'none';
            }
          }
          
          console.log(`终到车 ${passenger.trainNo} 移除黄色样式，添加内联红色样式`)
        }
      }
    })
  })
}

// 防抖处理样式更新
const debouncedUpdateStyles = (() => {
  let timeout: number | null = null
  return () => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = window.setTimeout(() => {
      console.log('执行防抖后的样式更新')
      updateRowStyles()
    }, 200)
  }
})()

// 确保在数据更新后重新应用样式
watch(todayPassengers, () => {
  console.log('旅客数据发生变化，触发样式更新')
  debouncedUpdateStyles()
}, { deep: true })

// 页面加载时尽快获取数据并初始化
onMounted(async () => {
  try {
    await getAudioDevices()
    
    // 获取旅客数据并优化数据加载策略
    console.log('初始化数据加载...')
    
    // 1. 异步更新统计数据，不阻塞UI渲染
    setTimeout(() => updateStatistics(), 0)
    
    // 2. 使用已有的本地数据先展示，减少初始加载等待时间
    todayPassengers.value = passengerStore.getPassengersByDate(new Date().toISOString().split('T')[0])
    console.log('初始化本地数据完成，当前旅客数量:', todayPassengers.value.length)
    
    // 3. 延迟检查提醒，避免页面初始化时的性能压力
    setTimeout(async () => {
      await checkNewAlerts()
      debouncedUpdateStyles()
      console.log('完成初始提醒检查')
    }, 1500)
    
    // 4. 使用更合理的定时器间隔
    if (!checkTimer) {
      checkTimer = setInterval(async () => {
        await checkNewAlerts()
        debouncedUpdateStyles()
      }, timerInterval)
    }
    
    // 5. 延迟启动自动刷新
    setTimeout(() => {
      autoRefreshTimer = setInterval(async () => {
        await updateTodayPassengers()
        debouncedUpdateStyles()
        lastRefreshTime.value = new Date()
      }, 10000)
      
      console.log('自动刷新定时器已启动')
    }, 2000)
    
    // 6. 设置样式更新定时器
    colorRefreshTimer = setInterval(() => {
      if (todayPassengers.value.length > 0) {
        console.log('定时检查样式更新')
        debouncedUpdateStyles()
      }
    }, 2000)
    
    // 7. 监听表格变化
    const observer = new MutationObserver((mutations) => {
      console.log('检测到表格变化:', mutations)
      debouncedUpdateStyles()
    })
    
    // 8. 延迟启动观察器，确保表格已渲染
    setTimeout(() => {
      const tableContainer = document.querySelector('.el-table')
      if (tableContainer) {
        observer.observe(tableContainer, { 
          childList: true, 
          subtree: true,
          attributes: true 
        })
        console.log('表格变化监听器已启动')
        
        // 初始化样式
        debouncedUpdateStyles()
      }
    }, 2500)
    
    // 9. 监听路由变化，确保在路由切换时不显示颜色
    if (window.addEventListener) {
      window.addEventListener('popstate', () => {
        console.log('路由变化，检查是否需要应用样式')
        debouncedUpdateStyles()
      })
    }
    
    // 组件卸载时停止监听
    onUnmounted(() => {
      observer.disconnect()
      
      if (window.removeEventListener) {
        window.removeEventListener('popstate', debouncedUpdateStyles)
      }
    })
    
  } catch (error) {
    console.error('初始化数据失败:', error)
    ElMessage.error('初始化数据失败，请刷新页面重试')
  }
})

// 在组件即将卸载前清除定时器和样式
onBeforeUnmount(() => {
  console.log('Home组件即将卸载，清除所有样式和定时器')
  
  // 清除定时器
  if (checkTimer) {
    clearInterval(checkTimer)
    checkTimer = null
  }
  
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
  
  if (colorRefreshTimer) {
    clearInterval(colorRefreshTimer)
    colorRefreshTimer = null
  }
  
  // 立即清理所有表格和单元格的样式
  const tables = document.querySelectorAll('.el-table')
  tables.forEach(table => {
    const rows = table.querySelectorAll('tr')
    rows.forEach(row => {
      row.classList.remove('near-row', 'expired-row', 'left-row', 'urgent-row')
      if (row instanceof HTMLElement) {
        row.style.cssText = ''
      }
      
      const cells = row.querySelectorAll('td')
      cells.forEach(cell => {
        if (cell instanceof HTMLElement) {
          cell.style.cssText = ''
        }
      })
    })
  })
})

// 临时存储开检时间
const tempTicketTimes = reactive<Record<string, string>>({})

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

// 初始化车次开检时间
const initTempTicketTime = (trainNo: string) => {
  if (trainNo && !tempTicketTimes[trainNo]) {
    tempTicketTimes[trainNo] = getTicketTime(trainNo) || ''
  }
}

// 连接/断开喇叭设备
const handleConnectSpeaker = async () => {
  if (speakerStatus.value.connected) {
    disconnectSpeaker()
    ElMessage.info('已断开喇叭设备连接')
  } else {
    const connected = await connectSpeaker()
    if (connected) {
      ElMessage.success('喇叭设备连接成功')
    } else {
      ElMessage.error(`喇叭设备连接失败: ${speakerStatus.value.error || '未知错误'}`)
    }
  }
}

// 播报开检提醒
const handleAnnounce = async (passenger: Passenger) => {
  const train = trainStore.getTrainByNo(passenger.trainNo)
  if (!train) {
    ElMessage.error(`找不到车次 ${passenger.trainNo} 的信息`)
    return
  }
  
  const success = await announceTicketCheck(passenger.trainNo, passenger.cardNo)
  if (success) {
    ElMessage.success(`正在播报：${passenger.cardNo}号牌的旅客，请注意，${passenger.trainNo}次列车准备开检`)
  } else {
    ElMessage.error('播报失败，请检查喇叭设备连接')
  }
}

// 重写handleSubmit函数，在成功提交后立即刷新数据
const handleSubmit = async () => {
  try {
    await originalHandleSubmit()
    
    setTimeout(async () => {
      await updateTodayPassengers(true)
      debouncedUpdateStyles()
      lastRefreshTime.value = new Date()
      ElMessage.success('数据已刷新，显示最新添加的旅客')
    }, 300)
  } catch (error) {
    console.error('提交表单失败:', error)
  }
}

// 播报自定义内容
const handleCustomAnnounce = async () => {
  if (!customAnnouncementText.value.trim()) {
    ElMessage.warning('播报内容不能为空')
    return
  }

  const success = await announceCustom(customAnnouncementText.value)
  if (success) {
    ElMessage.success('正在播报自定义内容')
    announcementDialogVisible.value = false
    customAnnouncementText.value = ''
  } else {
    ElMessage.error('播报失败，请检查喇叭设备连接')
  }
}

// 添加离厅处理函数
const handleMarkAsLeft = (row: Passenger): void => {
  ElMessageBox.confirm('确认该旅客已离厅？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const passenger = passengerStore.passengerList.find(p => p.id === row.id)
      
      if (passenger) {
        passengerStore.updatePassenger(passenger.id, {
          ...passenger,
          isServed: true
        })
        
        await updateTodayPassengers(true)
        debouncedUpdateStyles()
        lastRefreshTime.value = new Date()
        ElMessage.success('已标记为离厅')
      } else {
        ElMessage.error('未找到该旅客记录')
      }
    } catch (error) {
      console.error('标记离厅失败:', error)
      ElMessage.error('标记离厅失败')
    }
  }).catch(() => {
    // 用户取消操作，不做处理
  })
}

// 日期格式化函数 - 将YYYY-MM-DD格式转为MM-DD格式
const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return '';
  
  // 检查是否已经是ISO格式(YYYY-MM-DD)
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // 只显示月和日（不显示年份）
    const parts = dateStr.split('-');
    return `${parts[1]}-${parts[2]}`;
  }
  
  return dateStr;
}

// 处理音频设备选择
const handleSelectDevice = async (command: string) => {
  if (command === 'refresh') {
    // 刷新设备列表
    await getAudioDevices()
    ElMessage.success('设备列表已刷新')
    return
  }
  
  // 连接选中的设备
  const success = await connectSpecificSpeaker(command)
  if (success) {
    const device = audioDevices.value.find(d => d.deviceId === command)
    ElMessage.success(`已连接到设备: ${device?.label || command}`)
  } else {
    ElMessage.error('连接设备失败')
  }
}

// 获取需要提醒的旅客列表（临近开检时间的旅客）
const getAlertPassengers = () => {
  // 获取今天日期
  const today = new Date().toISOString().split('T')[0]
  
  // 计算明天的日期
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  
  // 首先获取今日需要提醒的旅客
  const todayAlertPassengers = todayPassengers.value.filter(passenger => 
    passenger.date === today &&
    isNearTicketTime(passenger.trainNo) && 
    !isExpiredTicketTime(passenger.trainNo, passenger.date) &&
    !passenger.isServed
  )
  
  // 创建ID集合用于去重
  const alertPassengerIds = new Set(todayAlertPassengers.map(p => p.id))
  
  // 获取明日凌晨需要提醒的旅客（确保不与今日重复）
  const tomorrowAlertPassengers = todayPassengers.value.filter(passenger => 
    passenger.date === tomorrowStr &&
    isEarlyMorningTicketTime(passenger.trainNo) &&
    isNearTicketTime(passenger.trainNo) &&
    !isExpiredTicketTime(passenger.trainNo, passenger.date) &&
    !passenger.isServed &&
    !alertPassengerIds.has(passenger.id)  // 确保不重复
  )
  
  // 合并并返回所有需要提醒的旅客
  return [...todayAlertPassengers, ...tomorrowAlertPassengers]
}

// 监控开检提醒列表变化，自动进行播报
// 保存已播报的旅客记录，避免重复播报
const announcedPassengers = reactive<Record<string, boolean>>({})

// 检查是否有新的开检提醒，并自动播报
const checkNewAlerts = async () => {
  console.log('检查新的开检提醒...')
  const alertPassengers = getAlertPassengers()
  console.log('发现需要提醒的旅客:', alertPassengers.length)
  
  // 遍历开检提醒列表，找到尚未播报过的旅客
  for (const passenger of alertPassengers) {
    const key = `${passenger.trainNo}-${passenger.cardNo}-${passenger.date}`
    
    // 如果该旅客尚未播报，则进行播报
    if (!announcedPassengers[key]) {
      // 标记为已播报
      announcedPassengers[key] = true
      
      // 自动播报
      if (speakerStatus.value.connected) {
        // 获取车次类型
        const { type } = getTrainTypeAndRemindTime(passenger.trainNo)
        console.log(`正在自动播报(${type}列车):`, passenger.cardNo, passenger.trainNo)
        
        await announceTicketCheck(passenger.trainNo, passenger.cardNo)
        ElMessage.success(`自动播报(${type}): ${passenger.cardNo}号牌的旅客，请注意，${passenger.trainNo}次列车准备开检`)
      } else {
        console.log('喇叭未连接，无法自动播报')
      }
    }
  }
}

// 修改表格配置
const tableConfig = {
  rowKey: 'id',
  border: true,
  stripe: false,
  highlightCurrentRow: true,
  size: 'default',
  fit: true,
  showHeader: true,
  showOverflowTooltip: true,
  emptyText: '暂无数据'
}

// 在组件卸载时确保清除定时器
onUnmounted(() => {
  console.log('Home组件已卸载')
  
  // 清除任何可能残留的定时器
  if (checkTimer) {
    clearInterval(checkTimer)
    checkTimer = null
  }
  
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
  
  if (colorRefreshTimer) {
    clearInterval(colorRefreshTimer)
    colorRefreshTimer = null
  }
})
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

.time-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.refresh-tag {
  font-size: 12px;
}

.welcome-content {
  padding: 20px 0;
}

.notification-card {
  margin-bottom: 20px;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notification-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notification-content {
  padding: 16px 0;
}

.passenger-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #ebeef5;
}

.passenger-item:last-child {
  border-bottom: none;
}

.passenger-info {
  display: flex;
  gap: 16px;
  align-items: center;
}

.announce-btn {
  padding: 4px 8px;
  margin-left: auto;
}

.empty-data {
  text-align: center;
  color: #909399;
  padding: 20px 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  height: 32px;
}

.card-header span {
  font-size: 16px;
  font-weight: bold;
}

.button-group-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.el-button-group {
  position: absolute;
  right: 0;
}

.el-statistic {
  text-align: center;
}

/* 开检时间显示样式 */
.time-box {
  padding: 2px 5px;
  border-radius: 4px;
  display: inline-block;
  cursor: pointer;
}

.edit-time {
  background-color: #ecf5ff;
  color: #409eff;
  border: 1px solid #d9ecff;
}

.notification-container {
  display: none;
}

/* 整行状态颜色 - 限定在首页表格中 */
.home :deep(.urgent-row) {
  background-color: #F3CC62 !important;
}

.home :deep(.near-row) {
  background-color: #FFD700 !important;
  font-weight: 700 !important;
  color: #333 !important;
  animation: none !important;
}

.home :deep(.expired-row) {
  background-color: #fef0f0 !important;
  color: #f56c6c !important;
  animation: none !important;
}

.home :deep(.left-row) {
  background-color: #f5f7fa !important;
  color: #909399 !important;
}

/* 添加终到车样式 */
.home .terminal-train {
  background-color: #e1f3d8 !important;
  color: #67c23a !important;
  border: 1px solid #c2e7b0;
  font-weight: bold;
  text-align: center;
  padding: 2px 5px;
  border-radius: 4px;
}

/* 特殊处理K213, T231, D6852等终到车 */
.home :deep(tr[class*='expired-row']) {
  animation: none !important;
  background-color: #fef0f0 !important;
  transition: none !important;
}

/* 确保终到车行的每个单元格都正确显示红色背景 */
.home :deep(tr[class*='expired-row']) > td {
  background-color: #fef0f0 !important;
  animation: none !important;
  transition: none !important;
}

/* 专门处理终到车文字，确保不会闪烁 */
.home :deep(tr[class*='expired-row']) .terminal-train {
  background-color: #fef0f0 !important;
  color: #f56c6c !important;
  border-color: #fbc4c4 !important;
  animation: none !important;
  transition: none !important;
}

/* 确保所有终到车标签在过期行中不闪烁，优先级更高 */
.home :deep(tr.expired-row) .terminal-train,
.home :deep(tr.expired-row) td:nth-child(9) .terminal-train,
.home :deep(tr.el-table__row--striped.expired-row) .terminal-train {
  background-color: #fef0f0 !important;
  color: #f56c6c !important;
  border-color: #fbc4c4 !important;
  animation: none !important;
  transition: none !important;
}

/* 禁用表格的条纹样式，防止与行状态颜色冲突 */
.home :deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: inherit;
}

@media screen and (max-width: 1600px) {
  .notification-container {
    width: 250px;
  }
  
  .home :deep(.el-table) {
    font-size: 13px;
  }
  
  .home :deep(.el-button) {
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

.upload-demo {
  margin: 0;
}

.upload-demo :deep(.el-upload) {
  display: block;
}

.home :deep(.el-upload--text) {
  margin: 0;
}

.home :deep(.el-upload-list) {
  display: none;
}

.sort-info {
  margin-bottom: 15px;
}

.sort-info .el-alert {
  border-radius: 4px;
}

.sort-info .el-alert__title {
  font-size: 13px;
}
</style> 