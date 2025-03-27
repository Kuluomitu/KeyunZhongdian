<template>
  <div class="staff">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>服务人员管理</span>
          <el-button-group>
            <el-upload
              action=""
              :auto-upload="false"
              :show-file-list="false"
              accept=".xlsx,.xls"
              @change="handleExcelUpload"
            >
              <el-button type="primary">
                <el-icon><Upload /></el-icon>
                导入Excel
              </el-button>
            </el-upload>
          </el-button-group>
        </div>
      </template>

      <el-table :data="staffStore.staffList" style="width: 100%" border>
        <el-table-column prop="staffNo" label="工号" width="120" align="center" />
        <el-table-column prop="name" label="姓名" width="120" align="center" />
        <el-table-column prop="team" label="班组" min-width="120" align="center" />
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="scope">
            <el-button-group>
              <el-button 
                size="small" 
                type="primary"
                @click="handleEdit(scope.row)">
                编辑
              </el-button>
              <el-button 
                size="small" 
                type="danger"
                @click="handleDelete(scope.row)">
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="isEdit ? '编辑人员' : '新增人员'"
      width="400px">
      <el-form 
        :model="form" 
        :rules="rules"
        ref="formRef"
        label-width="80px">
        <el-form-item label="工号" prop="staffNo">
          <el-input v-model="form.staffNo" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="班组" prop="team">
          <el-input v-model="form.team" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload } from '@element-plus/icons-vue'
import { useStaffStore } from '../store/staff'
import type { Staff, StaffForm } from '../types/staff'
import * as XLSX from 'xlsx'

const staffStore = useStaffStore()

const dialogVisible = ref(false)
const isEdit = ref(false)
const currentId = ref<number | null>(null)
const formRef = ref()

const form = reactive<StaffForm>({
  staffNo: '',
  name: '',
  team: ''
})

const rules = {
  staffNo: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  team: [{ required: true, message: '请输入班组', trigger: 'blur' }]
}

const resetForm = () => {
  form.staffNo = ''
  form.name = ''
  form.team = ''
}

const handleAdd = () => {
  isEdit.value = false
  currentId.value = null
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row: Staff) => {
  isEdit.value = true
  currentId.value = row.id
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleDelete = (row: Staff) => {
  ElMessageBox.confirm('确认删除该人员？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    staffStore.removeStaff(row.id)
    ElMessage.success('删除成功')
  })
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate((valid: boolean) => {
    if (valid) {
      if (isEdit.value && currentId.value) {
        staffStore.updateStaff(currentId.value, form)
        ElMessage.success('更新成功')
      } else {
        staffStore.addStaff(form)
        ElMessage.success('添加成功')
      }
      dialogVisible.value = false
    }
  })
}

const handleExcelUpload = (file: any) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    const data = e.target?.result
    const workbook = XLSX.read(data, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    
    const results = XLSX.utils.sheet_to_json(worksheet, {
      header: 'A',
      raw: true
    })
    
    staffStore.importStaffFromExcel(results)
    ElMessage.success('导入成功')
  }
  reader.readAsArrayBuffer(file.raw)
}
</script>

<style scoped>
.staff {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header span {
  font-size: 16px;
  font-weight: bold;
}

.el-button-group .el-button {
  margin-left: 0;
}

:deep(.el-upload) {
  width: auto !important;
}

:deep(.el-table) {
  margin-top: 20px;
}

:deep(.el-table__header) {
  font-weight: bold;
  background-color: #f5f7fa;
}
</style> 