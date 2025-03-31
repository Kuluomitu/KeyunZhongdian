// 旅客类型枚举
export enum PassengerType {
  MILITARY = '军',
  ELDERLY = '老',
  WEAK = '弱',
  SICK = '病',
  DISABLED = '残'
}

// 页面类型枚举
export enum PageType {
  HOME = 'home',
  PASSENGER = 'passenger'
}

// 旅客信息接口
export interface Passenger {
  id: number
  date: string
  trainNo: string
  name: string
  service: string
  phone: string
  staffName: string
  companions: number
  cardNo: string
  remark: string
  isServed: boolean
  source: 'online' | 'offline'
}

// 新增旅客表单接口
export interface PassengerForm {
  date: string
  trainNo: string
  name: string
  service: string
  phone: string
  staffName: string
  companions: number
  cardNo: string
  remark: string
  source: 'online' | 'offline'
}

// 旅客统计接口
export interface PassengerStats {
  total: number
  served: number
  unserved: number
  byType: Record<PassengerType, number>
} 