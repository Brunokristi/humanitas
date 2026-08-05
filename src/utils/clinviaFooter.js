const DAY_LABELS = {
    monday: 'Pondelok',
    tuesday: 'Utorok',
    wednesday: 'Streda',
    thursday: 'Štvrtok',
    friday: 'Piatok',
    saturday: 'Sobota',
    sunday: 'Nedeľa'
}

const DAY_BY_NUMBER = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
    7: 'sunday'
}

function cleanText(value) {
    if (typeof value !== 'string') {
        return null
    }

    const trimmed = value.trim()

    return trimmed.length > 0
        ? trimmed
        : null
}

export function buildClinviaPublicEndpoint(baseUrl, companyId) {
    const normalizedBaseUrl = cleanText(baseUrl)
    const normalizedCompanyId = cleanText(`${companyId ?? ''}`)

    if (!normalizedBaseUrl || !normalizedCompanyId) {
        return null
    }

    const withoutTrailingSlash = normalizedBaseUrl.replace(/\/+$/, '')
    const withoutApiSuffix = withoutTrailingSlash.replace(/\/api$/i, '')

    return `${withoutApiSuffix}/public/companies/${encodeURIComponent(normalizedCompanyId)}`
}

export function formatAddress(address) {
    if (!address || typeof address !== 'object') {
        return {
            street: null,
            postalCode: null,
            city: null,
            country: null,
            lines: []
        }
    }

    const street = cleanText(address.street)
    const postalCode = cleanText(address.postal_code)
    const city = cleanText(address.city)
    const country = cleanText(address.country)

    const cityLine = [postalCode, city]
        .filter(Boolean)
        .join(' ')
        .trim()

    const lines = [
        street,
        cityLine || null,
        country
    ].filter(Boolean)

    return {
        street,
        postalCode,
        city,
        country,
        lines
    }
}

function formatDayLabel(dayKey, fallbackLabel = null) {
    const normalizedDay = cleanText(dayKey)?.toLowerCase()

    if (normalizedDay && DAY_LABELS[normalizedDay]) {
        return DAY_LABELS[normalizedDay]
    }

    return cleanText(fallbackLabel)
}

export function formatOpeningHours(openingHours) {
    if (!Array.isArray(openingHours)) {
        return []
    }

    return openingHours
        .map((entry) => {
            if (!entry || typeof entry !== 'object') {
                return null
            }

            const label = formatDayLabel(entry.day, entry.label)
            const isClosed = Boolean(entry.is_closed)
            const opensAt = cleanText(entry.opens_at)
            const closesAt = cleanText(entry.closes_at)

            const schedule = isClosed
                ? 'Zatvorené'
                : [opensAt, closesAt]
                    .filter(Boolean)
                    .join(' – ')

            return {
                day: cleanText(entry.day),
                label,
                isClosed,
                opensAt,
                closesAt,
                schedule: cleanText(schedule)
            }
        })
        .filter((entry) => Boolean(entry?.label || entry?.schedule))
}

function toHourMinute(value) {
    const normalized = cleanText(value)

    if (!normalized) {
        return null
    }

    return normalized.slice(0, 5)
}

function pickBranch(rawCompanyData, requestedBranchIdentifier = null) {
    if (!Array.isArray(rawCompanyData?.branches)) {
        return {}
    }

    const branches = rawCompanyData.branches

    if (branches.length === 0) {
        return {}
    }

    const normalizedRequestedBranchIdentifier = cleanText(
        `${requestedBranchIdentifier ?? ''}`
    )

    if (!normalizedRequestedBranchIdentifier) {
        return branches[0] ?? {}
    }

    const byId = branches.find(
        (branch) => `${branch?.id ?? ''}` === normalizedRequestedBranchIdentifier
    )

    if (byId) {
        return byId
    }

    const bySlug = branches.find(
        (branch) => cleanText(branch?.slug) === normalizedRequestedBranchIdentifier
    )

    return bySlug ?? branches[0] ?? {}
}

function normalizeBranchAddress(branch) {
    return formatAddress({
        street: cleanText(branch?.address_line_1),
        postal_code: cleanText(branch?.postal_code),
        city: cleanText(branch?.city),
        country: cleanText(branch?.country)
    })
}

function normalizeCompanyAddress(company) {
    return formatAddress({
        street: cleanText(company?.registered_address?.street) || cleanText(company?.address_line_1),
        postal_code: cleanText(company?.registered_address?.postal_code) || cleanText(company?.postal_code),
        city: cleanText(company?.registered_address?.city) || cleanText(company?.city),
        country: cleanText(company?.registered_address?.country) || cleanText(company?.country)
    })
}

function pickCompanyField(company, fieldNames) {
    if (!company || typeof company !== 'object') {
        return null
    }

    for (const fieldName of fieldNames) {
        const value = cleanText(company[fieldName])

        if (value) {
            return value
        }
    }

    return null
}

function pickCompanyFieldFromObject(source, fieldNames) {
    if (!source || typeof source !== 'object') {
        return null
    }

    for (const fieldName of fieldNames) {
        const value = cleanText(source[fieldName])

        if (value) {
            return value
        }
    }

    return null
}

function pickCompanyIdentifier(company, fieldNames) {
    const directValue = pickCompanyField(company, fieldNames)

    if (directValue) {
        return directValue
    }

    const nestedCandidates = [
        company?.identification,
        company?.legal,
        company?.billing,
        company?.invoice,
        company?.company,
        company?.company_data,
        company?.companyData,
        company?.data,
        company?.data?.company,
        company?.data?.identification,
        company?.data?.company_data,
        company?.data?.companyData,
        company?.metadata,
        company?.company?.identification,
        company?.company?.company,
        company?.company?.company_data,
        company?.company?.companyData,
        company?.data?.company?.identification,
        company?.data?.company?.company,
        company?.data?.company?.company_data,
        company?.data?.company?.companyData
    ]

    for (const nestedCandidate of nestedCandidates) {
        const nestedValue = pickCompanyFieldFromObject(
            nestedCandidate,
            fieldNames
        )

        if (nestedValue) {
            return nestedValue
        }
    }

    return null
}

function pickContactValue(contacts, type) {
    if (!Array.isArray(contacts)) {
        return null
    }

    const sortedContacts = [...contacts]
        .filter((contact) => contact && typeof contact === 'object')
        .sort((a, b) => {
            if (a.is_primary === b.is_primary) {
                return (a.sort_order ?? 0) - (b.sort_order ?? 0)
            }

            return a.is_primary
                ? -1
                : 1
        })

    const contact = sortedContacts.find((entry) => cleanText(entry.type) === type)

    return cleanText(contact?.value)
}

function normalizePublicSite(company, branch) {
    const candidate =
        branch?.public_site ??
        company?.public_site ??
        {}

    return {
        logoUrl: cleanText(candidate.logo_url) || cleanText(candidate.logo),
        privacyUrl: cleanText(candidate.privacy_url),
        termsUrl: cleanText(candidate.terms_url),
        cookiesUrl: cleanText(candidate.cookies_url),
        socials: normalizeSocialLinks(candidate)
    }
}

function normalizeOpeningHours(rawOpeningHours) {
    if (!Array.isArray(rawOpeningHours)) {
        return []
    }

    return rawOpeningHours
        .map((entry) => {
            if (!entry || typeof entry !== 'object') {
                return null
            }

            const dayKey = DAY_BY_NUMBER[entry.day_of_week] || null
            const label = formatDayLabel(dayKey, entry.label)
            const isClosed = Boolean(entry.is_closed)

            const intervals = Array.isArray(entry.intervals)
                ? entry.intervals
                : []

            const intervalText = intervals
                .map((interval) => {
                    const opensAt = toHourMinute(interval?.opens_at)
                    const closesAt = toHourMinute(interval?.closes_at)

                    if (!opensAt || !closesAt) {
                        return null
                    }

                    return `${opensAt} – ${closesAt}`
                })
                .filter(Boolean)
                .join(', ')

            const schedule = isClosed
                ? 'Zatvorené'
                : cleanText(intervalText)

            return {
                day: dayKey,
                label,
                isClosed,
                opensAt: null,
                closesAt: null,
                schedule
            }
        })
        .filter((entry) => Boolean(entry?.label || entry?.schedule))
}

function normalizeSocialLinks(publicSite) {
    const rawSocialLinks =
        publicSite?.socials ??
        publicSite?.social_links ??
        publicSite?.social_media ??
        publicSite?.socialMedia ??
        null

    if (!rawSocialLinks) {
        return []
    }

    if (Array.isArray(rawSocialLinks)) {
        return rawSocialLinks
            .map((entry) => {
                if (!entry || typeof entry !== 'object') {
                    return null
                }

                const label = cleanText(entry.label) || cleanText(entry.name) || cleanText(entry.platform)
                const url = cleanText(entry.url) || cleanText(entry.href)

                if (!label || !url) {
                    return null
                }

                return {
                    label,
                    url
                }
            })
            .filter(Boolean)
    }

    if (typeof rawSocialLinks === 'object') {
        return Object.entries(rawSocialLinks)
            .map(([label, value]) => {
                if (typeof value === 'string') {
                    const url = cleanText(value)
                    return url
                        ? {
                            label: cleanText(label) || 'Sociálna sieť',
                            url
                        }
                        : null
                }

                if (!value || typeof value !== 'object') {
                    return null
                }

                const url = cleanText(value.url) || cleanText(value.href)

                return url
                    ? {
                        label: cleanText(value.label) || cleanText(value.name) || cleanText(label) || 'Sociálna sieť',
                        url
                    }
                    : null
            })
            .filter(Boolean)
    }

    return []
}

export function normalizeClinviaPublicFooterData(payload = {}, options = {}) {
    const company = payload?.data && typeof payload.data === 'object'
        ? payload.data
        : payload?.company && typeof payload.company === 'object'
            ? payload.company
            : {}

    const requestedBranchIdentifier = cleanText(
        `${options?.branchIdentifier ?? ''}`
    )

    const branch = payload?.branch && typeof payload.branch === 'object'
        ? payload.branch
        : pickBranch(company, requestedBranchIdentifier)

    const companyIdentifierSource =
        branch?.company && typeof branch.company === 'object'
            ? {
                ...company,
                company: branch.company
            }
            : company

    const publicSite = payload?.public_site && typeof payload.public_site === 'object'
        ? payload.public_site
        : normalizePublicSite(company, branch)

    return {
        company: {
            name: cleanText(company.name) || cleanText(branch?.company?.name),
            legalName: cleanText(company.legal_name) || cleanText(branch?.company?.legal_name),
            ico: pickCompanyIdentifier(companyIdentifierSource, [
                'ico',
                'company_id_number',
                'company_ico',
                'ico_number',
                'registration_number'
            ]),
            dic: pickCompanyIdentifier(companyIdentifierSource, [
                'dic',
                'tax_id',
                'company_dic',
                'dic_number',
                'tin'
            ]),
            icDph: pickCompanyIdentifier(companyIdentifierSource, [
                'ic_dph',
                'icdph',
                'vat_id',
                'vat_number',
                'company_vat_id'
            ]),
            email: cleanText(company.email),
            phone: cleanText(company.phone),
            website: cleanText(company.website),
            registeredAddress: normalizeCompanyAddress(company)
        },
        branch: {
            name: cleanText(branch.name),
            description: cleanText(branch.description),
            email: cleanText(branch.email) || pickContactValue(branch.contacts, 'email'),
            phone: cleanText(branch.phone) || pickContactValue(branch.contacts, 'phone'),
            address: normalizeBranchAddress(branch),
            openingHours: normalizeOpeningHours(branch.opening_hours)
        },
        publicSite: {
            logoUrl: cleanText(publicSite.logo_url) || cleanText(publicSite.logo),
            privacyUrl: cleanText(publicSite.privacy_url),
            termsUrl: cleanText(publicSite.terms_url),
            cookiesUrl: cleanText(publicSite.cookies_url),
            socials: normalizeSocialLinks(publicSite)
        }
    }
}
