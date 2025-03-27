import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Staff from '../views/Staff.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/staff',
      name: 'staff',
      component: Staff
    }
  ]
})

export default router 