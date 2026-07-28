<script setup>
import { computed } from 'vue'
import { useClinviaPublicSite } from '../composables/useClinviaPublicSite'

const {
    data,
    loading,
    error,
    logoUrl,
    markLogoFallbackFailed,
    load
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

    if (branch.value?.website) {
        fallbackContacts.push({
            type: 'website',
            value: branch.value.website
        })
    }

    if (
        !branch.value?.website &&
        company.value?.website
    ) {
        fallbackContacts.push({
            type: 'website',
            value: company.value.website
        })
    }

    return fallbackContacts
})

const openingHours = computed(() => {
    return branch.value?.openingHours ??
        branch.value?.opening_hours ??
        []
})

const contractedInsuranceCompanies = computed(() => {
    return branch.value
        ?.contractedInsuranceCompanies ??
        branch.value
            ?.contracted_insurance_companies ??
        []
})

const otherCompanyBranches = computed(() => {
    return footerData.value?.otherBranches ??
        footerData.value?.other_branches ??
        branch.value?.otherCompanyBranches ??
        branch.value?.other_company_branches ??
        publicSite.value?.otherBranches ??
        publicSite.value?.other_branches ??
        []
})

const showOtherBranches = computed(() => {
    const setting =
        branch.value?.showOtherBranchesInFooter ??
        branch.value
            ?.show_other_branches_in_footer

    /*
     * When the API does not provide the setting,
     * display branches whenever they exist.
     */
    return setting === undefined
        ? otherCompanyBranches.value.length > 0
        : Boolean(setting) &&
            otherCompanyBranches.value.length > 0
})

const footerIds = computed(() => {
    const parts = []

    const ico =
        company.value?.ico ??
        company.value?.companyIdNumber ??
        company.value?.company_id_number

    const dic =
        company.value?.dic ??
        company.value?.taxId ??
        company.value?.tax_id

    const icDph =
        company.value?.icDph ??
        company.value?.ic_dph ??
        company.value?.vatId ??
        company.value?.vat_id

    if (ico) {
        parts.push(`IČO ${ico}`)
    }

    if (dic) {
        parts.push(`DIČ ${dic}`)
    }

    if (icDph) {
        parts.push(`IČ DPH ${icDph}`)
    }

    return parts
})

const hasLegalLinks = computed(() => {
    return Boolean(
        publicSite.value?.privacyUrl ||
        publicSite.value?.privacy_url ||
        publicSite.value?.termsUrl ||
        publicSite.value?.terms_url ||
        publicSite.value?.cookiesUrl ||
        publicSite.value?.cookies_url
    )
})

const hasFooterData = computed(() => {
    return Boolean(
        company.value ||
        branch.value ||
        publicSite.value
    )
})

const privacyUrl = computed(() => {
    return publicSite.value?.privacyUrl ??
        publicSite.value?.privacy_url ??
        null
})

const termsUrl = computed(() => {
    return publicSite.value?.termsUrl ??
        publicSite.value?.terms_url ??
        null
})

const cookiesUrl = computed(() => {
    return publicSite.value?.cookiesUrl ??
        publicSite.value?.cookies_url ??
        null
})

const socialLinks = computed(() => {
    const providedSocials =
        publicSite.value?.socials ?? []

    if (providedSocials.length) {
        return providedSocials
    }

    return contacts.value
        .filter((contact) => {
            return [
                'facebook',
                'instagram'
            ].includes(contact.type)
        })
        .map((contact) => {
            return {
                label: contact.type === 'facebook'
                    ? 'Facebook'
                    : 'Instagram',
                url: contact.value
            }
        })
})

const mainContacts = computed(() => {
    return contacts.value.filter((contact) => {
        return ![
            'facebook',
            'instagram'
        ].includes(contact.type)
    })
})

function contactLabel(contact) {
    return {
        email: 'E-mail',
        phone: 'Telefón',
        booking_phone: 'Objednávanie',
        website: 'Web',
        facebook: 'Facebook',
        instagram: 'Instagram'
    }[contact.type] ?? contact.label ?? null
}

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

    if (
        contact.type === 'website' ||
        contact.type === 'facebook' ||
        contact.type === 'instagram'
    ) {
        return normalizeUrl(contact.value)
    }

    return null
}

function normalizeUrl(url) {
    if (!url) {
        return null
    }

    if (
        /^https?:\/\//i.test(url) ||
        url.startsWith('/')
    ) {
        return url
    }

    return `https://${url}`
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

function insuranceLabel(insurance) {
    return insurance.label ??
        insurance.name ??
        insurance.code ??
        ''
}

function otherBranchName(branchItem) {
    return branchItem.name ??
        branchItem.branchName ??
        branchItem.branch_name ??
        'Pobočka'
}

function otherBranchSecondaryLabel(branchItem) {
    return branchItem.city ||
        branchItem.addressLine1 ||
        branchItem.address_line_1 ||
        branchItem.address?.city ||
        branchItem.address?.line1 ||
        branchItem.address?.line_1 ||
        null
}

function otherBranchHref(branchItem) {
    return branchItem.href ??
        branchItem.url ??
        branchItem.publicUrl ??
        branchItem.public_url ??
        '#'
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

function onLogoError() {
    markLogoFallbackFailed()
}
</script>

<template>
    <footer class="bg-baige text-green p-5">
        <div class="mx-auto w-full pb-10 pt-20 sm:pb-12 sm:pt-28 lg:pt-32">
            <!-- Loading -->
            <div
                v-if="loading"
                class="space-y-20"
            >
                <div class="grid gap-x-20 gap-y-16 md:grid-cols-2">
                    <div>
                        <div class="h-16 w-44 animate-pulse rounded-full bg-green/8" />

                        <div class="mt-10 space-y-4">
                            <div class="h-5 w-56 animate-pulse rounded-full bg-green/8" />
                            <div class="h-4 w-72 animate-pulse rounded-full bg-green/8" />
                            <div class="h-4 w-52 animate-pulse rounded-full bg-green/8" />
                        </div>
                    </div>

                    <div class="space-y-5 md:pt-28">
                        <div class="h-5 w-40 animate-pulse rounded-full bg-green/8" />
                        <div class="h-4 w-full animate-pulse rounded-full bg-green/8" />
                        <div class="h-4 w-5/6 animate-pulse rounded-full bg-green/8" />
                    </div>
                </div>

                <div class="grid gap-12 md:grid-cols-2">
                    <div class="h-24 animate-pulse rounded-3xl bg-green/8" />
                    <div class="h-24 animate-pulse rounded-3xl bg-green/8" />
                </div>
            </div>

            <!-- Error -->
            <div
                v-else-if="error"
                class="max-w-2xl py-10"
            >
                <p class="heading">
                    Údaje sa nepodarilo načítať
                </p>

                <p class="text-regular mt-4 max-w-xl text-green/60">
                    {{ error }}
                </p>

                <button
                    type="button"
                    class="text-bold mt-8 transition-opacity hover:opacity-55"
                    @click="load"
                >
                    Skúsiť znova
                </button>
            </div>

            <!-- Footer content -->
            <div
                v-else-if="hasFooterData"
                class="space-y-20 sm:space-y-24"
            >
                <!-- Main footer content -->
                <div class="grid gap-x-20 gap-y-16 md:grid-cols-2">
                    <!-- Left: branch and contacts -->
                    <section>
                        <img
                            :src="logoUrl"
                            :alt="displayedBranchName"
                            class="h-16 w-auto max-w-[220px] object-contain object-left sm:h-20"
                            @error="onLogoError"
                        >

                        <div class="mt-10">
                            <p class="heading">
                                {{ displayedBranchName }}
                            </p>

                            <div
                                v-if="branchAddress.length"                            >
                                <p
                                    v-for="line in branchAddress"
                                    :key="line"
                                    class="text-regular text-green/60"
                                >
                                    {{ line }}
                                </p>
                            </div>

                            
                        </div>

                        <div class="mt-12">
                            <p class="text-bold">
                                Kontakt
                            </p>

                            <div
                                v-if="mainContacts.length"
                                class="mt-6 space-y-5"
                            >
                                <div
                                    v-for="(contact, index) in mainContacts"
                                    :key="`${contact.type}-${contact.value}-${index}`"
                                >
                                    <p
                                        v-if="contactLabel(contact)"
                                        class="text-regular text-green/40"
                                    >
                                        {{ contactLabel(contact) }}
                                    </p>

                                    <component
                                        :is="contactHref(contact) ? 'a' : 'p'"
                                        :href="contactHref(contact)"
                                        v-bind="linkAttrs(contactHref(contact))"
                                        class="text-regular mt-1 block w-fit max-w-full break-words text-green/80 transition-opacity hover:opacity-55"
                                    >
                                        {{ contact.value }}
                                    </component>
                                </div>
                            </div>

                            <p
                                v-else
                                class="text-regular mt-6 text-green/50"
                            >
                                Kontaktné údaje zatiaľ nie sú uvedené.
                            </p>

                            <div
                                v-if="socialLinks.length"
                                class="mt-9 flex flex-wrap gap-x-8 gap-y-3"
                            >
                                <a
                                    v-for="social in socialLinks"
                                    :key="`${social.label}-${social.url}`"
                                    :href="normalizeUrl(social.url)"
                                    v-bind="linkAttrs(normalizeUrl(social.url))"
                                    class="text-bold text-green/65 transition-opacity hover:opacity-55"
                                >
                                    {{ social.label }}
                                </a>
                            </div>
                        </div>
                    </section>

                    <!-- Right: opening hours -->
                    <section class="md:pt-[7.5rem]">
                        <p class="text-bold">
                            Otváracie hodiny
                        </p>

                        <div
                            v-if="openingHours.length"
                            class="mt-8 space-y-4"
                        >
                            <div
                                v-for="entry in openingHours"
                                :key="`${entry.dayOfWeek || entry.day_of_week || entry.day}-${openingHoursSchedule(entry)}`"
                                class="grid grid-cols-[minmax(0,1fr)_auto] gap-8"
                            >
                                <p class="text-regular text-green/55">
                                    {{ openingHoursDayLabel(entry) }}
                                </p>

                                <p class="text-regular text-right text-green/85">
                                    {{ openingHoursSchedule(entry) }}
                                </p>
                            </div>
                        </div>

                        <p
                            v-else
                            class="text-regular mt-8 text-green/50"
                        >
                            Otváracie hodiny zatiaľ nie sú uvedené.
                        </p>
                    </section>
                </div>

                <!-- Insurance companies and other branches -->
                <div
                    v-if="
                        contractedInsuranceCompanies.length ||
                        showOtherBranches
                    "
                    class="grid gap-x-20 gap-y-14 md:grid-cols-2"
                >
                    <section
                        v-if="contractedInsuranceCompanies.length"
                    >
                        <p class="text-bold">
                            Zmluvné poisťovne
                        </p>

                        <div class="mt-5 flex flex-wrap gap-x-3 gap-y-2">
                            <template
                                v-for="(insurance, index) in contractedInsuranceCompanies"
                                :key="insurance.id || insuranceLabel(insurance)"
                            >
                                <span class="text-regular text-green/65">
                                    {{ insuranceLabel(insurance) }}
                                </span>

                                <span
                                    v-if="index < contractedInsuranceCompanies.length - 1"
                                    class="text-regular text-green/25"
                                    aria-hidden="true"
                                >
                                    ·
                                </span>
                            </template>
                        </div>
                    </section>

                    <section
                        v-if="showOtherBranches"
                    >
                        <p class="text-bold">
                            Naše pobočky
                        </p>

                        <ul class="mt-5 space-y-5">
                            <li
                                v-for="branchItem in otherCompanyBranches"
                                :key="branchItem.id || otherBranchName(branchItem)"
                            >
                                <a
                                    :href="otherBranchHref(branchItem)"
                                    v-bind="linkAttrs(otherBranchHref(branchItem))"
                                    class="group inline-flex flex-col"
                                >
                                    <span class="text-regular text-green/80 transition-opacity group-hover:opacity-55">
                                        {{ otherBranchName(branchItem) }}
                                    </span>

                                    <span
                                        v-if="otherBranchSecondaryLabel(branchItem)"
                                        class="text-regular mt-1 text-green/40"
                                    >
                                        {{ otherBranchSecondaryLabel(branchItem) }}
                                    </span>
                                </a>
                            </li>
                        </ul>
                    </section>
                </div>

                <!-- Company information -->
                <section class="grid gap-x-16 gap-y-12 md:grid-cols-[1.35fr_1fr]">
                    <div>
                        <p class="text-regular text-green/40">
                            Prevádzkovateľ
                        </p>

                        <p class="text-bold mt-2 text-green/65">
                            {{ displayedCompanyName }}
                        </p>

                        <div
                            v-if="companyAddress.length"
                            class="mt-4"
                        >
                            <p
                                v-for="line in companyAddress"
                                :key="line"
                                class="text-regular text-green/45"
                            >
                                {{ line }}
                            </p>
                        </div>

                        <p
                            v-if="footerIds.length"
                            class="text-regular mt-4 text-green/45"
                        >
                            {{ footerIds.join(' · ') }}
                        </p>

                        <p class="text-regular mt-5 text-green/35">
                            © {{ currentYear }} {{ displayedBranchName }}
                        </p>
                    </div>

                    <nav
                        v-if="hasLegalLinks"
                        class="flex flex-col items-start gap-3 md:items-end md:text-right"
                        aria-label="Právne informácie"
                    >
                        <a
                            v-if="privacyUrl"
                            :href="privacyUrl"
                            v-bind="linkAttrs(privacyUrl)"
                            class="text-regular text-green/45 transition-opacity hover:opacity-55"
                        >
                            Ochrana osobných údajov
                        </a>

                        <a
                            v-if="termsUrl"
                            :href="termsUrl"
                            v-bind="linkAttrs(termsUrl)"
                            class="text-regular text-green/45 transition-opacity hover:opacity-55"
                        >
                            Obchodné podmienky
                        </a>

                        <a
                            v-if="cookiesUrl"
                            :href="cookiesUrl"
                            v-bind="linkAttrs(cookiesUrl)"
                            class="text-regular text-green/45 transition-opacity hover:opacity-55"
                        >
                            Cookies
                        </a>
                    </nav>
                </section>
            </div>

            <!-- Empty state -->
            <div
                v-else
                class="max-w-2xl py-10"
            >
                <p class="heading">
                    Údaje zatiaľ nie sú dostupné
                </p>

                <p class="text-regular mt-4 text-green/60">
                    Po pripojení Clinvia API sa tu zobrazia údaje
                    pobočky, kontakty, otváracie hodiny, poisťovne,
                    ďalšie pobočky a firemné údaje.
                </p>
            </div>
        </div>
    </footer>
</template>