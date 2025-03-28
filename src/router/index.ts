import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Staff from '../views/Staff.vue'
import Train from '../views/Train.vue'
import Passenger from '../views/Passenger.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/train',
      name: 'train',
      component: Train
    },
    {
      path: '/passenger',
      name: 'passenger',
      component: Passenger
    },
    {
      path: '/staff',
      name: 'staff',
      component: Staff
    }
  ]
})

export default router 