<template>
  <el-container class="layout-container">
    <el-header>
      <div class="header-content">
        <h1>重点旅客信息登记系统</h1>
        <div class="nav-buttons">
          <el-button-group>
            <el-button 
              :type="$route.path === '/' ? 'primary' : 'default'"
              :class="{ 'nav-button': true, 'active': $route.path === '/' }"
              @click="$router.push('/')">
              <el-icon><HomeFilled /></el-icon>
              首页
            </el-button>
            <el-button 
              :type="$route.path === '/train' ? 'primary' : 'default'"
              :class="{ 'nav-button': true, 'active': $route.path === '/train' }"
              @click="$router.push('/train')">
              <el-icon><List /></el-icon>
              车次信息
            </el-button>
            <el-button 
              :type="$route.path === '/passenger' ? 'primary' : 'default'"
              :class="{ 'nav-button': true, 'active': $route.path === '/passenger' }"
              @click="$router.push('/passenger')">
              <el-icon><User /></el-icon>
              旅客信息
            </el-button>
            <el-button 
              :type="$route.path === '/staff' ? 'primary' : 'default'"
              :class="{ 'nav-button': true, 'active': $route.path === '/staff' }"
              @click="$router.push('/staff')">
              <el-icon><User /></el-icon>
              服务人员管理
            </el-button>
            <el-button 
              :type="$route.path === '/settings' ? 'primary' : 'default'"
              :class="{ 'nav-button': true, 'active': $route.path === '/settings' }"
              @click="$router.push('/settings')">
              <el-icon><Setting /></el-icon>
              系统设置
            </el-button>
          </el-button-group>
        </div>
      </div>
    </el-header>
    <el-container class="main-container">
      <el-main>
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { HomeFilled, List, User, Setting } from '@element-plus/icons-vue'
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

onMounted(() => {
  console.log('App mounted, current route:', route.path)
})

// 清除所有可能残留的表格样式
const clearAllTableStyles = () => {
  console.log('路由变化，清除所有表格样式')
  // 选择所有表格行
  const allRows = document.querySelectorAll('tr')
  if (allRows && allRows.length > 0) {
    allRows.forEach((row) => {
      try {
        // 移除所有样式类
        row.classList.remove('near-row', 'expired-row', 'left-row', 'urgent-row')
        
        // 清除内联样式
        if (row instanceof HTMLElement) {
          row.style.cssText = ''
        }
        
        // 清除所有单元格样式
        const cells = row.querySelectorAll('td')
        cells.forEach((cell) => {
          if (cell instanceof HTMLElement) {
            cell.style.cssText = ''
          }
        })
      } catch (e) {
        console.error('清除样式时出错:', e)
      }
    })
  }
  
  // 特别处理终到车样式
  const terminalCells = document.querySelectorAll('.terminal-train')
  if (terminalCells && terminalCells.length > 0) {
    terminalCells.forEach((cell) => {
      try {
        if (cell instanceof HTMLElement) {
          cell.style.cssText = ''
          
          // 恢复正常的绿色样式
          cell.style.backgroundColor = '#e1f3d8'
          cell.style.color = '#67c23a'
          cell.style.borderColor = '#c2e7b0'
        }
      } catch (e) {
        console.error('恢复终到车样式时出错:', e)
      }
    })
  }
}

watch(() => route.path, (newPath, oldPath) => {
  console.log('Route changed to:', newPath, 'from:', oldPath)
  
  // 只有当从首页切换到其他页面时，才清除所有表格样式
  if (oldPath === '/' && newPath !== '/') {
    console.log('从首页离开，清除所有表格样式')
    clearAllTableStyles()
  }
})
</script>

<style>
:root {
  --primary-color: #409EFF;
  --primary-light: #66b1ff;
  --primary-dark: #337ecc;
  --header-bg: #409EFF;
}

.layout-container {
  height: 100vh;
  background-color: #f5f7fa;
}

.el-header {
  background-color: var(--header-bg);
  color: white;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
  position: relative;
  z-index: 1;
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.header-content h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
  margin-right: 50px;
}

.nav-buttons {
  margin-left: 20px;
}

.nav-buttons .el-button-group {
  margin-right: 0;
}

.nav-buttons .nav-button {
  padding: 8px 20px;
  transition: none;
  background-color: transparent;
  border-color: rgba(255, 255, 255, 0.5);
  color: #ffffff;
  font-weight: 500;
}

.nav-buttons .nav-button:hover {
  transform: none;
  background-color: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.8);
}

.nav-buttons .nav-button.active {
  background-color: #ffffff;
  border-color: #ffffff;
  color: var(--primary-color);
}

.nav-buttons .nav-button.active:hover {
  background-color: #f5f7fa;
  border-color: #f5f7fa;
  color: var(--primary-dark);
}

.nav-buttons .el-icon {
  margin-right: 4px;
}

.main-container {
  height: calc(100vh - 60px);
  overflow-y: auto;
  background-color: #f5f7fa;
}

.el-main {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: none;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 1;
}

/* 全局样式 */
body {
  margin: 0;
  font-family: "Microsoft YaHei", "微软雅黑", sans-serif;
}

/* 表格样式优化 */
.el-table {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(64, 158, 255, 0.1);
}

.el-table th {
  background-color: #f5f7fa !important;
  color: #606266;
  font-weight: 600;
}

.el-table .cell {
  display: flex;
  align-items: center;
}

/* 按钮样式优化 */
.el-button {
  border-radius: 4px;
}

.el-button--primary {
  background-color: var(--primary-color);
}

.el-button--primary:hover {
  background-color: var(--primary-light);
}

/* 卡片样式 */
.el-card {
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px 0 rgba(64, 158, 255, 0.1);
  border-color: #e4e7ed;
}

.el-card:hover {
  box-shadow: 0 4px 16px 0 rgba(64, 158, 255, 0.15);
}

/* 表单样式 */
.el-form-item__label {
  font-weight: 500;
  color: #606266;
}

/* 弹窗样式 */
.el-dialog {
  border-radius: 8px;
  box-shadow: 0 4px 16px 0 rgba(64, 158, 255, 0.15);
}

.el-dialog__header {
  border-bottom: 1px solid #e4e7ed;
  margin: 0;
  padding: 20px;
  font-weight: 600;
}

.el-dialog__body {
  padding: 20px;
}

.el-dialog__footer {
  border-top: 1px solid #e4e7ed;
  padding: 15px 20px;
}
</style> 