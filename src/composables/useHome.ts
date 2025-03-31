import { ref, onMounted, onUnmounted } from 'vue'
import { usePassengerStore } from '../store/passenger'
import { useTrainStore } from '../store/train'
import { ElNotification, ElMessageBox, ElMessage } from 'element-plus'
import type { Passenger, PassengerForm } from '../types/passenger'
import type { Train } from '../store/train'
import { PassengerType, PageType } from '../types/passenger'
import type { UploadFile } from 'element-plus'
import * as XLSX from 'xlsx'

export function useHome() {
  const passengerStore = usePassengerStore()
  const trainStore = useTrainStore()

  const currentTime = ref(new Date().toLocaleDateString())
  const dialogVisible = ref(false)
  const currentTrain = ref<Train | null>(null)

  // 统计数据
  const passengerCount = ref(0)
  const servedCount = ref(0)

  // 今日旅客列表
  const todayPassengers = ref<Passenger[]>([])

  // 新增旅客相关
  const addDialogVisible = ref(false)
  const formRef = ref()
  const form = ref<PassengerForm>({
    date: new Date().toISOString().split('T')[0],
    trainNo: '',
    name: '',
    service: '',
    phone: '',
    staffName: '',
    companions: 0,
    cardNo: '',
    remark: '',
    source: 'offline',
  })
  const isEdit = ref(false)
  const editId = ref<number | null>(null)

  const rules = {
    date: [{ required: true, message: '请选择日期', trigger: 'change' }],
    trainNo: [{ required: true, message: '请选择车次', trigger: 'change' }],
    name: [{ required: false, message: '请输入姓名', trigger: 'blur' }],
    service: [],
    phone: [{ required: false, message: '请输入联系电话', trigger: 'blur' }],
    staffName: [{ required: false, message: '请输入服务工作人员姓名', trigger: 'blur' }],
    cardNo: [
      { required: true, message: '请输入牌号', trigger: 'blur' },
      {
        validator: (rule: any, value: string, callback: Function) => {
          if (value) {
            const today = new Date().toISOString().split('T')[0]
            const isDuplicate = passengerStore.passengerList.some(passenger => 
              passenger.cardNo === value && 
              passenger.date === today && 
              !passenger.isServed &&
              passenger.id !== editId.value
            )
            if (isDuplicate) {
              callback(new Error('该牌号今日已存在'))
            } else {
              callback()
            }
          } else {
            callback()
          }
        },
        trigger: 'blur'
      }
    ]
  }

  // 获取车次的开检时间
  const getTicketTime = (trainNo: string): string => {
    const train = trainStore.getTrainByNo(trainNo)
    if (!train || !train.ticketTime) return ''
    
    // 如果是ISO格式的时间字符串，提取时间部分
    if (typeof train.ticketTime === 'string' && train.ticketTime.includes('T')) {
      return train.ticketTime.split('T')[1].substring(0, 5)
    }
    
    // 如果已经是正确的时间格式（HH:mm），直接返回
    if (typeof train.ticketTime === 'string' && /^\d{2}:\d{2}$/.test(train.ticketTime)) {
      return train.ticketTime
    }
    
    // 处理数字格式的时间（Excel时间格式）
    if (typeof train.ticketTime === 'number') {
      const totalMinutes = Math.round(train.ticketTime * 24 * 60)
      const hours = Math.floor(totalMinutes / 60) % 24
      const minutes = totalMinutes % 60
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }
    
    return ''
  }

  // 检查车次是否在次日凌晨0-1点之间开检
  const isEarlyMorningTicketTime = (trainNo: string): boolean => {
    const ticketTime = getTicketTime(trainNo)
    if (!ticketTime) return false
    
    const [hours] = ticketTime.split(':').map(Number)
    return hours >= 0 && hours < 1 // 0点到1点之间
  }

  // 检查是否临近开检时间
  const isNearTicketTime = (trainNo: string): boolean => {
    const ticketTime = getTicketTime(trainNo)
    if (!ticketTime) return false
    
    const now = new Date()
    const [hours, minutes] = ticketTime.split(':').map(Number)
    const ticketDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)
    
    // 计算时间差（分钟）
    const diffMinutes = (ticketDateTime.getTime() - now.getTime()) / (1000 * 60)
    
    // 获取车次类型和提醒时间
    const { remindMinutes } = getTrainTypeAndRemindTime(trainNo)
    
    return diffMinutes > 0 && diffMinutes <= remindMinutes
  }

  // 检查是否已过开检时间
  const isExpiredTicketTime = (trainNo: string, passengerDate?: string): boolean => {
    const ticketTime = getTicketTime(trainNo)
    if (!ticketTime) return false
    
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    // 如果提供了旅客日期，且该日期不是今天，则不算过期
    if (passengerDate && passengerDate !== today) {
      return false; // 未来日期的车次不算过期
    }
    
    const [hours, minutes] = ticketTime.split(':').map(Number)
    const ticketDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)
    
    // 计算时间差（分钟）
    const diffMinutes = (ticketDateTime.getTime() - now.getTime()) / (1000 * 60)
    return diffMinutes < 0
  }

  // 获取车次类型和提醒时间
  const getTrainTypeAndRemindTime = (trainNo: string): { type: string, remindMinutes: number } => {
    const train = trainStore.getTrainByNo(trainNo)
    if (!train) return { type: 'unknown', remindMinutes: 20 }

    // 获取运行区间1和运行区间2
    const route1 = train.route || ''
    const route2 = train.route2 || ''
    
    // 判断车次类型
    if (route1 === '西安') {
      // 始发车
      if (trainNo.startsWith('T') || trainNo.startsWith('K')) {
        return { type: '始发车', remindMinutes: 30 }
      } else if (trainNo.startsWith('C')) {
        return { type: '始发车', remindMinutes: 20 }
      } else if (trainNo.startsWith('D')) {
        return { type: '始发车', remindMinutes: 30 }
      }
      return { type: '始发车', remindMinutes: 20 } // 其他始发车默认20分钟
    } 
    
    if (route2 === '西安') {
      // 终到车 - 不需要开检提醒
      return { type: '终到车', remindMinutes: 0 }
    } 
    
    // 如果运行区间1和运行区间2都不是西安，则为通过车
    return { type: '通过车', remindMinutes: 3 }
  }

  // 更新今日旅客列表
  const updateTodayPassengers = () => {
    const today = new Date().toISOString().split('T')[0]
    console.log('更新今日旅客列表，当前日期:', today)
    
    // 计算明天的日期
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    // 获取所有未服务的今日和明天凌晨的旅客
    const allPassengers = passengerStore.passengerList
    console.log('所有旅客数据:', allPassengers.length, '条')
    
    const passengers = allPassengers.filter(p => {
      const isToday = p.date === today
      const isTomorrowEarlyMorning = p.date === tomorrowStr && isEarlyMorningTicketTime(p.trainNo)
      const isNotServed = !p.isServed
      
      console.log(`旅客 ${p.name} (${p.trainNo}): 日期=${p.date}, 已服务=${p.isServed}, 是今天=${isToday}, 是明天凌晨=${isTomorrowEarlyMorning}, 未服务=${isNotServed}`)
      
      return (isToday || isTomorrowEarlyMorning) && isNotServed
    })
    
    console.log('筛选后的今日旅客:', passengers.length, '条')
    
    // 按优先级排序：没有开检时间 > 临近开检时间 > 未过开检第二天凌晨 > 已经过了开检时间 > 按日期排序
    todayPassengers.value = passengers.sort((a, b) => {
      // 首先按日期排序
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date); // 较早的日期排在前面
      }
      
      const timeA = getTicketTime(a.trainNo)
      const timeB = getTicketTime(b.trainNo)
      
      // 如果有一个没有开检时间
      if (!timeA && !timeB) return 0
      if (!timeA) return -1 // a没有开检时间，排在前面
      if (!timeB) return 1  // b没有开检时间，排在前面
      
      // 检查是否临近或已过开检时间
      const isNearA = isNearTicketTime(a.trainNo)
      const isNearB = isNearTicketTime(b.trainNo)
      const isExpiredA = isExpiredTicketTime(a.trainNo, a.date)
      const isExpiredB = isExpiredTicketTime(b.trainNo, b.date)
      
      // 检查是否为第二天凌晨车次
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const isTomorrowA = a.date !== today && isEarlyMorningTicketTime(a.trainNo)
      const isTomorrowB = b.date !== today && isEarlyMorningTicketTime(b.trainNo)
      
      // 优先级1：临近开检时间
      if (isNearA && !isNearB) return -1  // a临近开检，排在前面
      if (!isNearA && isNearB) return 1   // b临近开检，排在前面
      
      // 优先级2：未过开检第二天凌晨
      if (isTomorrowA && !isTomorrowB) return -1 // a是未过开检第二天凌晨，排在前面
      if (!isTomorrowA && isTomorrowB) return 1  // b是未过开检第二天凌晨，排在前面
      
      // 优先级3：已过开检时间
      if (isExpiredA && !isExpiredB) return 1  // a已过期，b未过期，b排前面
      if (!isExpiredA && isExpiredB) return -1 // a未过期，b已过期，a排前面
      
      // 都是同一状态，按开检时间排序
      return timeA.localeCompare(timeB)
    })
    
    console.log('最终显示的今日旅客列表:', todayPassengers.value.length, '条')
  }

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

  // 显示车次详情
  const showTrainInfo = (trainNo: string): void => {
    const train = trainStore.getTrainByNo(trainNo)
    currentTrain.value = train || null
    dialogVisible.value = true
  }

  // 刷新数据
  const refreshData = (): void => {
    currentTime.value = new Date().toLocaleDateString()
  }

  // 检查并发送提醒
  const activeNotifications = ref(new Set<string>())

  const checkAndNotify = (): void => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    // 计算明天的日期
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    // 筛选当天和次日凌晨的未服务旅客
    const passengers = passengerStore.passengerList.filter(p => 
      (p.date === today || (p.date === tomorrowStr && isEarlyMorningTicketTime(p.trainNo))) && 
      !p.isServed
    )
    
    // 清除所有现有的提醒
    const notifications = document.querySelectorAll('.urgent-notification')
    notifications.forEach(notification => {
      ;(notification as HTMLElement).remove()
    })
    activeNotifications.value.clear()

    // 获取提醒容器
    const container = document.querySelector('.notification-content')
    if (!container) return
    
    // 按开检优先级排序，确保提醒顺序稳定
    const sortedPassengers = passengers.sort((a, b) => {
      // 首先按日期排序
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date); // 较早的日期排在前面
      }
      
      const timeA = getTicketTime(a.trainNo)
      const timeB = getTicketTime(b.trainNo)
      
      // 如果有一个没有开检时间
      if (!timeA && !timeB) return 0
      if (!timeA) return -1 // a没有开检时间，排在前面
      if (!timeB) return 1  // b没有开检时间，排在前面
      
      // 检查是否临近或已过开检时间
      const isNearA = isNearTicketTime(a.trainNo)
      const isNearB = isNearTicketTime(b.trainNo)
      const isExpiredA = isExpiredTicketTime(a.trainNo, a.date)
      const isExpiredB = isExpiredTicketTime(b.trainNo, b.date)
      
      // 检查是否为第二天凌晨车次
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const isTomorrowA = a.date !== today && isEarlyMorningTicketTime(a.trainNo)
      const isTomorrowB = b.date !== today && isEarlyMorningTicketTime(b.trainNo)
      
      // 优先级1：临近开检时间
      if (isNearA && !isNearB) return -1  // a临近开检，排在前面
      if (!isNearA && isNearB) return 1   // b临近开检，排在前面
      
      // 优先级2：未过开检第二天凌晨
      if (isTomorrowA && !isTomorrowB) return -1 // a是未过开检第二天凌晨，排在前面
      if (!isTomorrowA && isTomorrowB) return 1  // b是未过开检第二天凌晨，排在前面
      
      // 优先级3：已过开检时间
      if (isExpiredA && !isExpiredB) return 1  // a已过期，b未过期，b排前面
      if (!isExpiredA && isExpiredB) return -1 // a未过期，b已过期，a排前面
      
      // 都是同一状态，按开检时间排序
      return timeA.localeCompare(timeB)
    })
    
    sortedPassengers.forEach((passenger) => {
      const ticketTime = getTicketTime(passenger.trainNo)
      if (!ticketTime) return
      
      const [hours, minutes] = ticketTime.split(':').map(Number)
      const ticketDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)
      
      // 计算时间差（分钟）
      const diffMinutes = (ticketDateTime.getTime() - now.getTime()) / (1000 * 60)
      
      // 获取车次类型和提醒时间
      const { type, remindMinutes } = getTrainTypeAndRemindTime(passenger.trainNo)
      
      // 如果时间差在提醒时间内且未过期，发送提醒
      if (diffMinutes > 0 && diffMinutes <= remindMinutes) {
        const notificationId = `ticket-check-${passenger.id}`
        activeNotifications.value.add(notificationId)
        
        const notification = document.createElement('div')
        notification.className = `urgent-notification notification-${notificationId}`
        notification.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 6px; background-color: #fef0f0; border-radius: 3px; border: 1px solid #f56c6c; margin-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="color: #f56c6c; font-size: 12px;">⚠️</span>
              <span style="color: #f56c6c; font-size: 12px; font-weight: bold;">旅客开检提醒</span>
              <span style="color: #f56c6c; font-size: 12px;">[${type}]</span>
            </div>
            <div class="close-btn" style="cursor: pointer; font-size: 12px; color: #f56c6c;">×</div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; padding: 0 4px; margin-bottom: 4px;">
            <div style="font-size: 11px;">
              <span style="color: #606266;">车次：</span>
              <span style="color: #f56c6c; font-weight: bold;">${passenger.trainNo}</span>
            </div>
            <div style="font-size: 11px;">
              <span style="color: #606266;">旅客：</span>
              <span style="font-weight: bold;">${passenger.name}</span>
            </div>
            <div style="font-size: 11px;">
              <span style="color: #606266;">号牌：</span>
              <span style="font-weight: bold;">${passenger.cardNo}</span>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; padding: 0 4px;">
            <div style="font-size: 11px;">
              <span style="color: #606266;">开检时间：</span>
              <span style="color: #f56c6c; font-weight: bold;">${ticketTime}</span>
            </div>
            <div style="font-size: 11px;">
              <span style="color: #606266;">距离开检：</span>
              <span style="color: #f56c6c; font-weight: bold;">${Math.round(diffMinutes)}分钟</span>
            </div>
          </div>
        `
        
        // 添加关闭按钮事件
        notification.querySelector('.close-btn')?.addEventListener('click', () => {
          notification.remove()
          activeNotifications.value.delete(notificationId)
        })
        
        container.appendChild(notification)
      }
    })
  }

  let checkInterval: number | undefined
  let updateInterval: number | undefined

  // 更新统计数据
  const updateStatistics = (): void => {
    const today = new Date().toISOString().split('T')[0]
    
    // 计算明天的日期
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    // 统计今日旅客（包括明天凌晨0-1点的旅客）
    const todayHomePassengers = passengerStore.passengerList.filter(p => 
      (p.date === today || (p.date === tomorrowStr && isEarlyMorningTicketTime(p.trainNo))) && 
      p.isServed === false
    )
    passengerCount.value = todayHomePassengers.length
    
    // 统计已服务旅客
    servedCount.value = passengerStore.passengerList.filter(p => 
      (p.date === today || (p.date === tomorrowStr && isEarlyMorningTicketTime(p.trainNo))) && 
      p.isServed
    ).length
  }

  // 页面加载时启动定时检查
  onMounted(() => {
    // 每分钟更新时间
    setInterval(() => {
      currentTime.value = new Date().toLocaleDateString()
    }, 60000)
    
    // 每1分钟检查一次开检时间（改为更频繁的检查以确保及时清除过期提醒）
    checkInterval = window.setInterval(checkAndNotify, 60 * 1000)
    
    // 每5秒更新一次页面数据
    updateInterval = window.setInterval(() => {
      // 强制更新当前时间
      currentTime.value = new Date().toLocaleDateString()
      // 更新统计数据
      updateStatistics()
      // 更新今日旅客列表
      updateTodayPassengers()
    }, 5000)
    
    // 立即执行一次更新
    updateStatistics()
    updateTodayPassengers()
    // 立即执行一次检查
    checkAndNotify()
  })

  // 页面卸载时清除定时器和提醒
  onUnmounted(() => {
    if (checkInterval) {
      window.clearInterval(checkInterval)
    }
    if (updateInterval) {
      window.clearInterval(updateInterval)
    }
    // 清除所有提醒
    const notifications = document.querySelectorAll('.el-notification')
    notifications.forEach(notification => {
      ;(notification as HTMLElement).style.display = 'none'
    })
    activeNotifications.value.clear()
  })

  // 获取行的类名
  const getRowClassName = ({ row }: { row: Passenger }): string => {
    if (isNearTicketTime(row.trainNo)) {
      return 'urgent-row'
    } else if (isExpiredTicketTime(row.trainNo, row.date)) {
      return 'expired-row'
    }
    return ''
  }

  // 处理离厅
  const handleMarkAsLeft = (row: Passenger): void => {
    ElMessageBox.confirm('确认该旅客已离厅？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      // 查找历史记录中是否存在该旅客
      const passenger = passengerStore.passengerList.find(p => 
        p.service === row.service && 
        p.trainNo === row.trainNo && 
        p.name === row.name && 
        p.cardNo === row.cardNo
      )
      
      if (passenger) {
        // 如果存在，更新状态为已服务
        passengerStore.updatePassenger(passenger.id, {
          ...passenger,
          isServed: true
        })
      } else {
        // 如果不存在，创建新记录
        const newPassenger = {
          ...row,
          isServed: true
        }
        passengerStore.addPassenger(newPassenger)
      }

      // 清除该旅客的提醒
      const notificationId = `ticket-check-${row.id}`
      const notification = document.querySelector(`[data-notification-id="${notificationId}"]`)
      if (notification) {
        ;(notification as HTMLElement).style.display = 'none'
        activeNotifications.value.delete(notificationId)
      }
      
      ElMessage.success('已记录离厅旅客')
      // 刷新数据
      updateTodayPassengers()
      updateStatistics()
      // 重新检查并更新提醒
      checkAndNotify()
    })
  }

  // 处理编辑
  const handleEdit = (row: Passenger): void => {
    isEdit.value = true
    editId.value = row.id
    form.value = {
      date: row.date,
      trainNo: row.trainNo,
      name: row.name,
      service: row.service,
      phone: row.phone,
      staffName: row.staffName,
      companions: row.companions,
      cardNo: row.cardNo,
      remark: row.remark,
      source: row.source
    }
    addDialogVisible.value = true
  }

  const handleAdd = (): void => {
    isEdit.value = false
    editId.value = null
    form.value = {
      date: new Date().toISOString().split('T')[0],
      trainNo: '',
      name: '',
      service: '',
      phone: '',
      staffName: '',
      companions: 0,
      cardNo: '',
      remark: '',
      source: 'offline'
    }
    addDialogVisible.value = true
  }

  const handleSubmit = async (): Promise<void> => {
    if (!formRef.value) return
    
    await formRef.value.validate(async (valid: boolean) => {
      if (valid) {
        let newPassenger;
        
        if (isEdit.value && editId.value) {
          // 编辑现有旅客
          newPassenger = {
            ...form.value,
            id: editId.value,
            isServed: false
          }
          await passengerStore.updatePassenger(editId.value, newPassenger)
          ElMessage.success('编辑成功')
        } else {
          // 添加新旅客
          newPassenger = {
            ...form.value,
            isServed: false
          }
          const newPassengerId = await passengerStore.addPassenger(newPassenger)
          newPassenger.id = newPassengerId
          ElMessage.success('添加成功')
        }
        
        addDialogVisible.value = false
        
        // 立即刷新数据和提醒
        await Promise.all([
          updateTodayPassengers(),
          updateStatistics()
        ])
        
        // 使用 requestAnimationFrame 确保在下一帧立即刷新提醒
        requestAnimationFrame(() => {
          // 清除所有现有的提醒
          const notifications = document.querySelectorAll('.urgent-notification')
          notifications.forEach(notification => {
            ;(notification as HTMLElement).remove()
          })
          activeNotifications.value.clear()
          
          // 重新检查并显示所有需要提醒的旅客
          const now = new Date()
          const today = now.toISOString().split('T')[0]
          
          // 计算明天的日期
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          const tomorrowStr = tomorrow.toISOString().split('T')[0]
          
          // 筛选今日和次日凌晨的未服务旅客
          const passengers = passengerStore.passengerList.filter(p => 
            (p.date === today || (p.date === tomorrowStr && isEarlyMorningTicketTime(p.trainNo))) && 
            !p.isServed
          )
          
          // 获取提醒容器
          const container = document.querySelector('.notification-content')
          if (!container) return
          
          // 按开检优先级排序，确保提醒顺序稳定
          const sortedPassengers = passengers.sort((a, b) => {
            // 首先按日期排序
            if (a.date !== b.date) {
              return a.date.localeCompare(b.date); // 较早的日期排在前面
            }
            
            const timeA = getTicketTime(a.trainNo)
            const timeB = getTicketTime(b.trainNo)
            
            // 如果有一个没有开检时间
            if (!timeA && !timeB) return 0
            if (!timeA) return -1 // a没有开检时间，排在前面
            if (!timeB) return 1  // b没有开检时间，排在前面
            
            // 检查是否临近或已过开检时间
            const isNearA = isNearTicketTime(a.trainNo)
            const isNearB = isNearTicketTime(b.trainNo)
            const isExpiredA = isExpiredTicketTime(a.trainNo, a.date)
            const isExpiredB = isExpiredTicketTime(b.trainNo, b.date)
            
            // 检查是否为第二天凌晨车次
            const now = new Date()
            const today = now.toISOString().split('T')[0]
            const isTomorrowA = a.date !== today && isEarlyMorningTicketTime(a.trainNo)
            const isTomorrowB = b.date !== today && isEarlyMorningTicketTime(b.trainNo)
            
            // 优先级1：临近开检时间
            if (isNearA && !isNearB) return -1  // a临近开检，排在前面
            if (!isNearA && isNearB) return 1   // b临近开检，排在前面
            
            // 优先级2：未过开检第二天凌晨
            if (isTomorrowA && !isTomorrowB) return -1 // a是未过开检第二天凌晨，排在前面
            if (!isTomorrowA && isTomorrowB) return 1  // b是未过开检第二天凌晨，排在前面
            
            // 优先级3：已过开检时间
            if (isExpiredA && !isExpiredB) return 1  // a已过期，b未过期，b排前面
            if (!isExpiredA && isExpiredB) return -1 // a未过期，b已过期，a排前面
            
            // 都是同一状态，按开检时间排序
            return timeA.localeCompare(timeB)
          })
          
          sortedPassengers.forEach((passenger) => {
            const ticketTime = getTicketTime(passenger.trainNo)
            if (!ticketTime) return
            
            const [hours, minutes] = ticketTime.split(':').map(Number)
            const ticketDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)
            const diffMinutes = (ticketDateTime.getTime() - now.getTime()) / (1000 * 60)
            
            // 获取车次类型和提醒时间
            const { type, remindMinutes } = getTrainTypeAndRemindTime(passenger.trainNo)
            
            // 如果时间差在提醒时间内且未过期，发送提醒
            if (diffMinutes > 0 && diffMinutes <= remindMinutes) {
              const notification = document.createElement('div')
              notification.className = `urgent-notification notification-${passenger.id}`
              notification.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 6px; background-color: #fef0f0; border-radius: 3px; border: 1px solid #f56c6c; margin-bottom: 4px;">
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <span style="color: #f56c6c; font-size: 12px;">⚠️</span>
                    <span style="color: #f56c6c; font-size: 12px; font-weight: bold;">旅客开检提醒</span>
                    <span style="color: #f56c6c; font-size: 12px;">[${type}]</span>
                  </div>
                  <div class="close-btn" style="cursor: pointer; font-size: 12px; color: #f56c6c;">×</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; padding: 0 4px; margin-bottom: 4px;">
                  <div style="font-size: 11px;">
                    <span style="color: #606266;">车次：</span>
                    <span style="color: #f56c6c; font-weight: bold;">${passenger.trainNo}</span>
                  </div>
                  <div style="font-size: 11px;">
                    <span style="color: #606266;">旅客：</span>
                    <span style="font-weight: bold;">${passenger.name}</span>
                  </div>
                  <div style="font-size: 11px;">
                    <span style="color: #606266;">号牌：</span>
                    <span style="font-weight: bold;">${passenger.cardNo}</span>
                  </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; padding: 0 4px;">
                  <div style="font-size: 11px;">
                    <span style="color: #606266;">开检时间：</span>
                    <span style="color: #f56c6c; font-weight: bold;">${ticketTime}</span>
                  </div>
                  <div style="font-size: 11px;">
                    <span style="color: #606266;">距离开检：</span>
                    <span style="color: #f56c6c; font-weight: bold;">${Math.round(diffMinutes)}分钟</span>
                  </div>
                </div>
              `
              
              notification.querySelector('.close-btn')?.addEventListener('click', () => {
                notification.remove()
                activeNotifications.value.delete(`ticket-check-${passenger.id}`)
              })
              
              container.insertBefore(notification, container.firstChild)
              activeNotifications.value.add(`ticket-check-${passenger.id}`)
            }
          })
        })
      }
    })
  }

  // 处理开检时间变更
  const handleTicketTimeChange = (trainNoOrTime: string, newTime?: string): void => {
    // 兼容旧版使用方式
    if (!newTime) {
      if (!currentTrain.value) return
      
      // 更新时间
      currentTrain.value.ticketTime = trainNoOrTime
      
      // 更新车次信息
      trainStore.updateTrain(currentTrain.value.id, currentTrain.value)
      
      // 关闭对话框
      dialogVisible.value = false
    } else {
      // 新版使用方式：直接传入车次号和时间
      const train = trainStore.getTrainByNo(trainNoOrTime)
      if (!train) {
        ElMessage.warning('未找到对应车次信息')
        return
      }
      
      // 更新时间
      train.ticketTime = newTime
      
      // 更新车次信息
      trainStore.updateTrain(train.id, train)
    }
    
    // 重新检查提醒
    checkAndNotify()
    
    // 刷新数据
    updateTodayPassengers()
    updateStatistics()
    
    ElMessage.success('开检时间更新成功')
  }

  // 处理日期格式的函数
  const formatDate = (dateValue: any): string => {
    if (!dateValue) return new Date().toISOString().split('T')[0]
    
    // 如果是字符串类型
    if (typeof dateValue === 'string') {
      // 处理 "YYYY.M.D" 格式
      const fullDateMatch = dateValue.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/)
      if (fullDateMatch) {
        const [_, year, month, day] = fullDateMatch
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
      
      // 处理 "M.D" 格式
      const shortDateMatch = dateValue.match(/^(\d{1,2})\.(\d{1,2})$/)
      if (shortDateMatch) {
        const [_, month, day] = shortDateMatch
        const year = new Date().getFullYear()
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
      
      // 处理 "M月D日" 格式
      const chineseDateMatch = dateValue.match(/^(\d{1,2})月(\d{1,2})日$/)
      if (chineseDateMatch) {
        const month = chineseDateMatch[1].padStart(2, '0')
        const day = chineseDateMatch[2].padStart(2, '0')
        const year = new Date().getFullYear()
        return `${year}-${month}-${day}`
      }
      
      // 如果已经是ISO格式，直接返回
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateValue
      }
    }
    
    // 处理数字格式的日期（Excel日期序列号）
    if (typeof dateValue === 'number') {
      if (dateValue > 1000) { // Excel日期序列号通常很大
        const jsDate = new Date((dateValue - 25569) * 24 * 60 * 60 * 1000)
        const year = jsDate.getFullYear()
        const month = (jsDate.getMonth() + 1).toString().padStart(2, '0')
        const day = jsDate.getDate().toString().padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      
      // 处理类似3.28这样的格式（转换为字符串后再处理）
      return formatDate(dateValue.toString())
    }
    
    // 如果是日期对象
    if (dateValue instanceof Date) {
      const year = dateValue.getFullYear()
      const month = (dateValue.getMonth() + 1).toString().padStart(2, '0')
      const day = dateValue.getDate().toString().padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    // 默认返回今天的日期
    return new Date().toISOString().split('T')[0]
  }

  const handleFileChange = (file: UploadFile) => {
    if (!file.raw) {
      ElMessage.warning('文件无效')
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          throw new Error('文件读取失败')
        }

        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: true,
          dateNF: 'yyyy-mm-dd',
          WTF: true
        })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        
        // 获取工作表的范围
        const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1')
        
        // 从第二行开始读取数据（跳过表头）
        let importedCount = 0
        const today = new Date().toISOString().split('T')[0]
        
        for (let R = 1; R <= range.e.r; ++R) {
          const row: any = {}
          
          // 读取日期（A列）
          const dateCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 0})]
          if (dateCell) {
            row.date = formatDate(dateCell.v)
          } else {
            row.date = today
          }
          
          // 读取车次（B列）
          const trainNoCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 1})]
          row.trainNo = trainNoCell ? String(trainNoCell.v || '').trim() : ''
          
          // 读取姓名（C列）
          const nameCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 2})]
          row.name = nameCell ? String(nameCell.v || '').trim() : ''
          
          // 读取服务（D列）
          const serviceCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 3})]
          row.service = serviceCell ? String(serviceCell.v || '').trim() : ''

          // 读取联系电话（E列）
          const phoneCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 4})]
          row.phone = phoneCell ? String(phoneCell.v || '').trim() : ''
          
          // 读取来源（F列）- 12306为线上，空白或其他值为线下
          const sourceCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 5})]
          const sourceValue = sourceCell ? String(sourceCell.v || '').trim() : '';
          row.source = sourceValue === '12306' ? 'online' : 'offline'
          
          // 读取备注（G列）
          const remarkCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 6})]
          row.remark = remarkCell ? String(remarkCell.v || '').trim() : ''

          // 设置默认值
          row.staffName = ''  // 服务人员字段必须为空字符串
          row.companions = 0
          row.cardNo = ''

          // 只添加有效的行（至少需要车次和姓名）
          if (row.trainNo && row.name) {
            // 创建新的对象，确保 staffName 为空字符串
            const passengerData = {
              date: row.date,
              trainNo: row.trainNo,
              name: row.name,
              service: row.service,
              phone: row.phone,
              staffName: '',  // 明确设置为空字符串
              companions: row.companions,
              cardNo: row.cardNo,
              remark: row.remark,
              source: row.source,
              isServed: false
            }
            
            console.log('准备导入的旅客数据:', passengerData)
            
            // 直接添加到 store
            await passengerStore.addPassenger(passengerData)
            importedCount++
          }
        }

        console.log(`成功导入 ${importedCount} 条旅客数据`)
        
        // 强制更新数据
        console.log('开始更新今日旅客列表...')
        await updateTodayPassengers()
        
        // 更新统计数据
        console.log('更新统计数据...')
        await updateStatistics()
        
        // 立即检查提醒
        console.log('检查提醒...')
        await checkAndNotify()
        
        // 强制刷新当前时间
        currentTime.value = new Date().toLocaleDateString()
        
        ElMessage.success(`成功导入 ${importedCount} 条旅客数据`)
      } catch (error) {
        console.error('导入失败:', error)
        ElMessage.error('数据导入失败，请检查文件格式是否正确')
      }
    }

    reader.readAsArrayBuffer(file.raw)
  }

  return {
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
    handleTicketTimeChange,
    handleFileChange,
    // 导出以下函数供视图中使用
    checkAndNotify,
    updateTodayPassengers,
    updateStatistics,
    isNearTicketTime,
    isExpiredTicketTime,
    isEarlyMorningTicketTime
  }
} 