<script setup>
import {
    computed,
    ref
} from 'vue'
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

const searchTerm = ref('')
const selectedCategory = ref('all')
const expandedCategories = ref({})

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

const services = computed(() => {
    return (
        apiData.value?.services ??
        apiData.value?.featuredServices ??
        apiData.value?.featured_services ??
        branch.value?.services ??
        branch.value?.featuredServices ??
        branch.value?.featured_services ??
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

const servicesDescription = computed(() => {
    return (
        publicSite.value?.servicesDescription ??
        publicSite.value?.services_description ??
        branch.value?.servicesDescription ??
        branch.value?.services_description ??
        `Prehľad služieb poskytovaných v ${branchName.value}.`
    )
})

const servicesCount = computed(() => {
    return services.value.length
})

const categoryOptions = computed(() => {
    const categories = services.value
        .map((service) => {
            return getCategoryName(service)
        })
        .filter(Boolean)

    const uniqueCategories = [
        ...new Set(categories)
    ]

    return [
        {
            label: 'Všetky kategórie',
            value: 'all'
        },
        ...uniqueCategories.map((category) => {
            return {
                label: category,
                value: category
            }
        })
    ]
})

const filteredServices = computed(() => {
    const query = normalizeText(
        searchTerm.value
    ).trim()

    return services.value.filter((service) => {
        const categoryName =
            getCategoryName(service)

        const matchesCategory =
            selectedCategory.value === 'all' ||
            categoryName === selectedCategory.value

        const searchableText = normalizeText([
            service.name,
            service.shortDescription,
            service.short_description,
            service.description,
            categoryName
        ]
            .filter(Boolean)
            .join(' '))

        const matchesSearch =
            !query ||
            searchableText.includes(query)

        return (
            matchesCategory &&
            matchesSearch
        )
    })
})

const groupedServices = computed(() => {
    return filteredServices.value.reduce(
        (groups, service) => {
            const categoryName =
                getCategoryName(service)

            if (!groups[categoryName]) {
                groups[categoryName] = []
            }

            groups[categoryName].push(service)

            return groups
        },
        {}
    )
})

const groupedServiceEntries = computed(() => {
    return Object.entries(groupedServices.value)
})

function getCategoryName(service) {
    return (
        service.category?.name ??
        service.categoryName ??
        service.category_name ??
        'Ostatné'
    )
}

function normalizeText(value) {
    return String(value ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
}

function trimText(
    value,
    maxLength = 145
) {
    const text =
        String(value ?? '').trim()

    if (!text) {
        return ''
    }

    if (text.length <= maxLength) {
        return text
    }

    return `${text
        .slice(0, maxLength)
        .trim()}…`
}

function serviceDescription(service) {
    return trimText(
        service.shortDescription ??
        service.short_description ??
        service.description ??
        'Viac informácií nájdete v detaile služby.',
        145
    )
}

function durationLabel(service) {
    const durationMinutes =
        service.durationMinutes ??
        service.duration_minutes

    if (!durationMinutes) {
        return null
    }

    const sessions =
        service.durationSessions ??
        service.duration_sessions ??
        1

    return `${sessions} × ${durationMinutes} min`
}

function servicePrice(service) {
    return (
        service.selfPayAmount ??
        service.self_pay_amount ??
        null
    )
}

function formatPrice(value) {
    const numericValue = Number(value)

    if (!Number.isFinite(numericValue)) {
        return value
    }

    return new Intl.NumberFormat(
        'sk-SK',
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    ).format(numericValue)
}

function serviceUrl(service) {
    const explicitUrl =
        service.url ??
        service.href ??
        service.publicUrl ??
        service.public_url

    if (explicitUrl) {
        return explicitUrl
    }

    const baseUrl =
        publicSite.value?.servicesUrl ??
        publicSite.value?.services_url ??
        '/sluzby'

    const identifier =
        service.slug ??
        service.id

    if (!identifier) {
        return baseUrl
    }

    return `${baseUrl.replace(/\/$/, '')}/${identifier}`
}

function serviceIcon(service) {
    return (
        service.icon ??
        service.iconClass ??
        service.icon_class ??
        null
    )
}

function isCategoryExpanded(categoryName) {
    return (
        expandedCategories.value[
            categoryName
        ] === true
    )
}

function visibleCategoryServices(
    categoryName,
    categoryServices
) {
    if (
        isCategoryExpanded(categoryName)
    ) {
        return categoryServices
    }

    return categoryServices.slice(0, 3)
}

function toggleCategory(categoryName) {
    expandedCategories.value = {
        ...expandedCategories.value,
        [categoryName]:
            !expandedCategories.value[
                categoryName
            ]
    }
}

function resetFilters() {
    searchTerm.value = ''
    selectedCategory.value = 'all'
}
</script>

<template>
    <div class="page-focus">
        <!-- Loading -->
        <div
            v-if="loading"
            class="space-y-20"
        >
            <section class="max-w-4xl">
                <div class="h-5 w-32 animate-pulse rounded-full bg-baige/10" />

                <div class="mt-7 h-20 w-3/4 animate-pulse rounded-full bg-baige/10" />

                <div class="mt-8 space-y-4">
                    <div class="h-5 w-full max-w-2xl animate-pulse rounded-full bg-baige/10" />
                    <div class="h-5 w-4/5 max-w-xl animate-pulse rounded-full bg-baige/10" />
                </div>
            </section>

            <section class="grid gap-8 sm:grid-cols-2">
                <div class="h-16 animate-pulse rounded-full bg-baige/10" />
                <div class="h-16 animate-pulse rounded-full bg-baige/10" />
            </section>

            <section class="space-y-12">
                <div
                    v-for="index in 2"
                    :key="index"
                >
                    <div class="h-6 w-44 animate-pulse rounded-full bg-baige/10" />

                    <div class="mt-8 grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
                        <div
                            v-for="serviceIndex in 3"
                            :key="serviceIndex"
                            class="space-y-5"
                        >
                            <div class="h-8 w-4/5 animate-pulse rounded-full bg-baige/10" />
                            <div class="h-5 w-full animate-pulse rounded-full bg-baige/10" />
                            <div class="h-5 w-3/4 animate-pulse rounded-full bg-baige/10" />
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <!-- Error -->
        <div
            v-else-if="error"
            class="max-w-xl py-10"
        >
            <p class="text-bold text-baige/45">
                Služby
            </p>

            <h1 class="mt-5 font-heading text-[clamp(2.8rem,7vw,5.5rem)] font-bold leading-[0.92] tracking-[-0.025em] text-baige">
                Obsah sa nepodarilo načítať
            </h1>

            <p class="text-regular mt-7 leading-relaxed text-baige/60">
                {{ error }}
            </p>

            <button
                type="button"
                class="text-bold mt-9 text-baige transition-opacity hover:opacity-55"
                @click="load"
            >
                Skúsiť znova
            </button>
        </div>

        <!-- Page -->
        <div
            v-else
            class="space-y-24 sm:space-y-28"
        >
            <!-- Hero -->
            <section class="max-w-4xl">
                <p class="text-bold text-baige/45">
                    Naše zameranie
                </p>

                <h1 class="mt-6 font-heading text-[clamp(3.4rem,9vw,7rem)] font-bold leading-[0.88] tracking-[-0.035em] text-baige">
                    Ponúkané služby
                </h1>

                <p class="text-regular mt-9 max-w-[62ch] leading-relaxed text-baige/68">
                    {{ servicesDescription }}
                </p>

                <p
                    v-if="servicesCount"
                    class="text-regular mt-6 text-baige/40"
                >
                    {{ servicesCount }}
                    {{
                        servicesCount === 1
                            ? 'služba'
                            : servicesCount < 5
                                ? 'služby'
                                : 'služieb'
                    }}
                </p>
            </section>

            <!-- Filters -->
            <section class="grid gap-x-12 gap-y-8 md:grid-cols-2">
                <div>
                    <label
                        for="services-search"
                        class="text-regular block text-baige/45"
                    >
                        Hľadať v službách
                    </label>

                    <div class="relative mt-3">
                        <input
                            id="services-search"
                            v-model="searchTerm"
                            type="search"
                            placeholder="Názov alebo popis služby"
                            class="text-regular w-full border-0 border-b border-baige/22 bg-transparent px-0 pb-4 pr-10 text-baige placeholder:text-baige/28 focus:border-baige/70 focus:ring-0"
                        >

                        <button
                            v-if="searchTerm"
                            type="button"
                            class="absolute bottom-4 right-0 text-regular text-baige/40 transition-opacity hover:opacity-55"
                            aria-label="Vymazať vyhľadávanie"
                            @click="searchTerm = ''"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div>
                    <label
                        for="services-category"
                        class="text-regular block text-baige/45"
                    >
                        Kategória
                    </label>

                    <div class="relative mt-3">
                        <select
                            id="services-category"
                            v-model="selectedCategory"
                            class="text-regular w-full appearance-none border-0 border-b border-baige/22 bg-transparent px-0 pb-4 pr-10 text-baige focus:border-baige/70 focus:ring-0"
                        >
                            <option
                                v-for="option in categoryOptions"
                                :key="option.value"
                                :value="option.value"
                                class="bg-green text-baige"
                            >
                                {{ option.label }}
                            </option>
                        </select>

                        <span
                            class="pointer-events-none absolute bottom-4 right-0 text-baige/40"
                            aria-hidden="true"
                        >
                            ↓
                        </span>
                    </div>
                </div>
            </section>

            <!-- Services -->
            <section
                v-if="filteredServices.length"
                class="space-y-20"
            >
                <section
                    v-for="[categoryName, categoryServices] in groupedServiceEntries"
                    :key="categoryName"
                >
                    <div class="flex items-end justify-between gap-8">
                        <div>
                            <p class="text-regular text-baige/40">
                                Kategória
                            </p>

                            <h2 class="heading mt-2 text-baige">
                                {{ categoryName }}
                            </h2>
                        </div>

                        <p class="text-regular text-baige/35">
                            {{ categoryServices.length }}
                        </p>
                    </div>

                    <div class="mt-10 grid gap-x-10 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
                        <a
                            v-for="service in visibleCategoryServices(
                                categoryName,
                                categoryServices
                            )"
                            :key="service.id || service.slug || service.name"
                            :href="serviceUrl(service)"
                            class="group flex min-h-[15rem] flex-col"
                        >
                            <div class="flex items-start gap-4">
                                <div
                                    v-if="serviceIcon(service)"
                                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-baige/8 text-baige/65"
                                >
                                    <i :class="serviceIcon(service)" />
                                </div>

                                <h3 class="heading text-baige transition-opacity group-hover:opacity-55">
                                    {{ service.name }}
                                </h3>
                            </div>

                            <p class="text-regular mt-6 leading-relaxed text-baige/58">
                                {{ serviceDescription(service) }}
                            </p>

                            <div class="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-7">
                                <span
                                    v-if="durationLabel(service)"
                                    class="text-regular text-baige/38"
                                >
                                    {{ durationLabel(service) }}
                                </span>

                                <span
                                    v-if="servicePrice(service)"
                                    class="text-regular text-baige/38"
                                >
                                    Samoplatca
                                    {{ formatPrice(servicePrice(service)) }} €
                                </span>
                            </div>

                            <span class="text-bold mt-6 inline-flex items-center gap-3 text-baige/75 transition-opacity group-hover:opacity-55">
                                Detail služby
                                <span aria-hidden="true">
                                    →
                                </span>
                            </span>
                        </a>
                    </div>

                    <button
                        v-if="categoryServices.length > 3"
                        type="button"
                        class="text-bold mt-10 inline-flex items-center gap-3 text-baige/65 transition-opacity hover:opacity-55"
                        @click="toggleCategory(categoryName)"
                    >
                        <span>
                            {{
                                isCategoryExpanded(categoryName)
                                    ? 'Zobraziť menej'
                                    : `Zobraziť ďalšie (${categoryServices.length - 3})`
                            }}
                        </span>

                        <span
                            class="transition-transform duration-300"
                            :class="{
                                'rotate-180':
                                    isCategoryExpanded(categoryName)
                            }"
                            aria-hidden="true"
                        >
                            ↓
                        </span>
                    </button>
                </section>
            </section>

            <!-- Empty search state -->
            <section
                v-else
                class="max-w-2xl py-8"
            >
                <p class="text-bold text-baige/45">
                    Výsledky vyhľadávania
                </p>

                <h2 class="mt-5 font-heading text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[0.95] text-baige">
                    Nenašli sa žiadne služby
                </h2>

                <p class="text-regular mt-7 leading-relaxed text-baige/58">
                    Skúste upraviť vyhľadávanie alebo zvoliť inú
                    kategóriu.
                </p>

                <button
                    type="button"
                    class="text-bold mt-9 text-baige transition-opacity hover:opacity-55"
                    @click="resetFilters"
                >
                    Zobraziť všetky služby
                </button>
            </section>

            <!-- CTA -->
            <section
                v-if="servicesCount"
                class="max-w-3xl pb-8"
            >
                <p class="text-bold text-baige/45">
                    Potrebujete poradiť?
                </p>

                <h2 class="mt-5 font-heading text-[clamp(2.8rem,7vw,5.5rem)] font-bold leading-[0.92] tracking-[-0.025em] text-baige">
                    Pomôžeme vám vybrať vhodnú službu.
                </h2>

                <p class="text-regular mt-7 max-w-xl leading-relaxed text-baige/58">
                    Kontaktujte pobočku {{ branchName }} a radi vám
                    poradíme podľa vašich potrieb.
                </p>

                <a
                    :href="
                        publicSite?.contactUrl ??
                        publicSite?.contact_url ??
                        '/kontakt'
                    "
                    class="text-bold mt-9 inline-flex items-center gap-3 text-baige transition-opacity hover:opacity-55"
                >
                    Kontaktovať pobočku

                    <span aria-hidden="true">
                        →
                    </span>
                </a>
            </section>
        </div>
    </div>
</template>