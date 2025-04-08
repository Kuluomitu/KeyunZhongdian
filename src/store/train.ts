import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// 定义列车信息接口
export interface Train {
  id: number
  bureau: string
  trainNo: string
  route: string
  route2: string
  arrivalTime: string
  departureTime: string
  track: string
  platform: string
  stopTime: string
  trainType: string
  capacity: string
  formation: string
  ticketGate: string
  ticketTime: string
  ticketStaffTime: string
  platformStaffTime: string
  foldingTime: string
  waterService: string
  sewageService: string
  luggageService: string
  remark: string
}

export const useTrainStore = defineStore('train', () => {
  // 从localStorage获取初始数据
  const trainList = ref<Train[]>(JSON.parse(localStorage.getItem('trainList') || '[]'))

  // 监听数据变化，自动保存到localStorage
  watch(trainList, (newList) => {
    localStorage.setItem('trainList', JSON.stringify(newList))
  }, { deep: true })

  const addTrains = (trains: Omit<Train, 'id'>[]): void => {
    trainList.value = trains.map((train, index) => ({
      ...train,
      id: index + 1
    }))
    // 保存到localStorage
    localStorage.setItem('trainList', JSON.stringify(trainList.value))
  }

  const getTrainByNo = (trainNo: string): Train | undefined => {
    return trainList.value.find(train => train.trainNo === trainNo)
  }

  const updateTrain = (id: number, train: Train): void => {
    const index = trainList.value.findIndex(t => t.id === id)
    if (index !== -1) {
      trainList.value[index] = train
      // 保存到localStorage
      localStorage.setItem('trainList', JSON.stringify(trainList.value))
    }
  }

  // 清空所有车次数据
  const clearAllTrains = (): void => {
    trainList.value = []
    localStorage.removeItem('trainList')
  }

  // 更新列车开检时间
  const updateTrainTicketTime = (trainNo: string, ticketTime: string): void => {
    const train = trainList.value.find(t => t.trainNo === trainNo)
    if (train) {
      train.ticketTime = ticketTime
      // 保存到localStorage
      localStorage.setItem('trainList', JSON.stringify(trainList.value))
    }
  }

  // 更新列车到站时间
  const updateTrainArrivalTime = (trainNo: string, arrivalTime: string): void => {
    const train = trainList.value.find(t => t.trainNo === trainNo)
    if (train) {
      train.arrivalTime = arrivalTime
      // 保存到localStorage
      localStorage.setItem('trainList', JSON.stringify(trainList.value))
    }
  }

  return {
    trainList,
    addTrains,
    getTrainByNo,
    updateTrain,
    clearAllTrains,
    updateTrainTicketTime,
    updateTrainArrivalTime
  }
}) 