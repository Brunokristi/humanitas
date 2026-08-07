import { createRouter, createWebHistory } from 'vue-router'
import { PUBLIC_ROUTES } from '../seo/site'
import HomePage from '../pages/HomePage.vue'
import ServicesPage from '../pages/ServicesPage.vue'
import ContactPage from '../pages/ContactPage.vue'

function isServicesOverlayRoute(routeName) {
    return routeName === 'services' || routeName === 'service-detail'
}

function isHomeOverlayRoute(routeName) {
    return routeName === 'home' || routeName === 'employee-detail'
}

function areQueriesEqualExceptServiceParam(toQuery = {}, fromQuery = {}) {
    const normalize = (query) => {
        const nextQuery = { ...query }
        delete nextQuery.sluzba
        return JSON.stringify(nextQuery)
    }

    return normalize(toQuery) === normalize(fromQuery)
}

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
        path: `${PUBLIC_ROUTES.team}/:employeeSlug`,
        name: 'employee-detail',
        component: HomePage
    },
    {
        path: '/sluzby',
        name: 'services',
        component: ServicesPage
    },
    {
        path: '/sluzby/:serviceSlug',
        name: 'service-detail',
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
        if (
            isServicesOverlayRoute(to.name) &&
            isServicesOverlayRoute(from.name)
        ) {
            return false
        }

        if (
            isHomeOverlayRoute(to.name) &&
            isHomeOverlayRoute(from.name)
        ) {
            return false
        }

        if (
            to.path === from.path &&
            to.hash === from.hash &&
            areQueriesEqualExceptServiceParam(to.query, from.query)
        ) {
            return false
        }

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
