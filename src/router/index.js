import { createRouter, createWebHistory } from 'vue-router'
import { h } from 'vue'
import { pages } from '../data/pages'
import { PUBLIC_ROUTES } from '../seo/site'

const EmptyRouteView = {
    name: 'EmptyRouteView',
    render() {
        return h('div', { style: 'display:none;' })
    }
}

const routes = [
    {
        path: '/domov',
        redirect: PUBLIC_ROUTES.home
    },
    ...pages.map((page) => ({
        path: page.route,
        name: page.id,
        component: EmptyRouteView,
        meta: {
            cardId: page.id
        }
    }))
]

export const router = createRouter({
    history: createWebHistory(),
    routes
})
