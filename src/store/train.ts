import { defineStore } from 'pinia'
import { ref } from 'vue'

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

  return {
    trainList,
    addTrains,
    getTrainByNo,
    updateTrain
  }
}) 