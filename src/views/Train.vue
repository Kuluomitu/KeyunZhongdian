<template>
  <div class="train">
    <h2>车次信息管理</h2>
    <el-upload
      class="upload-demo"
      action="#"
      :auto-upload="false"
      :on-change="handleFileChange"
      accept=".xlsx,.xls">
      <template #trigger>
        <el-button type="primary">选择Excel文件</el-button>
      </template>
      <el-button class="ml-3" type="success" @click="handleImport">
        导入数据
      </el-button>
    </el-upload>

    <div class="search-box">
      <el-input
        v-model="searchQuery"
        placeholder="请输入车次号搜索"
        class="search-input"
        clearable
        @clear="handleSearch"
        @keyup.enter="handleSearch">
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <el-table 
      :data="paginatedData" 
      style="width: 100%; margin-top: 20px"
      border>
      <el-table-column prop="id" label="序号" width="60" fixed="left" />
      <el-table-column prop="trainNo" label="车次" width="100" fixed="left" />
      <el-table-column prop="bureau" label="担当局" width="100" />
      <el-table-column prop="route" label="运行区间1" width="150" />
      <el-table-column prop="route2" label="运行区间2" width="150" />
      <el-table-column prop="arrivalTime" label="到点" width="80" />
      <el-table-column prop="departureTime" label="开点" width="80" />
      <el-table-column prop="track" label="股道" width="80" />
      <el-table-column prop="platform" label="站台" width="80" />
      <el-table-column prop="stopTime" label="站停" width="80" />
      <el-table-column prop="trainType" label="车型" width="100" />
      <el-table-column prop="capacity" label="定员" width="80" />
      <el-table-column prop="formation" label="编组" width="100" />
      <el-table-column prop="ticketGate" label="检票口" width="100" />
      <el-table-column prop="ticketTime" label="开检时间" width="100" />
      <el-table-column prop="ticketStaffTime" label="检票上岗时间" width="120" />
      <el-table-column prop="platformStaffTime" label="站台上岗时间" width="120" />
      <el-table-column prop="foldingTime" label="立折时间" width="100" />
      <el-table-column prop="waterService" label="给水作业" width="100" />
      <el-table-column prop="sewageService" label="吸污" width="80" />
      <el-table-column prop="luggageService" label="行包作业" width="100" />
      <el-table-column prop="remark" label="备注" min-width="150" />
    </el-table>

    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="filteredData.length"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'
import { useTrainStore } from '../store/train'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import type { UploadFile } from 'element-plus'
import type { Train } from '../store/train'

const trainStore = useTrainStore()
const fileList = ref<UploadFile[]>([])
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

// 过滤后的数据
const filteredData = computed(() => {
  if (!searchQuery.value) {
    return trainStore.trainList
  }
  const query = searchQuery.value.toString().toLowerCase()
  return trainStore.trainList.filter(train => 
    train.trainNo.toString().toLowerCase().includes(query)
  )
})

// 分页后的数据
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredData.value.slice(start, end)
})

// 处理搜索
const handleSearch = (): void => {
  currentPage.value = 1 // 重置到第一页
}

// 处理每页显示数量变化
const handleSizeChange = (val: number): void => {
  pageSize.value = val
  currentPage.value = 1 // 重置到第一页
}

// 处理页码变化
const handleCurrentChange = (val: number): void => {
  currentPage.value = val
}

// 添加时间格式处理函数
const formatTime = (value: string | number | null | undefined): string => {
  if (!value) return ''
  
  // 如果是ISO格式的时间字符串，提取时间部分
  if (typeof value === 'string' && value.includes('T')) {
    return value.split('T')[1].substring(0, 5)
  }
  
  // 如果已经是正确的时间格式（HH:mm），直接返回
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) {
    return value
  }
  
  // 处理Excel中的时间数值
  if (typeof value === 'number') {
    const totalMinutes = Math.round(value * 24 * 60)
    const hours = Math.floor(totalMinutes / 60) % 24
    const minutes = totalMinutes % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }
  
  return ''
}

const handleFileChange = (file: UploadFile): void => {
  fileList.value = [file]
}

const handleImport = (): void => {
  if (fileList.value.length === 0) {
    ElMessage.warning('请先选择文件')
    return
  }

  const file = fileList.value[0].raw
  if (!file) {
    ElMessage.warning('文件无效')
    return
  }

  const reader = new FileReader()

  reader.onload = (e) => {
    try {
      const data = e.target?.result
      if (!data) {
        throw new Error('文件读取失败')
      }

      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      
      // 获取工作表的范围
      const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1')
      const jsonData: Array<Record<string, any>> = []
      
      // 从第三行开始读取数据（跳过表头和序列名行）
      for (let R = 2; R <= range.e.r; ++R) {
        const row: Record<string, any> = {}
        
        // 读取序号（A列）
        const idCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 0})]
        row['序号'] = idCell ? idCell.v : ''
        
        // 读取担当局（B列）
        const bureauCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 1})]
        row['担当局'] = bureauCell ? bureauCell.v : ''
        
        // 读取车次（C列）
        const trainNoCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 2})]
        row['车次'] = trainNoCell ? trainNoCell.v : ''
        
        // 读取运行区间1（D列）
        const route1Cell = firstSheet[XLSX.utils.encode_cell({r: R, c: 3})]
        row['运行区间'] = route1Cell ? route1Cell.v : ''
        
        // 读取运行区间2（E列）
        const route2Cell = firstSheet[XLSX.utils.encode_cell({r: R, c: 4})]
        row['运行区间2'] = route2Cell ? route2Cell.v : ''
        
        // 读取到点（F列）
        const arrivalCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 5})]
        row['到点'] = arrivalCell ? arrivalCell.v : ''
        
        // 读取开点（G列）
        const departureCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 6})]
        row['开点'] = departureCell ? departureCell.v : ''
        
        // 读取股道（H列）
        const trackCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 7})]
        row['股道'] = trackCell ? trackCell.v : ''
        
        // 读取站台（I列）
        const platformCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 8})]
        row['站台'] = platformCell ? platformCell.v : ''
        
        // 读取站停（J列）
        const stopTimeCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 9})]
        row['站停'] = stopTimeCell ? stopTimeCell.v : ''
        
        // 读取车型（K列）
        const trainTypeCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 10})]
        row['车型'] = trainTypeCell ? trainTypeCell.v : ''
        
        // 读取定员（L列）
        const capacityCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 11})]
        row['定员'] = capacityCell ? capacityCell.v : ''
        
        // 读取编组（M列）
        const formationCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 12})]
        row['编组'] = formationCell ? formationCell.v : ''
        
        // 读取检票口（N列）
        const ticketGateCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 13})]
        row['检票口'] = ticketGateCell ? ticketGateCell.v : ''

        // 读取开检时间（O列）
        const ticketTimeCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 14})]
        row['开检时间'] = ticketTimeCell ? ticketTimeCell.v : ''

        // 读取检票上岗时间（P列）
        const ticketStaffTimeCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 15})]
        row['检票上岗时间'] = ticketStaffTimeCell ? ticketStaffTimeCell.v : ''

        // 读取站台上岗时间（Q列）
        const platformStaffTimeCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 16})]
        row['站台上岗时间'] = platformStaffTimeCell ? platformStaffTimeCell.v : ''

        // 读取立折时间（R列）
        const foldingTimeCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 17})]
        row['立折时间'] = foldingTimeCell ? foldingTimeCell.v : ''

        // 读取给水作业（S列）
        const waterServiceCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 18})]
        row['给水作业'] = waterServiceCell ? waterServiceCell.v : ''

        // 读取吸污（T列）
        const sewageServiceCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 19})]
        row['吸污'] = sewageServiceCell ? sewageServiceCell.v : ''

        // 读取行包作业（U列）
        const luggageServiceCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 20})]
        row['行包作业'] = luggageServiceCell ? luggageServiceCell.v : ''

        // 读取备注（V列）
        const remarkCell = firstSheet[XLSX.utils.encode_cell({r: R, c: 21})]
        row['备注'] = remarkCell ? remarkCell.v : ''

        jsonData.push(row)
      }
      
      console.log('Excel原始数据:', jsonData)
      
      // 处理Excel数据，确保字段名称匹配
      const processedData = jsonData.map(item => {
        console.log('处理单行数据:', item)
        return {
          bureau: item['担当局'] || '',  // 担当局对应B列
          trainNo: item['车次'] || '',   // 车次对应C列
          route: item['运行区间'] || '',
          route2: item['运行区间2'] || '',
          arrivalTime: formatTime(item['到点']),
          departureTime: formatTime(item['开点']),
          track: item['股道'] || '',
          platform: item['站台'] || '',
          stopTime: formatTime(item['站停']),
          trainType: item['车型'] || '',
          capacity: item['定员'] || '',
          formation: item['编组'] || '',
          ticketGate: item['检票口'] || '',
          ticketTime: formatTime(item['开检时间']),
          ticketStaffTime: formatTime(item['检票上岗时间']),
          platformStaffTime: formatTime(item['站台上岗时间']),
          foldingTime: formatTime(item['立折时间']),
          waterService: item['给水作业'] || '',
          sewageService: item['吸污'] || '',
          luggageService: item['行包作业'] || '',
          remark: item['备注'] || ''
        }
      })

      console.log('处理后的数据:', processedData)

      trainStore.addTrains(processedData)
      ElMessage.success('数据导入成功')
    } catch (error) {
      console.error('导入失败:', error)
      ElMessage.error('数据导入失败，请检查文件格式是否正确')
    }
  }

  reader.readAsArrayBuffer(file)
}
</script>

<style scoped>
.train {
  padding: 20px;
}

.upload-demo {
  margin-bottom: 20px;
}

.search-box {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-end;
}

.search-input {
  width: 300px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-table) {
  .el-table__header-wrapper {
    th {
      background-color: #f5f7fa;
      color: #606266;
      font-weight: bold;
    }
  }
  
  .el-table__row {
    &:hover {
      background-color: #f5f7fa;
    }
  }
}

:deep(.el-pagination) {
  margin-top: 20px;
  justify-content: flex-end;
}
</style> 