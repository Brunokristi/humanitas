export const SITE_NAME = 'Humanitas'

export const SITE_ALTERNATE_NAME = 'Klinicka psychologia Humanitas'

export const SITE_URL = 'https://klinickapsychologiars.sk'

export const SITE_LOCALE = 'sk_SK'

export const PRIMARY_OG_IMAGE_PATH = '/images/humanitas_logo_horizontal.png'

export const STRUCTURED_DATA_LOGO_PATH = '/images/humanitas_logo.png'

export const PUBLIC_ROUTES = Object.freeze({
    home: '/',
    team: '/tim',
    services: '/sluzby',
    contact: '/kontakt'
})

export const PAGE_SEO = Object.freeze({
    home: {
        path: PUBLIC_ROUTES.home,
        title: 'Klinický psychológ Rimavská Sobota | Humanitas',
        description:
            'Ambulancia klinickej psychológie Humanitas v Rimavskej Sobote. Informácie o psychologických službách, pracovisku, ordinačných hodinách a možnostiach objednania.'
    },

    services: {
        path: PUBLIC_ROUTES.services,
        title: 'Psychologické služby Rimavská Sobota | Humanitas',
        description:
            'Prehľad odborných psychologických služieb ambulancie Humanitas v Rimavskej Sobote. Zistite, ako jednotlivé vyšetrenia a konzultácie prebiehajú.'
    },

    contact: {
        path: PUBLIC_ROUTES.contact,
        title: 'Kontakt – psychológ Rimavská Sobota | Humanitas',
        description:
            'Kontaktujte ambulanciu klinickej psychológie Humanitas v Rimavskej Sobote. Nájdete tu adresu, telefón, e-mail, ordinačné hodiny a možnosti objednania.'
    }
})

export function absoluteUrl(path = '') {
    if (!path) {
        return SITE_URL
    }

    if (/^https?:\/\//i.test(path)) {
        return path
    }

    return new URL(path, `${SITE_URL}/`).toString()
}

export function canonicalUrl(path = PUBLIC_ROUTES.home) {
    const normalizedPath = String(path || '/').startsWith('/')
        ? String(path || '/')
        : `/${String(path || '/')}`

    return normalizedPath === '/'
        ? `${SITE_URL}/`
        : `${SITE_URL}${normalizedPath}`
}

export function safeValue(value) {
    if (value === null || value === undefined) {
        return null
    }

    if (typeof value === 'string') {
        const trimmed = value.trim()

        return trimmed.length ? trimmed : null
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return value
    }

    return value
}

export function filterNullValues(values) {
    return values.filter((value) => value !== null && value !== undefined && value !== '')
}
