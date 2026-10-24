//defino rotas para cada componente (tela) ex /cadastrar /logar e depois importo no MediaDeviceInfo.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import AboutPage from '../views/AboutPage.vue'
import EnemPage from '../views/EnemPage.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: AboutPage },
  { path: '/enem', component: EnemPage },
]
const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router