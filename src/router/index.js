import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Train from '../views/Train.vue'
import Passenger from '../views/Passenger.vue'
import Staff from '../views/Staff.vue'
import Settings from '../views/Settings.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/train',
    name: 'Train',
    component: Train
  },
  {
    path: '/passenger',
    name: 'Passenger',
    component: Passenger
  },
  {
    path: '/staff',
    name: 'Staff',
    component: Staff
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router 