import HomePage from '../pages/HomePage.vue'
import ServicesPage from '../pages/ServicesPage.vue'
import ContactPage from '../pages/ContactPage.vue'

export const pages = [
    {
        id: 'domov',
        title: 'Domov',
        route: '/domov',
        component: HomePage
    },
    {
        id: 'sluzby',
        title: 'Služby',
        route: '/sluzby',
        component: ServicesPage
    },
    {
        id: 'kontakt',
        title: 'Kontakt',
        route: '/kontakt',
        component: ContactPage
    }
]
