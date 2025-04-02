import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Staff, StaffForm } from '../types/staff'

const STORAGE_KEY = 'staff-list'

export const useStaffStore = defineStore('staff', () => {
  // 从localStorage初始化数据
  const savedStaff = localStorage.getItem(STORAGE_KEY)
  const savedNextId = localStorage.getItem(STORAGE_KEY + '-nextId')
  
  const staffList = ref<Staff[]>(savedStaff ? JSON.parse(savedStaff) : [])
  let nextId = savedNextId ? parseInt(savedNextId) : 1

  // 监听数据变化，自动保存到localStorage
  watch(
    staffList,
    (newList) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList))
      localStorage.setItem(STORAGE_KEY + '-nextId', nextId.toString())
    },
    { deep: true }
  )

  const addStaff = (staffForm: StaffForm) => {
    const staff: Staff = {
      id: nextId++,
      ...staffForm
    }
    staffList.value.push(staff)
  }

  const importStaffFromExcel = (data: any[]) => {
    // 清空现有数据
    staffList.value = []
    nextId = 1

    // 跳过第一行（标题行）
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      
      // 获取B、C、D列的数据
      const staffForm: StaffForm = {
        staffNo: row['B']?.toString() || '',  // B列是工号
        name: row['C']?.toString() || '',     // C列是姓名
        team: row['D']?.toString() || ''      // D列是班组
      }

      // 验证必要字段是否存在且不为空
      if (staffForm.staffNo && staffForm.name && staffForm.team) {
        // 去除可能的空格
        staffForm.staffNo = staffForm.staffNo.trim()
        staffForm.name = staffForm.name.trim()
        staffForm.team = staffForm.team.trim()
        
        addStaff(staffForm)
      }
    }
  }

  const removeStaff = (id: number) => {
    const index = staffList.value.findIndex(staff => staff.id === id)
    if (index !== -1) {
      staffList.value.splice(index, 1)
    }
  }

  const updateStaff = (id: number, staffForm: StaffForm) => {
    const index = staffList.value.findIndex(staff => staff.id === id)
    if (index !== -1) {
      staffList.value[index] = { ...staffList.value[index], ...staffForm }
    }
  }

  // 获取所有在职人员列表
  const getActiveStaffList = () => {
    return staffList.value.map(staff => ({
      label: `${staff.name} (${staff.staffNo} - ${staff.team})`,  // 显示名字、工号和班组
      value: staff.name,  // 保持value为名字
      staffNo: staff.staffNo,
      team: staff.team
    }))
  }

  // 清空所有员工数据
  const clearAllStaff = (): void => {
    staffList.value = []
    nextId = 1
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_KEY + '-nextId')
  }

  return {
    staffList,
    addStaff,
    removeStaff,
    updateStaff,
    importStaffFromExcel,
    getActiveStaffList,
    clearAllStaff
  }
}) 