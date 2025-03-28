import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Passenger, PassengerForm, PageType } from '../types/passenger'

export const usePassengerStore = defineStore('passenger', () => {
  // 从localStorage获取初始数据
  const passengerList = ref<Passenger[]>(JSON.parse(localStorage.getItem('passengerList') || '[]'))

  // 监听数据变化，自动保存到localStorage
  watch(passengerList, (newList) => {
    localStorage.setItem('passengerList', JSON.stringify(newList))
  }, { deep: true })

  // 检查牌号是否重复
  const isCardNoDuplicate = (cardNo: string, excludeId?: number): boolean => {
    return passengerList.value.some(passenger => 
      passenger.cardNo === cardNo && 
      (excludeId === undefined || passenger.id !== excludeId)
    )
  }

  const addPassenger = (passenger: PassengerForm): Promise<number> => {
    // 获取当前最大ID
    const maxId = passengerList.value.length > 0 
      ? Math.max(...passengerList.value.map(p => p.id)) 
      : 0
    
    // 新ID为最大ID加1
    const newId = maxId + 1
    
    // 创建新旅客对象，始终设置isServed为false
    const newPassenger: Passenger = {
      ...passenger,
      id: newId,
      isServed: false // 确保新添加的旅客默认未服务
    }
    
    console.log('添加新旅客对象:', newPassenger)
    
    // 添加到列表
    passengerList.value.push(newPassenger)
    
    console.log('当前旅客列表:', passengerList.value)
    return Promise.resolve(newId)
  }

  const updatePassenger = (id: number, passenger: Partial<Passenger>): void => {
    const index = passengerList.value.findIndex(p => p.id === id)
    if (index !== -1) {
      passengerList.value[index] = {
        ...passengerList.value[index],
        ...passenger,
        id
      }
    }
  }

  const deletePassenger = (id: number): void => {
    const index = passengerList.value.findIndex(p => p.id === id)
    if (index !== -1) {
      passengerList.value.splice(index, 1)
    }
  }

  const getPassengersByTrainNo = (trainNo: string): Passenger[] => {
    return passengerList.value.filter(p => p.trainNo === trainNo)
  }

  // 获取指定页面的旅客列表
  const getPassengersByService = (service: string): Passenger[] => {
    return passengerList.value.filter(p => p.service === service)
  }
  const getAllPassengers = (): Passenger[] => {
    return passengerList.value
  }

  const clearAllPassengers = (): void => {
    passengerList.value = []
    localStorage.removeItem('passengerList')
  }

  return {
    passengerList,
    addPassenger,
    updatePassenger,
    deletePassenger,
    getPassengersByTrainNo,
    isCardNoDuplicate,
    getPassengersByService,
    getAllPassengers,
    clearAllPassengers
  }
}) 