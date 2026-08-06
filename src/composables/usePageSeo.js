import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'

import {
    PAGE_SEO,
    PRIMARY_OG_IMAGE_PATH,
    SITE_ALTERNATE_NAME,
    SITE_LOCALE,
    SITE_NAME,
    SITE_URL,
    absoluteUrl,
    canonicalUrl,
    filterNullValues,
    safeValue,
    STRUCTURED_DATA_LOGO_PATH
} from '../seo/site'

import { usePublicSiteStore } from '../stores/publicSite'

function buildOpeningHoursSpecification(openingHours = []) {
    if (!Array.isArray(openingHours)) {
        return []
    }

    return openingHours
        .map((entry) => {
            if (!entry || typeof entry !== 'object') {
                return null
            }

            const intervals = Array.isArray(entry.intervals)
                ? entry.intervals
                : []

            const dayOfWeek = safeValue(entry.dayOfWeek ?? entry.day_of_week)

            if (!dayOfWeek || entry.isClosed) {
                return null
            }

            return intervals
                .map((interval) => {
                    const opensAt = safeValue(interval?.opensAt ?? interval?.opens_at)
                    const closesAt = safeValue(interval?.closesAt ?? interval?.closes_at)

                    if (!opensAt || !closesAt) {
                        return null
                    }

                    return {
                        '@type': 'OpeningHoursSpecification',
                        dayOfWeek: [
                            'Monday',
                            'Tuesday',
                            'Wednesday',
                            'Thursday',
                            'Friday',
                            'Saturday',
                            'Sunday'
                        ][Number(dayOfWeek) - 1],
                        opens: opensAt,
                        closes: closesAt
                    }
                })
                .filter(Boolean)
        })
        .flat()
}

function setManagedTag(tagName, key, attributes) {
    if (typeof document === 'undefined') {
        return null
    }

    const selector = `[data-humanitas-seo="${key}"]`
    let element = document.head.querySelector(selector)

    if (!element) {
        element = document.createElement(tagName)
        element.setAttribute('data-humanitas-seo', key)
        document.head.appendChild(element)
    }

    Object.entries(attributes).forEach(([attributeName, attributeValue]) => {
        if (attributeValue === null || attributeValue === undefined || attributeValue === '') {
            element.removeAttribute(attributeName)
            return
        }

        element.setAttribute(attributeName, String(attributeValue))
    })

    return element
}

function clearManagedTags() {
    if (typeof document === 'undefined') {
        return
    }

    document.head
        .querySelectorAll('[data-humanitas-seo]')
        .forEach((element) => element.remove())
}

function buildClinicGraph({
    pageId,
    pageTitle,
    pageDescription,
    pageUrl,
    breadcrumbs,
    company,
    branch,
    contact,
    openingHours,
    imageUrl,
    logoUrl
}) {
    const clinicName = safeValue(branch?.name ?? company?.legalName ?? company?.name ?? SITE_NAME)
    const clinicEmail = safeValue(contact?.email ?? contact?.value ?? company?.email ?? branch?.email)
    const clinicPhone = safeValue(contact?.phone ?? contact?.value ?? company?.phone ?? branch?.phone)

    const clinicAddressSource = branch?.address ?? company?.registeredAddress ?? company?.address ?? null
    const addressLine1 = safeValue(clinicAddressSource?.line1 ?? clinicAddressSource?.street)
    const addressLine2 = safeValue(clinicAddressSource?.line2)
    const postalCode = safeValue(clinicAddressSource?.postalCode ?? clinicAddressSource?.postal_code)
    const locality = safeValue(clinicAddressSource?.city)
    const region = safeValue(clinicAddressSource?.region)
    const country = safeValue(clinicAddressSource?.country)

    const addressLines = filterNullValues([
        addressLine1,
        addressLine2,
        filterNullValues([postalCode, locality]).join(' ') || null,
        region,
        country
    ])

    const latitude = safeValue(branch?.address?.latitude)
    const longitude = safeValue(branch?.address?.longitude)

    const graph = [
        {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            url: SITE_URL,
            name: SITE_NAME,
            alternateName: SITE_ALTERNATE_NAME,
            inLanguage: 'sk',
            publisher: {
                '@id': `${SITE_URL}/#clinic`
            }
        },
        {
            '@type': 'MedicalClinic',
            '@id': `${SITE_URL}/#clinic`,
            name: clinicName,
            url: SITE_URL,
            logo: logoUrl,
            image: imageUrl,
            email: clinicEmail || undefined,
            telephone: clinicPhone || undefined,
            address: addressLines.length
                ? {
                    '@type': 'PostalAddress',
                    streetAddress: filterNullValues([addressLine1, addressLine2]).join(', ') || undefined,
                    postalCode: postalCode || undefined,
                    addressLocality: locality || undefined,
                    addressRegion: region || undefined,
                    addressCountry: country || undefined
                }
                : undefined,
            geo: latitude && longitude
                ? {
                    '@type': 'GeoCoordinates',
                    latitude: Number(latitude),
                    longitude: Number(longitude)
                }
                : undefined,
            openingHoursSpecification: buildOpeningHoursSpecification(openingHours),
            areaServed: locality || undefined,
            sameAs: undefined
        },
        {
            '@type': 'WebPage',
            '@id': `${pageUrl}#webpage`,
            url: pageUrl,
            name: pageTitle,
            description: pageDescription,
            inLanguage: SITE_LOCALE,
            isPartOf: {
                '@id': `${SITE_URL}/#website`
            },
            about: {
                '@id': `${SITE_URL}/#clinic`
            }
        }
    ]

    if (Array.isArray(breadcrumbs) && breadcrumbs.length) {
        graph.push({
            '@type': 'BreadcrumbList',
            '@id': `${pageUrl}#breadcrumb`,
            itemListElement: breadcrumbs.map((crumb, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: crumb.name,
                item: crumb.url
            }))
        })
    }

    if (pageId) {
        graph[2]['@id'] = `${pageUrl}#webpage`
    }

    return {
        '@context': 'https://schema.org',
        '@graph': graph
    }
}

export function usePageSeo({
    pageKey,
    breadcrumbs = [],
    robots = 'index,follow'
}) {
    const route = useRoute()
    const publicSiteStore = usePublicSiteStore()
    const {
        company,
        currentBranch,
        contacts,
        openingHours
    } = storeToRefs(publicSiteStore)

    const page = PAGE_SEO[pageKey]

    const isActive = computed(() => route.path === page.path)

    const pageUrl = computed(() => canonicalUrl(page.path))
    const imageUrl = absoluteUrl(PRIMARY_OG_IMAGE_PATH)
    const logoUrl = absoluteUrl(STRUCTURED_DATA_LOGO_PATH)

    const primaryContact = computed(() => {
        return (
            contacts.value.find((contact) => contact.isPrimary) ??
            contacts.value.find((contact) => contact.type === 'phone') ??
            contacts.value.find((contact) => contact.type === 'email') ??
            contacts.value[0] ??
            null
        )
    })

    const jsonLd = computed(() => buildClinicGraph({
        pageId: pageKey,
        pageTitle: page.title,
        pageDescription: page.description,
        pageUrl: pageUrl.value,
        breadcrumbs,
        company: company.value,
        branch: currentBranch.value,
        contact: primaryContact.value,
        openingHours: openingHours.value,
        imageUrl,
        logoUrl
    }))

    const applySeo = () => {
        if (typeof document === 'undefined' || !isActive.value) {
            return
        }

        document.title = page.title
        document.documentElement.lang = 'sk'

        clearManagedTags()

        setManagedTag('meta', `${pageKey}:description`, {
            name: 'description',
            content: page.description
        })

        setManagedTag('meta', `${pageKey}:robots`, {
            name: 'robots',
            content: robots
        })

        setManagedTag('link', `${pageKey}:canonical`, {
            rel: 'canonical',
            href: pageUrl.value
        })

        setManagedTag('meta', `${pageKey}:og:title`, {
            property: 'og:title',
            content: page.title
        })

        setManagedTag('meta', `${pageKey}:og:description`, {
            property: 'og:description',
            content: page.description
        })

        setManagedTag('meta', `${pageKey}:og:url`, {
            property: 'og:url',
            content: pageUrl.value
        })

        setManagedTag('meta', `${pageKey}:og:type`, {
            property: 'og:type',
            content: 'website'
        })

        setManagedTag('meta', `${pageKey}:og:locale`, {
            property: 'og:locale',
            content: SITE_LOCALE
        })

        setManagedTag('meta', `${pageKey}:og:site_name`, {
            property: 'og:site_name',
            content: SITE_NAME
        })

        setManagedTag('meta', `${pageKey}:application-name`, {
            name: 'application-name',
            content: SITE_NAME
        })

        setManagedTag('meta', `${pageKey}:apple-mobile-web-app-title`, {
            name: 'apple-mobile-web-app-title',
            content: SITE_NAME
        })

        setManagedTag('meta', `${pageKey}:og:image`, {
            property: 'og:image',
            content: imageUrl
        })

        setManagedTag('meta', `${pageKey}:twitter:card`, {
            name: 'twitter:card',
            content: 'summary_large_image'
        })

        setManagedTag('meta', `${pageKey}:twitter:title`, {
            name: 'twitter:title',
            content: page.title
        })

        setManagedTag('meta', `${pageKey}:twitter:description`, {
            name: 'twitter:description',
            content: page.description
        })

        setManagedTag('meta', `${pageKey}:twitter:image`, {
            name: 'twitter:image',
            content: imageUrl
        })

        setManagedTag('script', `${pageKey}:jsonld`, {
            type: 'application/ld+json'
        }).textContent = JSON.stringify(jsonLd.value);
    }

    watch([isActive, pageUrl, jsonLd], applySeo, { immediate: true, deep: true })

    return {
        page,
        pageUrl,
        isActive,
        jsonLd
    }
}
