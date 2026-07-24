<script setup>
import { computed, reactive, ref } from 'vue'
import { useClinviaPublicSite } from '../composables/useClinviaPublicSite'

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

const form = reactive({
    sender_name: '',
    sender_email: '',
    sender_phone: '',
    body: ''
})

const formErrors = reactive({
    sender_name: null,
    sender_email: null,
    sender_phone: null,
    body: null
})

const isSubmitting = ref(false)
const submittedSuccessfully = ref(false)
const submitError = ref(null)

const apiData = computed(() => {
    return data.value ?? null
})

const branch = computed(() => {
    return apiData.value?.branch ?? null
})

const company = computed(() => {
    return apiData.value?.company ?? null
})

const publicSite = computed(() => {
    return (
        apiData.value?.publicSite ??
        apiData.value?.public_site ??
        branch.value?.publicSite ??
        branch.value?.public_site ??
        null
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

const contacts = computed(() => {
    const providedContacts =
        branch.value?.contacts ?? []

    if (providedContacts.length) {
        return providedContacts
    }

    const fallbackContacts = []

    if (branch.value?.phone) {
        fallbackContacts.push({
            type: 'phone',
            label: 'Telefón',
            value: branch.value.phone
        })
    }

    const bookingPhone =
        branch.value?.bookingPhone ??
        branch.value?.booking_phone

    if (bookingPhone) {
        fallbackContacts.push({
            type: 'booking_phone',
            label: 'Telefón na objednanie',
            value: bookingPhone
        })
    }

    if (branch.value?.email) {
        fallbackContacts.push({
            type: 'email',
            label: 'E-mail',
            value: branch.value.email
        })
    }

    const website =
        branch.value?.website ??
        company.value?.website

    if (website) {
        fallbackContacts.push({
            type: 'website',
            label: 'Web',
            value: website
        })
    }

    return fallbackContacts
})

const openingHours = computed(() => {
    return (
        branch.value?.openingHours ??
        branch.value?.opening_hours ??
        []
    )
})

const branchAddressParts = computed(() => {
    const address = branch.value?.address

    if (!address) {
        return []
    }

    if (address.lines?.length) {
        return address.lines
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

    return [
        [line1, line2]
            .filter(Boolean)
            .join(' '),
        [postalCode, address.city]
            .filter(Boolean)
            .join(' '),
        address.country
    ].filter(Boolean)
})

const branchAddress = computed(() => {
    return branchAddressParts.value.join(', ')
})

const latitude = computed(() => {
    return (
        branch.value?.location?.latitude ??
        branch.value?.latitude ??
        null
    )
})

const longitude = computed(() => {
    return (
        branch.value?.location?.longitude ??
        branch.value?.longitude ??
        null
    )
})

const mapEmbedUrl = computed(() => {
    if (
        latitude.value !== null &&
        longitude.value !== null
    ) {
        return `https://www.google.com/maps?q=${latitude.value},${longitude.value}&output=embed`
    }

    if (branchAddress.value) {
        return `https://www.google.com/maps?q=${encodeURIComponent(branchAddress.value)}&output=embed`
    }

    return null
})

const googleMapsUrl = computed(() => {
    if (
        latitude.value !== null &&
        longitude.value !== null
    ) {
        return `https://www.google.com/maps/search/?api=1&query=${latitude.value},${longitude.value}`
    }

    if (branchAddress.value) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branchAddress.value)}`
    }

    return null
})

const contactMessageUrl = computed(() => {
    return (
        apiData.value?.contactMessageUrl ??
        apiData.value?.contact_message_url ??
        publicSite.value?.contactMessageUrl ??
        publicSite.value?.contact_message_url ??
        branch.value?.contactMessageUrl ??
        branch.value?.contact_message_url ??
        null
    )
})

const csrfToken = computed(() => {
    return document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content') ?? null
})

function contactLabel(contact) {
    if (contact.label) {
        return contact.label
    }

    return {
        email: 'E-mail',
        phone: 'Telefón',
        booking_phone: 'Telefón na objednanie',
        website: 'Web',
        facebook: 'Facebook',
        instagram: 'Instagram'
    }[contact.type] ?? 'Kontakt'
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
        return `tel:${contact.value.replace(/[^\d+]/g, '')}`
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

function openingHoursLabel(entry) {
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

function resetFormErrors() {
    Object.keys(formErrors).forEach((key) => {
        formErrors[key] = null
    })
}

function resetForm() {
    form.sender_name = ''
    form.sender_email = ''
    form.sender_phone = ''
    form.body = ''
}

function applyValidationErrors(errors) {
    Object.keys(formErrors).forEach((key) => {
        const value = errors?.[key]

        formErrors[key] = Array.isArray(value)
            ? value[0]
            : value ?? null
    })
}

async function submit() {
    if (!contactMessageUrl.value) {
        submitError.value =
            'Odosielanie správ zatiaľ nie je nakonfigurované.'

        return
    }

    resetFormErrors()
    submitError.value = null
    isSubmitting.value = true

    try {
        const headers = {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        }

        if (csrfToken.value) {
            headers['X-CSRF-TOKEN'] = csrfToken.value
        }

        const response = await fetch(
            contactMessageUrl.value,
            {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    sender_name: form.sender_name,
                    sender_email: form.sender_email,
                    sender_phone: form.sender_phone,
                    body: form.body
                })
            }
        )

        const responseData = await response
            .json()
            .catch(() => ({}))

        if (response.status === 422) {
            applyValidationErrors(
                responseData.errors ?? {}
            )

            return
        }

        if (!response.ok) {
            throw new Error(
                responseData.message ??
                'Správu sa nepodarilo odoslať.'
            )
        }

        submittedSuccessfully.value = true
        resetForm()
    } catch (requestError) {
        submitError.value =
            requestError instanceof Error
                ? requestError.message
                : 'Správu sa nepodarilo odoslať.'
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <div class="page-contact">
        <div
            v-if="loading"
            class="space-y-16"
        >
            <section class="space-y-6">
                <div class="h-5 w-24 animate-pulse rounded-full bg-baige/10" />
                <div class="h-16 w-3/4 animate-pulse rounded-full bg-baige/10" />
                <div class="h-5 w-full max-w-xl animate-pulse rounded-full bg-baige/10" />
            </section>

            <div class="grid gap-x-16 gap-y-16 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
                <div class="space-y-5">
                    <div class="h-14 animate-pulse rounded-2xl bg-baige/10" />
                    <div class="h-14 animate-pulse rounded-2xl bg-baige/10" />
                    <div class="h-14 animate-pulse rounded-2xl bg-baige/10" />
                    <div class="h-36 animate-pulse rounded-2xl bg-baige/10" />
                </div>

                <div class="space-y-5">
                    <div class="h-5 w-40 animate-pulse rounded-full bg-baige/10" />
                    <div class="h-5 w-full animate-pulse rounded-full bg-baige/10" />
                    <div class="h-5 w-5/6 animate-pulse rounded-full bg-baige/10" />
                </div>
            </div>
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
            class="space-y-24 sm:space-y-28"
        >
            <!-- Heading -->
            <section class="max-w-4xl">
                <p class="text-bold text-baige/45">
                    Kontakt
                </p>

                <h1 class="mt-6 font-heading text-[clamp(3.4rem,9vw,7rem)] font-bold leading-[0.88] tracking-[-0.035em] text-baige">
                    Ozvite sa nám
                </h1>

                <p class="text-regular mt-9 max-w-[60ch] leading-relaxed text-baige/68">
                    Napíšte nám správu alebo použite kontaktné
                    údaje pobočky {{ branchName }}.
                </p>
            </section>

            <!-- Contact form and contact details -->
            <section class="grid gap-x-16 gap-y-20 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
                <!-- Form -->
                <div>
                    <div
                        v-if="submittedSuccessfully"
                        class="max-w-xl py-8"
                    >
                        <p class="text-bold text-baige/45">
                            Správa bola odoslaná
                        </p>

                        <h2 class="mt-5 font-heading text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[0.95] text-baige">
                            Ozveme sa vám čo najskôr.
                        </h2>

                        <p class="text-regular mt-7 max-w-lg leading-relaxed text-baige/62">
                            Ďakujeme za vašu správu. Pracovníci pobočky
                            vás budú kontaktovať v najbližšom možnom
                            termíne.
                        </p>

                        <button
                            type="button"
                            class="text-bold mt-9 text-baige transition-opacity hover:opacity-55"
                            @click="submittedSuccessfully = false"
                        >
                            Poslať ďalšiu správu
                        </button>
                    </div>

                    <div v-else>
                        <p class="text-bold text-baige">
                            Napíšte nám
                        </p>

                        <p class="text-regular mt-3 text-baige/52">
                            Vyplňte krátky formulár a ozveme sa vám
                            čo najskôr.
                        </p>

                        <form
                            class="mt-10 space-y-8"
                            @submit.prevent="submit"
                        >
                            <div class="grid gap-8 sm:grid-cols-2">
                                <div>
                                    <label
                                        for="contact-name"
                                        class="text-regular block text-baige/52"
                                    >
                                        Meno
                                    </label>

                                    <input
                                        id="contact-name"
                                        v-model="form.sender_name"
                                        type="text"
                                        autocomplete="name"
                                        class="text-regular mt-3 w-full border-0 border-b border-baige/22 bg-transparent px-0 pb-4 text-baige placeholder:text-baige/30 focus:border-baige/70 focus:ring-0"
                                        :aria-invalid="Boolean(formErrors.sender_name)"
                                    >

                                    <p
                                        v-if="formErrors.sender_name"
                                        class="mt-2 text-sm text-red-200"
                                    >
                                        {{ formErrors.sender_name }}
                                    </p>
                                </div>

                                <div>
                                    <label
                                        for="contact-email"
                                        class="text-regular block text-baige/52"
                                    >
                                        E-mail
                                    </label>

                                    <input
                                        id="contact-email"
                                        v-model="form.sender_email"
                                        type="email"
                                        autocomplete="email"
                                        class="text-regular mt-3 w-full border-0 border-b border-baige/22 bg-transparent px-0 pb-4 text-baige placeholder:text-baige/30 focus:border-baige/70 focus:ring-0"
                                        :aria-invalid="Boolean(formErrors.sender_email)"
                                    >

                                    <p
                                        v-if="formErrors.sender_email"
                                        class="mt-2 text-sm text-red-200"
                                    >
                                        {{ formErrors.sender_email }}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label
                                    for="contact-phone"
                                    class="text-regular block text-baige/52"
                                >
                                    Telefón
                                </label>

                                <input
                                    id="contact-phone"
                                    v-model="form.sender_phone"
                                    type="tel"
                                    autocomplete="tel"
                                    class="text-regular mt-3 w-full border-0 border-b border-baige/22 bg-transparent px-0 pb-4 text-baige placeholder:text-baige/30 focus:border-baige/70 focus:ring-0"
                                    :aria-invalid="Boolean(formErrors.sender_phone)"
                                >

                                <p
                                    v-if="formErrors.sender_phone"
                                    class="mt-2 text-sm text-red-200"
                                >
                                    {{ formErrors.sender_phone }}
                                </p>
                            </div>

                            <div>
                                <label
                                    for="contact-message"
                                    class="text-regular block text-baige/52"
                                >
                                    Správa
                                </label>

                                <textarea
                                    id="contact-message"
                                    v-model="form.body"
                                    rows="5"
                                    placeholder="Ako vám môžeme pomôcť?"
                                    class="text-regular mt-3 w-full resize-y border-0 border-b border-baige/22 bg-transparent px-0 pb-4 text-baige placeholder:text-baige/30 focus:border-baige/70 focus:ring-0"
                                    :aria-invalid="Boolean(formErrors.body)"
                                />

                                <p
                                    v-if="formErrors.body"
                                    class="mt-2 text-sm text-red-200"
                                >
                                    {{ formErrors.body }}
                                </p>
                            </div>

                            <p
                                v-if="submitError"
                                class="text-regular text-red-200"
                            >
                                {{ submitError }}
                            </p>

                            <button
                                type="submit"
                                class="text-bold inline-flex items-center gap-4 text-baige transition-opacity hover:opacity-55 disabled:cursor-wait disabled:opacity-45"
                                :disabled="isSubmitting"
                            >
                                <span>
                                    {{
                                        isSubmitting
                                            ? 'Odosielam…'
                                            : 'Odoslať správu'
                                    }}
                                </span>

                                <span aria-hidden="true">
                                    →
                                </span>
                            </button>
                        </form>
                    </div>
                </div>

                <!-- Contact details -->
                <aside>
                    <p class="text-bold text-baige">
                        Kontaktné údaje
                    </p>

                    <div
                        v-if="contacts.length"
                        class="mt-8 space-y-7"
                    >
                        <div
                            v-for="(contact, index) in contacts"
                            :key="`${contact.type}-${contact.value}-${index}`"
                        >
                            <p class="text-regular text-baige/40">
                                {{ contactLabel(contact) }}
                            </p>

                            <component
                                :is="contactHref(contact) ? 'a' : 'p'"
                                :href="contactHref(contact)"
                                v-bind="linkAttrs(contactHref(contact))"
                                class="text-regular mt-2 block w-fit max-w-full break-words text-baige/80 transition-opacity hover:opacity-55"
                            >
                                {{ contact.value }}
                            </component>
                        </div>
                    </div>

                    <p
                        v-else
                        class="text-regular mt-8 text-baige/50"
                    >
                        Kontaktné údaje zatiaľ nie sú uvedené.
                    </p>

                    <div
                        v-if="branchAddressParts.length"
                        class="mt-14"
                    >
                        <p class="text-bold text-baige">
                            Adresa
                        </p>

                        <div class="mt-6">
                            <p
                                v-for="line in branchAddressParts"
                                :key="line"
                                class="text-regular text-baige/62"
                            >
                                {{ line }}
                            </p>
                        </div>

                        <a
                            v-if="googleMapsUrl"
                            :href="googleMapsUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-bold mt-6 inline-flex text-baige/72 transition-opacity hover:opacity-55"
                        >
                            Otvoriť v Mapách
                        </a>
                    </div>
                </aside>
            </section>

            <!-- Opening hours -->
            <section class="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
                <div>
                    <p class="text-bold text-baige/45">
                        Kedy nás zastihnete
                    </p>

                    <h2 class="heading mt-3 text-baige">
                        Otváracie hodiny
                    </h2>
                </div>

                <div
                    v-if="openingHours.length"
                    class="space-y-5"
                >
                    <div
                        v-for="entry in openingHours"
                        :key="`${entry.dayOfWeek || entry.day_of_week || entry.day}-${openingHoursLabel(entry)}`"
                        class="grid grid-cols-[minmax(0,1fr)_auto] gap-8"
                    >
                        <p class="text-regular text-baige/52">
                            {{ openingHoursDayLabel(entry) }}
                        </p>

                        <p class="text-regular text-right text-baige/82">
                            {{ openingHoursLabel(entry) }}
                        </p>
                    </div>
                </div>

                <p
                    v-else
                    class="text-regular text-baige/50"
                >
                    Otváracie hodiny momentálne nie sú uvedené.
                </p>
            </section>

            <!-- Map -->
            <section
                v-if="mapEmbedUrl"
                class="space-y-8"
            >
                <div>
                    <p class="text-bold text-baige/45">
                        Kde nás nájdete
                    </p>

                    <h2 class="heading mt-3 text-baige">
                        Mapa
                    </h2>
                </div>

                <div class="overflow-hidden rounded-[2rem]">
                    <iframe
                        :src="mapEmbedUrl"
                        :title="`Mapa pobočky ${branchName}`"
                        class="h-[22rem] w-full grayscale sm:h-[30rem]"
                        style="border: 0"
                        loading="lazy"
                        referrerpolicy="no-referrer-when-downgrade"
                        allowfullscreen
                    />
                </div>
            </section>
        </div>
    </div>
</template>