import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
    PAGE_SEO,
    PUBLIC_ROUTES,
    PRIMARY_OG_IMAGE_PATH,
    SITE_ALTERNATE_NAME,
    SITE_NAME,
    SITE_URL,
    absoluteUrl,
    STRUCTURED_DATA_LOGO_PATH
} from '../src/seo/site.js'
import { buildClinviaPublicEndpoint } from '../src/utils/clinviaFooter.js'
import { normalizeCompany } from '../src/normalizers/clinvia.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const distDir = path.join(projectRoot, 'dist')
const indexFilePath = path.join(distDir, 'index.html')

function parseEnvFile(envContent) {
    return envContent
        .split(/\r?\n/)
        .reduce((result, line) => {
            const trimmedLine = line.trim()

            if (!trimmedLine || trimmedLine.startsWith('#')) {
                return result
            }

            const delimiterIndex = trimmedLine.indexOf('=')

            if (delimiterIndex <= 0) {
                return result
            }

            const key = trimmedLine.slice(0, delimiterIndex).trim()
            let value = trimmedLine.slice(delimiterIndex + 1).trim()

            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1)
            }

            result[key] = value
            return result
        }, {})
}

async function readEnvFromFile(filePath) {
    try {
        const content = await readFile(filePath, 'utf8')
        return parseEnvFile(content)
    } catch {
        return {}
    }
}

function normalizeRouteSlug(value) {
    return String(value ?? '')
        .trim()
        .toLocaleLowerCase('sk')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function serviceRouteSlug(service) {
    const candidate =
        service?.slug ??
        service?.serviceSlug ??
        service?.service_slug ??
        service?.name ??
        service?.id ??
        null

    const slug = normalizeRouteSlug(candidate)

    return slug || null
}

function employeeRouteSlug(employee) {
    const nameCandidate = [
        employee?.titleBefore,
        employee?.firstName,
        employee?.lastName,
        employee?.titleAfter
    ]
        .filter(Boolean)
        .join(' ')

    const candidate =
        employee?.slug ??
        (nameCandidate
            ? nameCandidate
            : employee?.id ?? null)

    const slug = normalizeRouteSlug(candidate)

    return slug || null
}

async function fetchDynamicRoutes(envValues) {
    const apiBaseUrl =
        envValues.VITE_CLINVIA_API_URL ||
        process.env.VITE_CLINVIA_API_URL ||
        ''

    const companyId =
        envValues.VITE_CLINVIA_COMPANY_ID ||
        process.env.VITE_CLINVIA_COMPANY_ID ||
        envValues.VITE_CLINVIA_COMPANY_SLUG ||
        process.env.VITE_CLINVIA_COMPANY_SLUG ||
        envValues.VITE_CLINVIA_COMPANY_IDENTIFIER ||
        process.env.VITE_CLINVIA_COMPANY_IDENTIFIER ||
        ''

    const endpoint = buildClinviaPublicEndpoint(
        apiBaseUrl,
        companyId
    )

    if (!endpoint) {
        return []
    }

    const apiKey =
        envValues.VITE_CLINVIA_API_KEY ||
        process.env.VITE_CLINVIA_API_KEY ||
        ''

    const response = await fetch(endpoint, {
        headers: {
            Accept: 'application/json',
            ...(apiKey ? { 'X-API-Key': apiKey } : {})
        }
    })

    if (!response.ok) {
        throw new Error(`Clinvia API returned ${response.status} while building sitemap.`)
    }

    const responseData = await response.json()
    const rawCompany = responseData?.data ?? responseData
    const normalizedCompany = normalizeCompany(rawCompany)

    const uniqueServicePaths = new Set()
    const uniqueEmployeePaths = new Set()

    for (const branch of normalizedCompany?.branches ?? []) {
        for (const service of branch?.services ?? []) {
            if (!service?.isActive) {
                continue
            }

            const slug = serviceRouteSlug(service)

            if (!slug) {
                continue
            }

            uniqueServicePaths.add(`${PUBLIC_ROUTES.services}/${slug}`)
        }

        for (const employee of branch?.employees ?? []) {
            if (!employee?.isActive) {
                continue
            }

            const slug = employeeRouteSlug(employee)

            if (!slug) {
                continue
            }

            uniqueEmployeePaths.add(`${PUBLIC_ROUTES.team}/${slug}`)
        }
    }

    return {
        services: Array.from(uniqueServicePaths).sort((left, right) => left.localeCompare(right, 'sk')),
        employees: Array.from(uniqueEmployeePaths).sort((left, right) => left.localeCompare(right, 'sk'))
    }
}

function buildSitemapXml(dynamicServicePaths, dynamicEmployeePaths) {
    const today = new Date().toISOString().slice(0, 10)

    const staticEntries = [
        {
            path: PUBLIC_ROUTES.home,
            changefreq: 'weekly',
            priority: '1.0'
        },
        {
            path: PUBLIC_ROUTES.services,
            changefreq: 'weekly',
            priority: '0.9'
        },
        {
            path: PUBLIC_ROUTES.contact,
            changefreq: 'monthly',
            priority: '0.8'
        }
    ]

    const dynamicServiceEntries = dynamicServicePaths.map((pathValue) => {
        return {
            path: pathValue,
            changefreq: 'weekly',
            priority: '0.7'
        }
    })

    const dynamicEmployeeEntries = dynamicEmployeePaths.map((pathValue) => {
        return {
            path: pathValue,
            changefreq: 'monthly',
            priority: '0.6'
        }
    })

    const allEntries = [
        ...staticEntries,
        ...dynamicServiceEntries,
        ...dynamicEmployeeEntries
    ]

    const urls = allEntries
        .map((entry) => {
            const absolutePath = entry.path === '/'
                ? `${SITE_URL}/`
                : `${SITE_URL}${entry.path}`

            return [
                '  <url>',
                `    <loc>${escapeHtml(absolutePath)}</loc>`,
                `    <lastmod>${today}</lastmod>`,
                `    <changefreq>${entry.changefreq}</changefreq>`,
                `    <priority>${entry.priority}</priority>`,
                '  </url>'
            ].join('\n')
        })
        .join('\n')

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        urls,
        '</urlset>',
        ''
    ].join('\n')
}

const sharedText = {
    home: {
        heading: 'Klinický psychológ Rimavská Sobota',
        body: 'Humanitas ponúka odbornú psychologickú starostlivosť, prehľad služieb a možnosť objednania priamo cez web.'
    },
    services: {
        heading: 'Psychologické služby',
        body: 'Prehľad odborných psychologických služieb ambulancie Humanitas. Detailný zoznam služieb je dostupný v aplikácii po načítaní stránky.'
    },
    contact: {
        heading: 'Kontaktujte Humanitas',
        body: 'Napíšte nám cez kontaktný formulár alebo si pozrite kontaktné údaje a ordinačné hodiny v plnej aplikácii.'
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
}

function buildStaticBody(routeKey) {
    if (routeKey === 'domov') {
        return `
            <main style="max-width:960px;margin:0 auto;padding:72px 24px;font-family:system-ui,sans-serif;color:#335940;">
                <p style="letter-spacing:.14em;text-transform:uppercase;font-size:12px;color:#5d715b;margin:0 0 18px;">Humanitas</p>
                <h1 style="font-size:clamp(2.4rem,5vw,4.8rem);line-height:.95;margin:0 0 20px;max-width:12ch;">Klinický psychológ Rimavská Sobota</h1>
                <p style="font-size:1.08rem;line-height:1.75;max-width:60ch;margin:0 0 28px;">Humanitas ponúka odbornú psychologickú starostlivosť, prehľad služieb a možnosť objednania priamo cez web.</p>
                <div style="display:flex;gap:12px;flex-wrap:wrap;">
                    <a href="/sluzby" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#335940;color:#fbf9f3;text-decoration:none;">Pozrieť služby</a>
                    <a href="/kontakt" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#fbf9f3;color:#335940;text-decoration:none;border:1px solid #c9d3c3;">Kontakt</a>
                </div>
            </main>
        `
    }

    if (routeKey === 'services') {
        return `
            <main style="max-width:960px;margin:0 auto;padding:72px 24px;font-family:system-ui,sans-serif;color:#335940;">
                <p style="letter-spacing:.14em;text-transform:uppercase;font-size:12px;color:#5d715b;margin:0 0 18px;">Humanitas</p>
                <h1 style="font-size:clamp(2.1rem,5vw,4.2rem);line-height:.95;margin:0 0 20px;max-width:14ch;">Psychologické služby</h1>
                <p style="font-size:1.08rem;line-height:1.75;max-width:64ch;margin:0;">Prehľad odborných psychologických služieb ambulancie Humanitas. Detailný zoznam služieb je dostupný v aplikácii po načítaní stránky.</p>
            </main>
        `
    }

    if (routeKey === 'contact') {
        return `
            <main style="max-width:960px;margin:0 auto;padding:72px 24px;font-family:system-ui,sans-serif;color:#335940;">
                <p style="letter-spacing:.14em;text-transform:uppercase;font-size:12px;color:#5d715b;margin:0 0 18px;">Humanitas</p>
                <h1 style="font-size:clamp(2.1rem,5vw,4.2rem);line-height:.95;margin:0 0 20px;max-width:12ch;">Kontaktujte Humanitas</h1>
                <p style="font-size:1.08rem;line-height:1.75;max-width:64ch;margin:0;">Napíšte nám cez kontaktný formulár alebo si pozrite kontaktné údaje a ordinačné hodiny v plnej aplikácii.</p>
            </main>
        `
    }

    if (routeKey === 'domov-redirect') {
        return `
            <main style="max-width:720px;margin:0 auto;padding:72px 24px;font-family:system-ui,sans-serif;color:#335940;">
                <h1 style="font-size:2rem;line-height:1.1;margin:0 0 16px;">Presmerovanie na domovskú stránku</h1>
                <p style="font-size:1.05rem;line-height:1.7;margin:0;">Táto adresa slúži len ako kompatibilný vstup. Pokračujte na <a href="/" style="color:#335940;">hlavnú stránku</a>.</p>
                <script>window.location.replace('/');</script>
            </main>
        `
    }

    return '<main></main>'
}

function buildMetaTags({ title, description, canonical }) {
    const imageUrl = absoluteUrl(PRIMARY_OG_IMAGE_PATH)

    return `
        <meta name="description" content="${escapeHtml(description)}">
        <meta name="robots" content="index,follow">
        <meta name="application-name" content="${escapeHtml(SITE_NAME)}">
        <meta name="apple-mobile-web-app-title" content="${escapeHtml(SITE_NAME)}">
        <link rel="canonical" href="${escapeHtml(canonical)}">
        <meta property="og:title" content="${escapeHtml(title)}">
        <meta property="og:description" content="${escapeHtml(description)}">
        <meta property="og:url" content="${escapeHtml(canonical)}">
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">
        <meta property="og:image" content="${escapeHtml(imageUrl)}">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${escapeHtml(title)}">
        <meta name="twitter:description" content="${escapeHtml(description)}">
        <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
    `
}

function buildJsonLd(canonical, title, description) {
    const imageUrl = absoluteUrl(PRIMARY_OG_IMAGE_PATH)
    const logoUrl = absoluteUrl(STRUCTURED_DATA_LOGO_PATH)

    return JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebSite',
                '@id': `${SITE_URL}/#website`,
                url: SITE_URL,
                name: SITE_NAME,
                alternateName: SITE_ALTERNATE_NAME,
                publisher: {
                    '@id': `${SITE_URL}/#clinic`
                }
            },
            {
                '@type': 'MedicalClinic',
                '@id': `${SITE_URL}/#clinic`,
                name: SITE_NAME,
                url: SITE_URL,
                logo: logoUrl,
                image: imageUrl
            },
            {
                '@type': 'WebPage',
                '@id': `${canonical}#webpage`,
                url: canonical,
                name: title,
                description,
                isPartOf: {
                    '@id': `${SITE_URL}/#website`
                },
                about: {
                    '@id': `${SITE_URL}/#clinic`
                }
            }
        ]
    })
}

async function renderRoute(templateHtml, routeKey, fileName, seoConfig) {
    const canonical = seoConfig.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${seoConfig.path}`
    const metaTags = buildMetaTags({
        title: seoConfig.title,
        description: seoConfig.description,
        canonical
    })
    const jsonLd = buildJsonLd(canonical, seoConfig.title, seoConfig.description)
    const prerenderedBody = buildStaticBody(routeKey)

    const withLang = templateHtml.replace('<html lang="en">', '<html lang="sk">')
    const withTitle = withLang.replace('<title>HUMANITAS</title>', `<title>${escapeHtml(seoConfig.title)}</title>`)
    const withHead = withTitle.replace(
        '</head>',
        `
${metaTags}
        <script type="application/ld+json">${jsonLd}</script>
    </head>`
    )

    const withBody = withHead.replace(
        '<div id="app"></div>',
        `<div id="app">${prerenderedBody}</div>`
    )

    const outputDir = path.join(distDir, fileName)
    await mkdir(outputDir, { recursive: true })
    await writeFile(path.join(outputDir, 'index.html'), withBody, 'utf8')
}

async function main() {
    const templateHtml = await readFile(indexFilePath, 'utf8')
    const rootEnv = await readEnvFromFile(path.join(projectRoot, '.env'))
    const productionEnv = await readEnvFromFile(path.join(projectRoot, '.env.production'))
    const envValues = {
        ...rootEnv,
        ...productionEnv
    }

    let dynamicServicePaths = []
    let dynamicEmployeePaths = []

    try {
        const dynamicRoutes = await fetchDynamicRoutes(envValues)
        dynamicServicePaths = dynamicRoutes.services
        dynamicEmployeePaths = dynamicRoutes.employees
    } catch (error) {
        console.warn(`[prerender] Dynamic sitemap generation skipped: ${error.message}`)
    }

    await renderRoute(templateHtml, 'home', '', PAGE_SEO.home)
    await renderRoute(templateHtml, 'services', 'sluzby', PAGE_SEO.services)
    await renderRoute(templateHtml, 'contact', 'kontakt', PAGE_SEO.contact)
    await renderRoute(templateHtml, 'domov-redirect', 'domov', {
        path: '/domov',
        title: 'Domov – Humanitas',
        description: 'Presmerovanie na hlavnú stránku Humanitas.'
    })

    const sitemapXml = buildSitemapXml(dynamicServicePaths, dynamicEmployeePaths)
    await writeFile(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf8')
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})