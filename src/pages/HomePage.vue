<script setup>
import { computed, ref } from 'vue'
import { useClinviaPublicSite } from '../composables/useClinviaPublicSite'
import FaqCarousel from '../components/Carousel.vue'
import Button from '../components/Button.vue'

defineProps({
    expanded: {
        type: Boolean,
        default: false
    }
})

const {
    data,
    loading,
    error,
    load
} = useClinviaPublicSite()

const openedFaqIndex = ref(0)

const footerData = computed(() => {
    return data.value ?? null
})

const branch = computed(() => {
    return footerData.value?.branch ?? null
})

const company = computed(() => {
    return footerData.value?.company ?? null
})

const publicSite = computed(() => {
    return (
        footerData.value?.publicSite ??
        footerData.value?.public_site ??
        branch.value?.publicSite ??
        branch.value?.public_site ??
        null
    )
})

const featuredServices = computed(() => {
    return (
        footerData.value?.featuredServices ??
        footerData.value?.featured_services ??
        branch.value?.featuredServices ??
        branch.value?.featured_services ??
        []
    )
})

const homepageServices = computed(() => {
    return featuredServices.value.slice(0, 3)
})

const servicesCount = computed(() => {
    return featuredServices.value.length
})

const professionals = computed(() => {
    return (
        footerData.value?.professionals ??
        footerData.value?.employees ??
        branch.value?.professionals ??
        branch.value?.employees ??
        []
    )
})

const branchName = computed(() => {
    return (
        branch.value?.name ??
        company.value?.name ??
        company.value?.legalName ??
        company.value?.legal_name ??
        'Humanitas'
    )
})

const branchDescription = computed(() => {
    return (
        branch.value?.description ??
        branch.value?.publicDescription ??
        branch.value?.public_description ??
        publicSite.value?.description ??
        publicSite.value?.heroDescription ??
        publicSite.value?.hero_description ??
        'Profesionálna starostlivosť, jasné informácie a jednoduchý kontakt na jednom mieste.'
    )
})

const bookingSettings = computed(() => {
    return (
        branch.value?.bookingSettings ??
        branch.value?.booking_settings ??
        publicSite.value?.bookingSettings ??
        publicSite.value?.booking_settings ??
        null
    )
})

const bookingEnabled = computed(() => {
    return Boolean(
        bookingSettings.value?.isEnabled ??
        bookingSettings.value?.is_enabled
    )
})

const servicesUrl = computed(() => {
    return (
        publicSite.value?.servicesUrl ??
        publicSite.value?.services_url ??
        '/sluzby'
    )
})

const bookingUrl = computed(() => {
    return (
        publicSite.value?.bookingUrl ??
        publicSite.value?.booking_url ??
        '/rezervacia'
    )
})

const contactUrl = computed(() => {
    return (
        publicSite.value?.contactUrl ??
        publicSite.value?.contact_url ??
        '/kontakt'
    )
})

const openingHours = computed(() => {
    return (
        branch.value?.openingHours ??
        branch.value?.opening_hours ??
        []
    )
})

const contacts = computed(() => {
    return branch.value?.contacts ?? []
})

const todayDayOfWeek = computed(() => {
    const day = new Date().getDay()

    return day === 0
        ? 7
        : day
})

const todaysOpeningHours = computed(() => {
    return openingHours.value.find((entry) => {
        const day =
            entry.dayOfWeek ??
            entry.day_of_week ??
            entry.day

        return Number(day) === todayDayOfWeek.value
    }) ?? null
})

const openingHoursTodayLabel = computed(() => {
    const entry = todaysOpeningHours.value

    if (!entry) {
        return 'Dnes neuvedené'
    }

    if (entry.isClosed || entry.is_closed) {
        return 'Dnes zatvorené'
    }

    if (entry.schedule) {
        return `Dnes ${entry.schedule}`
    }

    const intervals = entry.intervals ?? []

    if (!intervals.length) {
        return 'Dnes neuvedené'
    }

    const schedule = intervals
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

    return schedule
        ? `Dnes ${schedule}`
        : 'Dnes neuvedené'
})

const primaryContact = computed(() => {
    return (
        contacts.value.find((contact) => {
            return contact.isPrimary || contact.is_primary
        }) ??
        contacts.value.find((contact) => {
            return [
                'phone',
                'booking_phone'
            ].includes(contact.type)
        }) ??
        contacts.value.find((contact) => {
            return contact.type === 'email'
        }) ??
        contacts.value[0] ??
        null
    )
})

const primaryContactHref = computed(() => {
    const contact = primaryContact.value

    if (!contact?.value) {
        return contactUrl.value
    }

    if (
        contact.type === 'phone' ||
        contact.type === 'booking_phone'
    ) {
        return `tel:${contact.value.replace(/[^\d+]/g, '')}`
    }

    if (contact.type === 'email') {
        return `mailto:${contact.value}`
    }

    if (
        contact.type === 'website' ||
        contact.type === 'facebook' ||
        contact.type === 'instagram'
    ) {
        return normalizeUrl(contact.value)
    }

    return contactUrl.value
})

const primaryContactButtonLabel = computed(() => {
    const contact = primaryContact.value

    if (!contact) {
        return 'Kontaktujte nás'
    }

    if (
        contact.type === 'phone' ||
        contact.type === 'booking_phone'
    ) {
        return 'Zavolajte nám'
    }

    if (contact.type === 'email') {
        return 'Napíšte nám'
    }

    return 'Kontaktujte nás'
})

const branchAddressLabel = computed(() => {
    const address = branch.value?.address

    if (!address) {
        return 'Adresa bude doplnená čoskoro.'
    }

    const line1 =
        address.line1 ??
        address.line_1

    const line2 =
        address.line2 ??
        address.line_2

    const postalCode =
        address.postalCode ??
        address.postal_code

    const city = address.city
    const country = address.country

    const parts = [
        line1,
        line2,
        [postalCode, city]
            .filter(Boolean)
            .join(' '),
        country
    ].filter(Boolean)

    return parts.length
        ? parts.join(', ')
        : 'Adresa bude doplnená čoskoro.'
})

const customFaqItems = computed(() => {
    return (
        publicSite.value?.faqItems ??
        publicSite.value?.faq_items ??
        []
    )
})

const generatedFaq = computed(() => {
    const customQuestions = customFaqItems.value.map((item) => {
        return {
            question: item.question,
            answer: item.answer
        }
    })

    const defaultQuestions = [
        {
            question: 'Kde nás nájdete?',
            answer: `Nájdete nás na adrese: ${branchAddressLabel.value}`
        },
        {
            question: 'Ako sa objednať?',
            answer: primaryContact.value?.value
                ? `Najrýchlejšie sa s nami spojíte cez kontakt ${primaryContact.value.value}.`
                : 'Použite sekciu Kontakt, kde nájdete všetky dostupné možnosti spojenia.'
        },
        {
            question: 'Kedy máme otvorené?',
            answer: openingHoursTodayLabel.value
        }
    ]

    return [
        ...customQuestions,
        ...defaultQuestions
    ]
})

function trimText(value, maxLength = 120) {
    const text = String(value ?? '').trim()

    if (!text) {
        return ''
    }

    if (text.length <= maxLength) {
        return text
    }

    return `${text.slice(0, maxLength).trim()}…`
}

function serviceDescription(service) {
    return trimText(
        service.shortDescription ??
        service.short_description ??
        service.description ??
        'Viac informácií nájdete v detaile služby.',
        130
    )
}

function serviceDurationLabel(service) {
    const duration =
        service.durationMinutes ??
        service.duration_minutes

    if (!duration) {
        return null
    }

    const sessions =
        service.durationSessions ??
        service.duration_sessions ??
        1

    return `${sessions} × ${duration} min`
}

function servicePrice(service) {
    return (
        service.selfPayAmount ??
        service.self_pay_amount ??
        null
    )
}

function serviceUrl(service) {
    return (
        service.url ??
        service.href ??
        service.publicUrl ??
        service.public_url ??
        `${servicesUrl.value}/${service.slug ?? service.id}`
    )
}

function professionalName(professional) {
    return [
        professional.titleBefore ??
            professional.title_before,
        professional.firstName ??
            professional.first_name,
        professional.lastName ??
            professional.last_name,
        professional.titleAfter ??
            professional.title_after
    ]
        .filter(Boolean)
        .join(' ')
}

function professionalInitials(professional) {
    const firstName =
        professional.firstName ??
        professional.first_name ??
        ''

    const lastName =
        professional.lastName ??
        professional.last_name ??
        ''

    return `${firstName.charAt(0)}${lastName.charAt(0)}`
}

function professionalPositions(professional) {
    const positions = professional.positions

    if (Array.isArray(positions)) {
        return positions.filter(Boolean)
    }

    const position =
        professional.position ??
        professional.jobTitle ??
        professional.job_title ??
        ''

    return String(position)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
}

function professionalPhoto(professional) {
    return (
        professional.photoUrl ??
        professional.photo_url ??
        professional.imageUrl ??
        professional.image_url ??
        null
    )
}

function professionalBio(professional) {
    return (
        professional.bio ??
        professional.description ??
        null
    )
}

function normalizeUrl(url) {
    if (!url) {
        return null
    }

    if (
        /^https?:\/\//i.test(url) ||
        url.startsWith('/') ||
        url.startsWith('mailto:') ||
        url.startsWith('tel:')
    ) {
        return url
    }

    return `https://${url}`
}

function toggleFaq(index) {
    openedFaqIndex.value =
        openedFaqIndex.value === index
            ? null
            : index
}
</script>

<template>
    <div class="">
        <div
            v-if="loading"
            class="space-y-16"
        >
            <section class="space-y-6">
                <div class="h-5 w-24 animate-pulse rounded-full bg-baige/10" />
                <div class="h-16 w-3/4 animate-pulse rounded-full bg-baige/10" />
                <div class="h-5 w-full max-w-xl animate-pulse rounded-full bg-baige/10" />
                <div class="h-5 w-4/5 max-w-lg animate-pulse rounded-full bg-baige/10" />
            </section>

            <section class="grid gap-5 md:grid-cols-3">
                <div
                    v-for="index in 3"
                    :key="index"
                    class="h-52 animate-pulse rounded-[2rem] bg-baige/10"
                />
            </section>
        </div>

        <div
            v-else-if="error"
            class="max-w-xl py-10"
        >
            <h1 class="heading text-baige">
                Obsah sa nepodarilo načítať
            </h1>

            <p class="text-regular mt-5 text-baige/65">
                {{ error }}
            </p>

            <button
                type="button"
                class="text-bold mt-8 text-baige transition-opacity hover:opacity-55"
                @click="load"
            >
                Skúsiť znova
            </button>
        </div>

        <div
            v-else
            class="space-y-3"
        >
            <section class="flex flex-col items-center justify-center gap-6 text-center p-5">
                <h1 class="regular text-baige text-xl text-center">
                    Podeľte sa s nami o <br /><strong>váš príbeh</strong>
                </h1>

                <h2 class="regular text-baige">
                    Ambulancia klinickej a dopravnej psychológie a psychoterapie v Rimavskej Sobote
                </h2>

                <Button background-color="#FFE5E5" text-color="#5A1F1F">
                    Čomu sa venujeme
                </Button>
            </section>
        
            <section class="">
                <img
                    src="/images/humanitas_rodina.png"
                    alt="Humanitas"
                    class="h-auto w-full max-w-[480px] object-contain"
                >
            </section>

            <section class="flex flex-col items-center justify-center gap-6 text-center p-5">
                <h1 class="regular text-baige text-xl text-center">
                    <strong>Časté otázky</strong>
                </h1>

                <h2 class="regular text-baige">
                    Prelistujte sa najčastejšie sa vyskytujúcimi otázkami
                </h2>
            </section>
            <FaqCarousel :items="generatedFaq" />
                   

            <section class="max-w-4xl">
                <div class="mt-10 flex flex-wrap gap-x-8 gap-y-4">
                    <a
                        :href="servicesUrl"
                        class="text-bold text-baige transition-opacity hover:opacity-55"
                    >
                        Ponúkané služby
                    </a>

                    <a
                        v-if="bookingEnabled"
                        :href="bookingUrl"
                        class="text-bold text-baige transition-opacity hover:opacity-55"
                    >
                        Rezervovať termín
                    </a>

                    <a
                        :href="primaryContactHref"
                        class="text-bold text-baige/65 transition-opacity hover:opacity-55"
                    >
                        {{ primaryContactButtonLabel }}
                    </a>
                </div>
            </section>

            <!-- Services -->
            <section>
                <div class="flex items-end justify-between gap-8">
                    <div>
                        <p class="text-bold text-baige/45">
                            Naša ponuka
                        </p>

                        <h2 class="heading mt-3 text-baige">
                            Ponúkané služby
                        </h2>
                    </div>

                    <a
                        v-if="servicesCount"
                        :href="servicesUrl"
                        class="text-regular hidden text-baige/55 transition-opacity hover:opacity-55 sm:block"
                    >
                        Zobraziť všetky · {{ servicesCount }}
                    </a>
                </div>

                <div
                    v-if="homepageServices.length"
                    class="mt-10 grid gap-x-10 gap-y-12 md:grid-cols-3"
                >
                    <a
                        v-for="service in homepageServices"
                        :key="service.id"
                        :href="serviceUrl(service)"
                        class="group block"
                    >
                        <p class="heading text-baige transition-opacity group-hover:opacity-55">
                            {{ service.name }}
                        </p>

                        <p class="text-regular mt-5 leading-relaxed text-baige/58">
                            {{ serviceDescription(service) }}
                        </p>

                        <div class="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                            <span
                                v-if="serviceDurationLabel(service)"
                                class="text-regular text-baige/40"
                            >
                                {{ serviceDurationLabel(service) }}
                            </span>

                            <span
                                v-if="servicePrice(service)"
                                class="text-regular text-baige/40"
                            >
                                Samoplatca {{ servicePrice(service) }} €
                            </span>
                        </div>
                    </a>
                </div>

                <p
                    v-else
                    class="text-regular mt-10 max-w-xl text-baige/55"
                >
                    Služby budú čoskoro doplnené. Kontaktujte pobočku
                    pre aktuálne možnosti.
                </p>

                <a
                    v-if="servicesCount"
                    :href="servicesUrl"
                    class="text-bold mt-10 inline-flex text-baige sm:hidden"
                >
                    Zobraziť všetky služby
                </a>
            </section>

            <!-- Professionals -->
            <section>
                <p class="text-bold text-baige/45">
                    Náš tím
                </p>

                <h2 class="heading mt-3 text-baige">
                    Profesionáli
                </h2>

                <div
                    v-if="professionals.length"
                    class="mt-10 grid gap-x-10 gap-y-14 md:grid-cols-2 lg:grid-cols-3"
                >
                    <article
                        v-for="professional in professionals"
                        :key="professional.id"
                    >
                        <div class="flex items-center gap-5">
                            <img
                                v-if="professionalPhoto(professional)"
                                :src="professionalPhoto(professional)"
                                :alt="professionalName(professional)"
                                class="h-20 w-20 shrink-0 rounded-full object-cover"
                            >

                            <div
                                v-else
                                class="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-baige/10"
                            >
                                <span class="heading text-baige">
                                    {{ professionalInitials(professional) }}
                                </span>
                            </div>

                            <div class="min-w-0">
                                <h3 class="heading text-baige">
                                    {{ professionalName(professional) }}
                                </h3>

                                <p
                                    v-if="professionalPositions(professional).length"
                                    class="text-regular mt-2 text-baige/50"
                                >
                                    {{ professionalPositions(professional).join(' · ') }}
                                </p>
                            </div>
                        </div>

                        <p
                            v-if="professionalBio(professional)"
                            class="text-regular mt-6 leading-relaxed text-baige/58"
                        >
                            {{ trimText(professionalBio(professional), 180) }}
                        </p>

                        <div
                            v-if="professional.email || professional.phone"
                            class="mt-6 flex flex-wrap gap-x-6 gap-y-3"
                        >
                            <a
                                v-if="professional.email"
                                :href="`mailto:${professional.email}`"
                                class="text-regular text-baige/65 transition-opacity hover:opacity-55"
                            >
                                E-mail
                            </a>

                            <a
                                v-if="professional.phone"
                                :href="`tel:${professional.phone.replace(/[^\d+]/g, '')}`"
                                class="text-regular text-baige/65 transition-opacity hover:opacity-55"
                            >
                                Telefón
                            </a>
                        </div>
                    </article>
                </div>

                <p
                    v-else
                    class="text-regular mt-10 text-baige/55"
                >
                    Profesionáli budú čoskoro doplnení.
                </p>
            </section>

            <!-- FAQ -->
            <section>
                <div class="mb-12 max-w-xl">
                    <p class="text-bold text-baige/45">
                        Informácie
                    </p>

                    <h2 class="heading mt-3 text-baige">
                        Často sa pýtate
                    </h2>
                </div>

                
            </section>

            <!-- Contact CTA -->
            <section class="max-w-3xl pb-8">
                <h2 class="font-heading text-[clamp(2.8rem,7vw,5.5rem)] font-bold leading-[0.92] tracking-[-0.025em] text-baige">
                    Potrebujete viac informácií?
                </h2>

                <p class="text-regular mt-7 max-w-xl leading-relaxed text-baige/60">
                    Kontaktujte našu pobočku a radi vám poradíme
                    s výberom služby alebo rezerváciou termínu.
                </p>

                <div class="mt-9 flex flex-wrap gap-x-8 gap-y-4">
                    <a
                        :href="primaryContactHref"
                        class="text-bold text-baige transition-opacity hover:opacity-55"
                    >
                        {{ primaryContactButtonLabel }}
                    </a>

                    <a
                        :href="contactUrl"
                        class="text-bold text-baige/55 transition-opacity hover:opacity-55"
                    >
                        Všetky kontakty
                    </a>
                </div>
            </section>
        </div>
    </div>
</template>