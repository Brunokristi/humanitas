import HomePage from '../pages/HomePage.vue'
import ServicesPage from '../pages/ServicesPage.vue'
import ContactPage from '../pages/ContactPage.vue'

import { PUBLIC_ROUTES } from '../seo/site'

export const pages = [
    {
        id: 'domov',
        title: 'Domov',
        route: PUBLIC_ROUTES.home,
        component: HomePage
    },
    {
        id: 'sluzby',
        title: 'Služby',
        route: PUBLIC_ROUTES.services,
        component: ServicesPage
    },
    {
        id: 'kontakt',
        title: 'Kontakt',
        route: PUBLIC_ROUTES.contact,
        component: ContactPage
    }
]

export const seoPages = Object.freeze({
    home: pages[0],
    services: pages[1],
    contact: pages[2]
})

