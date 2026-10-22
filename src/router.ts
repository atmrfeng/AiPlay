import { createRouter, createWebHashHistory } from 'vue-router'
import Games from './views/Games.vue'
import ModeList from './views/ModeList.vue'
import Play from './views/Play.vue'
import Memories from './views/Memories.vue'
import Me from './views/Me.vue'
import Studio from './views/Studio.vue'
import Search from './views/Search.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/games' },
    { path: '/games', name: 'games', component: Games },
    { path: '/memories', name: 'memories', component: Memories },
    { path: '/me', name: 'me', component: Me },
    { path: '/studio', name: 'studio', component: Studio },
    { path: '/search', name: 'search', component: Search },
    { path: '/g/:game', name: 'mode-list', component: ModeList },
    { path: '/g/:game/custom', name: 'custom', component: () => import('./views/CustomEditor.vue') },
    { path: '/g/:game/play/:modeId', name: 'play', component: Play },
    // 兼容旧链接
    { path: '/records', redirect: '/memories' },
    { path: '/more', redirect: '/games' },
    { path: '/board', redirect: '/games' },
    { path: '/:pathMatch(.*)*', redirect: '/games' },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
