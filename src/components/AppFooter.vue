<script setup>
import { computed } from 'vue'
import { useClinviaPublicSite } from '../composables/useClinviaPublicSite'

const {
    data
} = useClinviaPublicSite()

const footerData = computed(() => {
    return data.value ?? null
})

const company = computed(() => {
    return footerData.value?.company ?? null
})

const branch = computed(() => {
    return footerData.value?.branch ?? null
})

const publicSite = computed(() => {
    return footerData.value?.publicSite ??
        footerData.value?.public_site ??
        null
})

const currentYear = new Date().getFullYear()

const displayedBranchName = computed(() => {
    return branch.value?.name ||
        company.value?.name ||
        company.value?.legalName ||
        company.value?.legal_name ||
        'Humanitas'
})

const displayedCompanyName = computed(() => {
    return company.value?.legalName ||
        company.value?.legal_name ||
        company.value?.name ||
        'Humanitas'
})

const branchDescription = computed(() => {
    return branch.value?.description ?? null
})

const branchAddress = computed(() => {
    const normalizedLines =
        branch.value?.address?.lines

    if (normalizedLines?.length) {
        return normalizedLines
    }

    const address = branch.value?.address

    if (!address) {
        return []
    }

    return [
        address.line1 ?? address.line_1,
        address.line2 ?? address.line_2,
        [
            address.postalCode ?? address.postal_code,
            address.city
        ]
            .filter(Boolean)
            .join(' '),
        address.country
    ].filter(Boolean)
})

const companyAddress = computed(() => {
    const registeredAddress =
        company.value?.registeredAddress ??
        company.value?.registered_address

    if (registeredAddress?.lines?.length) {
        return registeredAddress.lines
    }

    if (!registeredAddress) {
        return []
    }

    return [
        registeredAddress.line1 ??
            registeredAddress.line_1,
        registeredAddress.line2 ??
            registeredAddress.line_2,
        [
            registeredAddress.postalCode ??
                registeredAddress.postal_code,
            registeredAddress.city
        ]
            .filter(Boolean)
            .join(' '),
        registeredAddress.country
    ].filter(Boolean)
})

const contacts = computed(() => {
    const branchContacts =
        branch.value?.contacts ?? []

    if (branchContacts.length) {
        return branchContacts
    }

    const fallbackContacts = []

    if (branch.value?.phone) {
        fallbackContacts.push({
            type: 'phone',
            value: branch.value.phone
        })
    }

    if (branch.value?.bookingPhone) {
        fallbackContacts.push({
            type: 'booking_phone',
            value: branch.value.bookingPhone
        })
    }

    if (branch.value?.booking_phone) {
        fallbackContacts.push({
            type: 'booking_phone',
            value: branch.value.booking_phone
        })
    }

    if (branch.value?.email) {
        fallbackContacts.push({
            type: 'email',
            value: branch.value.email
        })
    }

    return fallbackContacts
})

const phoneContact = computed(() => {
    return contacts.value.find((contact) => {
        return contact.type === 'phone'
    }) ?? contacts.value.find((contact) => {
        return contact.type === 'booking_phone'
    }) ?? null
})

const emailContact = computed(() => {
    return contacts.value.find((contact) => {
        return contact.type === 'email'
    }) ?? null
})

const formattedBranchAddress = computed(() => {
    return branchAddress.value.join(', ')
})

const formattedCompanyAddress = computed(() => {
    return companyAddress.value.join(', ')
})

const openingHours = computed(() => {
    return branch.value?.openingHours ??
        branch.value?.opening_hours ??
        []
})

const companyIco = computed(() => {
    return company.value?.ico ??
        company.value?.companyIdNumber ??
        company.value?.company_id_number ??
        null
})

const companyDic = computed(() => {
    return company.value?.dic ??
        company.value?.taxId ??
        company.value?.tax_id ??
        null
})

const privacyUrl = computed(() => {
    return publicSite.value?.privacyUrl ??
        publicSite.value?.privacy_url ??
        null
})

const cookiesUrl = computed(() => {
    return publicSite.value?.cookiesUrl ??
        publicSite.value?.cookies_url ??
        null
})

const legalLinks = computed(() => {
    return [
        {
            label: 'Ochrana osobných údajov',
            url: privacyUrl.value
        },
        {
            label: 'Cookies',
            url: cookiesUrl.value
        }
    ].filter((link) => {
        return Boolean(link.url)
    })
})

const ambulances = [
    {
        name: 'Mentis',
        logo: '/images/mentis_logo.png',
        nameClass: ['text-[#BB5264]'],
        href: 'https://humanitas.sk',
    },
    {
        name: 'Humanitas',
        logo: '/images/humanitas_logo.png',
        href: 'https://humanitas.sk',
    }
]

function contactHref(contact) {
    if (!contact?.value) {
        return null
    }

    if (contact.type === 'email') {
        return `mailto:${contact.value}`
    }

    if (
        contact.type === 'phone' ||
        contact.type === 'booking_phone'
    ) {
        return `tel:${contact.value.replace(
            /[^\d+]/g,
            ''
        )}`
    }

    return null
}

function openingHoursDayLabel(entry) {
    if (entry.label) {
        return entry.label
    }

    const day =
        entry.dayOfWeek ??
        entry.day_of_week ??
        entry.day

    return {
        1: 'Pondelok',
        2: 'Utorok',
        3: 'Streda',
        4: 'Štvrtok',
        5: 'Piatok',
        6: 'Sobota',
        7: 'Nedeľa',
        monday: 'Pondelok',
        tuesday: 'Utorok',
        wednesday: 'Streda',
        thursday: 'Štvrtok',
        friday: 'Piatok',
        saturday: 'Sobota',
        sunday: 'Nedeľa'
    }[day] ?? day ?? ''
}

function openingHoursSchedule(entry) {
    if (
        entry.isClosed ||
        entry.is_closed
    ) {
        return 'Zatvorené'
    }

    if (entry.schedule) {
        return entry.schedule
    }

    const intervals = entry.intervals ?? []

    if (!intervals.length) {
        return 'Neuvedené'
    }

    return intervals
        .map((interval) => {
            const opensAt =
                interval.opensAt ??
                interval.opens_at

            const closesAt =
                interval.closesAt ??
                interval.closes_at

            if (!opensAt || !closesAt) {
                return null
            }

            return `${String(opensAt).slice(0, 5)} – ${String(closesAt).slice(0, 5)}`
        })
        .filter(Boolean)
        .join(', ')
}

function isExternalUrl(url) {
    return /^https?:\/\//i.test(url)
}

function linkAttrs(url) {
    if (!url || !isExternalUrl(url)) {
        return {}
    }

    return {
        target: '_blank',
        rel: 'noopener noreferrer'
    }
}
</script>

<template>
    <footer class="bg-baige px-6 pt-20 sm:pt-10 pb-4 text-green">
        <div class="mx-auto w-full">

            <!-- Main footer sections -->
            <div
                class="grid grid-cols-1 gap-x-12 gap-y-14 pt-14 lg:grid-cols-3 sm:grid-cols-2 sm:pt-16 xl:gap-x-30"
            >
                <!-- Contact -->
                <section class="lg:mx-auto w-full max-w-[350px]">
                    <h2 class="text-regular font-bold text-green">
                        Kontakt
                    </h2>

                    <div class="mt-6 flex flex-col gap-1">
                        <a
                            v-if="phoneContact"
                            :href="contactHref(phoneContact)"
                            class="group flex min-h-9 items-center gap-3"
                        >
                            <span
                                class="flex shrink-0 items-center justify-center text-green"
                            >
                                <i
                                    class="bi bi-telephone text-base"
                                    aria-hidden="true"
                                />
                            </span>

                            <span
                                class="text-regular break-words text-green transition-opacity group-hover:opacity-55"
                            >
                                {{ phoneContact.value }}
                            </span>
                        </a>

                        <a
                            v-if="emailContact"
                            :href="contactHref(emailContact)"
                            class="group flex min-h-9 items-center gap-3"
                        >
                            <span
                                class="flex shrink-0 items-center justify-center text-green"
                            >
                                <i
                                    class="bi bi-envelope text-base"
                                    aria-hidden="true"
                                />
                            </span>

                            <span
                                class="text-regular min-w-0 break-words text-green transition-opacity group-hover:opacity-55"
                            >
                                {{ emailContact.value }}
                            </span>
                        </a>

                        <div
                            v-if="formattedBranchAddress"
                            class="flex min-h-9 items-start gap-3"
                        >
                            <span
                                class="flex shrink-0 items-center justify-center text-green"
                            >
                                <i
                                    class="bi bi-geo-alt text-base"
                                    aria-hidden="true"
                                />
                            </span>

                            <span class="text-regular pt-2 text-green">
                                {{ formattedBranchAddress }}
                            </span>
                        </div>
                    </div>
                </section>

                <!-- Opening hours -->
                <section class="lg:mx-auto w-full max-w-[350px]">
                    <h2 class="text-regular font-bold text-green">
                        Otváracie hodiny
                    </h2>

                    <div
                        v-if="openingHours.length"
                        class="mt-6 flex flex-col"
                    >
                        <div
                            v-for="entry in openingHours"
                            :key="`${entry.dayOfWeek || entry.day_of_week || entry.day}-${openingHoursSchedule(entry)}`"
                            class="grid min-h-9 grid-cols-[minmax(0,1fr)_auto] items-center gap-4"
                        >
                            <span class="text-regular text-green">
                                {{ openingHoursDayLabel(entry) }}
                            </span>

                            <span
                                class="text-regular text-right text-green"
                            >
                                {{ openingHoursSchedule(entry) }}
                            </span>
                        </div>
                    </div>

                    <p
                        v-else
                        class="text-regular mt-6 text-green/50"
                    >
                        Otváracie hodiny zatiaľ nie sú uvedené.
                    </p>
                </section>

                <!-- Company -->
                <section class="w-full max-w-[350px] lg:mx-auto">
                    <div>
                        <h2 class="text-regular font-bold text-green">
                            Prevádzkovateľ
                        </h2>

                        <div class="mt-6 flex flex-col gap-3">
                            <p class="text-regular flex min-h-9 items-center text-green">
                                {{ displayedCompanyName }}
                            </p>

                            <div class="flex flex-col gap-1 text-regular text-green">
                                <p
                                    v-if="formattedCompanyAddress"
                                    class="break-words"
                                >
                                    {{ formattedCompanyAddress }}
                                </p>

                                <p>
                                    IČO: {{ companyIco }}
                                </p>

                                <p>
                                    DIČ: {{ companyDic }}
                                </p>
                            </div>
                        </div>

                        <div class="mt-6 flex flex-col gap-3">
                            <a
                                v-for="ambulance in ambulances"
                                :key="ambulance.name"
                                :href="ambulance.href"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="group flex min-h-9 w-fit items-center gap-2 transition-opacity hover:opacity-60"
                                :aria-label="`Navštíviť web ${ambulance.name}`"
                            >
                                <img
                                    :src="ambulance.logo"
                                    :alt="ambulance.name"
                                    class="h-7 w-auto max-w-10 shrink-0 object-contain"
                                >

                                <span
                                    class="heading uppercase"
                                    :class="ambulance.nameClass"
                                >
                                    {{ ambulance.name }}
                                </span>
                            </a>
                        </div>
                    </div>
                </section>
            </div>

            <!-- Bottom bar -->
            <div
                class="mt-14 flex flex-col gap-5 sm:mt-16 sm:flex-row sm:items-center sm:justify-between"
            >
                <p class="text-regular text-green">
                    © {{ currentYear }} {{ displayedBranchName }}
                </p>

                <nav
                    class="flex flex-wrap items-center gap-x-6 gap-y-3"
                    aria-label="Právne odkazy"
                >
                    <a
                        href="/ochrana-osobnych-udajov"
                        class="text-regular text-green/60 transition-opacity hover:opacity-55"
                    >
                        Ochrana osobných údajov
                    </a>

                    <a
                        href="/cookies"
                        class="text-regular text-green/60 transition-opacity hover:opacity-55"
                    >
                        Cookies
                    </a>
                </nav>
            </div>
        </div>
    </footer>
</template>