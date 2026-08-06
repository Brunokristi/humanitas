import { createRouter, createWebHistory } from 'vue-router'
import { PUBLIC_ROUTES } from '../seo/site'
import HomePage from '../pages/HomePage.vue'
import ServicesPage from '../pages/ServicesPage.vue'
import ContactPage from '../pages/ContactPage.vue'

const routes = [
    {
        path: '/domov',
        redirect: PUBLIC_ROUTES.home
    },
    {
        path: '/',
        name: 'home',
        component: HomePage
    },
    {
        path: '/sluzby',
        name: 'services',
        component: ServicesPage
    },
    {
        path: '/kontakt',
        name: 'contact',
        component: ContactPage
    }
]

export const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition
        }

        if (to.hash) {
            return {
                el: to.hash,
                top: 0,
                behavior: 'auto'
            }
        }

        return {
            left: 0,
            top: 0,
            behavior: 'auto'
        }
    }
})
