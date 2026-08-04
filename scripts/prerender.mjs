import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
    PAGE_SEO,
    PRIMARY_OG_IMAGE_PATH,
    SITE_NAME,
    SITE_URL,
    absoluteUrl
} from '../src/seo/site.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const distDir = path.join(projectRoot, 'dist')
const indexFilePath = path.join(distDir, 'index.html')

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
    return JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebSite',
                '@id': `${SITE_URL}/#website`,
                url: SITE_URL,
                name: SITE_NAME
            },
            {
                '@type': 'WebPage',
                '@id': `${canonical}#webpage`,
                url: canonical,
                name: title,
                description
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

    await renderRoute(templateHtml, 'home', '', PAGE_SEO.home)
    await renderRoute(templateHtml, 'services', 'sluzby', PAGE_SEO.services)
    await renderRoute(templateHtml, 'contact', 'kontakt', PAGE_SEO.contact)
    await renderRoute(templateHtml, 'domov-redirect', 'domov', {
        path: '/domov',
        title: 'Domov – Humanitas',
        description: 'Presmerovanie na hlavnú stránku Humanitas.'
    })
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})