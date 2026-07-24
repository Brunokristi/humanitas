import HomePage from '../pages/HomePage.vue'
import FocusPage from '../pages/ServicesPage.vue/index.js'
import ContactPage from '../pages/ContactPage.vue'

export const pages = [
    {
        id: 'domov',
        title: 'Domov',
        route: '/domov',
        component: HomePage
    },
    {
        id: 'zameranie',
        title: 'Naše zameranie',
        route: '/zameranie',
        component: FocusPage
    },
    {
        id: 'kontakt',
        title: 'Kontakt',
        route: '/kontakt',
        component: ContactPage
    }
]
