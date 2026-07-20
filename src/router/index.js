import { createRouter, createWebHistory } from 'vue-router'
import { h } from 'vue'
import { pages } from '../data/pages'

const EmptyRouteView = {
    name: 'EmptyRouteView',
    render() {
        return h('div', { style: 'display:none;' })
    }
}

const routes = [
    {
        path: '/',
        name: 'stack',
        component: EmptyRouteView
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
