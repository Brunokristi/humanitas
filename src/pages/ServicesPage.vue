<script setup>
import {
    computed,
    onBeforeUnmount,
    onMounted,
    ref,
    watch
} from 'vue';

import {
    storeToRefs
} from 'pinia';

import {
    usePublicSiteStore
} from '../stores/publicSite';

import {
    usePageSeo
} from '../composables/usePageSeo';
import {
    useRoute,
    useRouter
} from 'vue-router';

import Button from '../components/Button.vue';
import ServicesSlider from '../components/Slider.vue';
import ServiceCardContent from '../components/ServiceCardContent.vue';
import ServiceBottomSheet from '../components/sheets/Service.vue';

const props = defineProps({
    expanded: {
        type: Boolean,
        default: false
    },

    transitioning: {
        type: Boolean,
        default: false
    }
});

const route =
    useRoute();

const router =
    useRouter();

const publicSiteStore =
    usePublicSiteStore();

const {
    company,
    currentBranch,
    services,
    loading,
    error
} = storeToRefs(
    publicSiteStore
);

const contactUrl =
    '/kontakt';

usePageSeo({
    pageKey:
        'services',

    breadcrumbs: [
        {
            name:
                'Domov',

            url:
                'https://klinickapsychologiars.sk/'
        },

        {
            name:
                'Služby',

            url:
                'https://klinickapsychologiars.sk/sluzby'
        }
    ]
});

/*
|--------------------------------------------------------------------------
| State
|--------------------------------------------------------------------------
*/

const searchTerm =
    ref('');

const selectedCategory =
    ref('all');

const selectedService =
    ref(null);

const serviceDetailsOpen =
    ref(false);

let syncingSheetFromRoute =
    false;

let syncingRouteFromSheet =
    false;

const searchFocused =
    ref(false);

const searchPlaceholderText =
    ref(
        'Psychologické vyšetrenie'
    );

const searchPlaceholderIndex =
    ref(0);

const searchPlaceholderDeleting =
    ref(false);

let searchPlaceholderTimer =
    null;

/*
|--------------------------------------------------------------------------
| Motion
|--------------------------------------------------------------------------
*/

const sliderMotionEnabled =
    computed(() => {
        return (
            props.expanded &&
            !props.transitioning
        );
    });

/*
|--------------------------------------------------------------------------
| Services
|--------------------------------------------------------------------------
*/

const activeServices = computed(() => {
    return services.value.filter(
        (service) => {
            return service.isActive;
        }
    );
});

function normalizeText(value) {
    return String(
        value ??
        ''
    )
        .trim()
        .toLocaleLowerCase(
            'sk'
        )
        .normalize('NFD')
        .replace(
            /[\u0300-\u036f]/g,
            ''
        );
}

function toRouteSlug(value) {
    const normalized =
        normalizeText(value)
            .replace(
                /[^a-z0-9\s-]/g,
                ''
            )
            .replace(
                /\s+/g,
                '-'
            )
            .replace(
                /-+/g,
                '-'
            )
            .replace(
                /^-+|-+$/g,
                ''
            );

    return normalized || null;
}

function serviceRouteSlug(service) {
    const candidate =
        service?.slug ??
        service?.serviceSlug ??
        service?.service_slug ??
        service?.name ??
        service?.id ??
        null;

    return toRouteSlug(
        candidate
    );
}

function routeServiceSlug() {
    const rawSlug =
        route.params.serviceSlug;

    const value =
        Array.isArray(rawSlug)
            ? rawSlug[0]
            : rawSlug;

    if (
        typeof value !==
        'string'
    ) {
        return null;
    }

    return toRouteSlug(
        decodeURIComponent(
            value
        )
    );
}

function findServiceByRouteSlug(slug) {
    if (!slug) {
        return null;
    }

    const normalizedSlug =
        toRouteSlug(slug);

    if (!normalizedSlug) {
        return null;
    }

    return (
        activeServices.value.find(
            (service) => {
                return (
                    serviceRouteSlug(
                        service
                    ) ===
                    normalizedSlug
                );
            }
        ) ?? null
    );
}

function openRouteSyncedService(
    service,
    options = {}
) {
    if (!service) {
        return;
    }

    const {
        syncRoute = true,
        replace = false
    } = options;

    selectedService.value =
        service;

    serviceDetailsOpen.value =
        true;

    if (
        !syncRoute ||
        syncingSheetFromRoute
    ) {
        return;
    }

    const slug =
        serviceRouteSlug(
            service
        );

    if (!slug) {
        return;
    }

    const currentSlug =
        routeServiceSlug();

    if (
        route.name ===
            'service-detail' &&
        currentSlug === slug
    ) {
        return;
    }

    syncingRouteFromSheet =
        true;

    const navigation = {
        name: 'service-detail',
        params: {
            serviceSlug: slug
        },
        query: route.query,
        hash: route.hash
    };

    const action = replace
        ? router.replace(
            navigation
        )
        : router.push(
            navigation
        );

    action.finally(() => {
        syncingRouteFromSheet =
            false;
    });
}

function serviceCategory(service) {
    const label =
        service?.category?.name ??
        service?.categoryName ??
        service?.category_name ??
        'Ostatné';

    const slug =
        service?.category?.slug ??
        null;

    return {
        label,

        value:
            slug ??
            normalizeText(
                label
            ).replace(
                /\s+/g,
                '-'
            )
    };
}

function rawServiceDescription(
    service
) {
    return (
        service?.description ??
        service?.shortDescription ??
        service?.short_description ??
        ''
    );
}

const categoryOptions = computed(() => {
    const categories =
        new Map();

    activeServices.value.forEach(
        (service) => {
            const category =
                serviceCategory(
                    service
                );

            if (
                categories.has(
                    category.value
                )
            ) {
                return;
            }

            categories.set(
                category.value,
                category
            );
        }
    );

    return [
        {
            label:
                'Všetky kategórie',

            value:
                'all'
        },

        ...categories.values()
    ];
});

const selectedCategoryLabel =
    computed(() => {
        return (
            categoryOptions.value.find(
                (category) => {
                    return (
                        category.value ===
                        selectedCategory.value
                    );
                }
            )?.label ??
            'Všetky kategórie'
        );
    });

const filteredServices = computed(() => {
    const query =
        normalizeText(
            searchTerm.value
        );

    return activeServices.value.filter(
        (service) => {
            const category =
                serviceCategory(
                    service
                );

            const matchesCategory =
                selectedCategory.value ===
                    'all' ||
                category.value ===
                    selectedCategory.value;

            if (!matchesCategory) {
                return false;
            }

            if (!query) {
                return true;
            }

            const searchableText =
                normalizeText(
                    [
                        service?.name,

                        rawServiceDescription(
                            service
                        ),

                        category.label
                    ]
                        .filter(
                            Boolean
                        )
                        .join(' ')
                );

            return searchableText.includes(
                query
            );
        }
    );
});

const groupedServices = computed(() => {
    const groups =
        new Map();

    filteredServices.value.forEach(
        (service) => {
            const category =
                serviceCategory(
                    service
                );

            if (
                !groups.has(
                    category.value
                )
            ) {
                groups.set(
                    category.value,
                    {
                        ...category,

                        services:
                            []
                    }
                );
            }

            groups
                .get(
                    category.value
                )
                .services
                .push(
                    service
                );
        }
    );

    return [
        ...groups.values()
    ];
});

const pageDescription = computed(() => {
    return (
        currentBranch.value
            ?.servicesDescription ??
        currentBranch.value
            ?.services_description ??
        'Pozrite si, s čím sa na nás môžete obrátiť.'
    );
});

function openServiceDetails(
    service
) {
    openRouteSyncedService(
        service
    );
}

function syncSheetWithRoute() {
    if (
        route.name !==
            'services' &&
        route.name !==
            'service-detail'
    ) {
        return;
    }

    const slug =
        routeServiceSlug();

    if (!slug) {
        if (serviceDetailsOpen.value) {
            syncingSheetFromRoute =
                true;

            serviceDetailsOpen.value =
                false;

            selectedService.value =
                null;

            syncingSheetFromRoute =
                false;
        }

        return;
    }

    const matchedService =
        findServiceByRouteSlug(
            slug
        );

    if (!matchedService) {
        if (loading.value) {
            return;
        }

        syncingRouteFromSheet =
            true;

        router.replace({
            name: 'services',
            query: route.query,
            hash: route.hash
        }).finally(() => {
            syncingRouteFromSheet =
                false;
        });

        return;
    }

    syncingSheetFromRoute =
        true;

    selectedService.value =
        matchedService;

    serviceDetailsOpen.value =
        true;

    syncingSheetFromRoute =
        false;
}

function resetFilters() {
    searchTerm.value =
        '';

    selectedCategory.value =
        'all';

    if (
        !searchFocused.value
    ) {
        startSearchPlaceholderAnimation();
    }
}

/*
|--------------------------------------------------------------------------
| Search placeholder
|--------------------------------------------------------------------------
*/

const searchPlaceholders = [
    'Psychologické vyšetrenie',
    'Vodičské oprávnenie',
    'Psychológ pre dieťa',
    'Psychoterapia',
    'Vyšetrenie vodičov',
    'Klinická psychológia'
];

const showAnimatedSearchPlaceholder =
    computed(() => {
        return (
            !searchTerm.value &&
            !searchFocused.value
        );
    });

const displayedSearchPlaceholder =
    computed(() => {
        return searchPlaceholderText.value;
    });

function stopSearchPlaceholderAnimation() {
    if (
        searchPlaceholderTimer ===
        null
    ) {
        return;
    }

    window.clearTimeout(
        searchPlaceholderTimer
    );

    searchPlaceholderTimer =
        null;
}

function schedulePlaceholderTick(
    delay
) {
    stopSearchPlaceholderAnimation();

    searchPlaceholderTimer =
        window.setTimeout(
            () => {
                animateSearchPlaceholder();
            },
            delay
        );
}

function animateSearchPlaceholder() {
    if (
        searchFocused.value ||
        searchTerm.value
    ) {
        return;
    }

    const target =
        searchPlaceholders[
            searchPlaceholderIndex.value
        ];

    if (
        !searchPlaceholderDeleting.value
    ) {
        if (
            searchPlaceholderText.value.length <
            target.length
        ) {
            searchPlaceholderText.value =
                target.slice(
                    0,
                    searchPlaceholderText.value.length +
                        1
                );

            schedulePlaceholderTick(
                65 +
                Math.random() *
                    55
            );

            return;
        }

        searchPlaceholderDeleting.value =
            true;

        schedulePlaceholderTick(
            1800
        );

        return;
    }

    if (
        searchPlaceholderText.value.length >
        0
    ) {
        searchPlaceholderText.value =
            searchPlaceholderText.value.slice(
                0,
                -1
            );

        schedulePlaceholderTick(
            30 +
                Math.random() *
                    30
        );

        return;
    }

    searchPlaceholderDeleting.value =
        false;

    searchPlaceholderIndex.value =
        (
            searchPlaceholderIndex.value +
            1
        ) %
        searchPlaceholders.length;

    schedulePlaceholderTick(
        450
    );
}

function startSearchPlaceholderAnimation() {
    if (
        searchFocused.value ||
        searchTerm.value ||
        searchPlaceholderTimer
    ) {
        return;
    }

    schedulePlaceholderTick(
        700
    );
}

function handleSearchFocus() {
    searchFocused.value =
        true;

    stopSearchPlaceholderAnimation();
}

function handleSearchBlur() {
    searchFocused.value =
        false;

    if (
        !searchTerm.value
    ) {
        startSearchPlaceholderAnimation();
    }
}

function clearSearch() {
    searchTerm.value =
        '';

    if (
        !searchFocused.value
    ) {
        startSearchPlaceholderAnimation();
    }
}

/*
|--------------------------------------------------------------------------
| Watch
|--------------------------------------------------------------------------
*/

watch(
    [
        () => props.expanded,
        () => props.transitioning
    ],

    () => {
        stopSearchPlaceholderAnimation();

        if (
            props.expanded &&
            !props.transitioning
        ) {
            startSearchPlaceholderAnimation();
        }
    }
);

watch(
    [
        () => route.name,
        () => route.params.serviceSlug,
        activeServices,
        loading
    ],

    () => {
        syncSheetWithRoute();
    },

    {
        immediate: true
    }
);

watch(
    serviceDetailsOpen,

    (isOpen) => {
        if (
            syncingSheetFromRoute ||
            syncingRouteFromSheet
        ) {
            return;
        }

        if (isOpen) {
            if (
                selectedService.value
            ) {
                openRouteSyncedService(
                    selectedService.value,
                    {
                        replace: true
                    }
                );
            }

            return;
        }

        if (
            route.name ===
            'service-detail'
        ) {
            syncingRouteFromSheet =
                true;

            router.replace({
                name: 'services',
                query: route.query,
                hash: route.hash
            }).finally(() => {
                syncingRouteFromSheet =
                    false;
            });
        }

        selectedService.value =
            null;
    }
);

/*
|--------------------------------------------------------------------------
| Lifecycle
|--------------------------------------------------------------------------
*/

onMounted(() => {
    if (
        props.expanded &&
        !props.transitioning
    ) {
        startSearchPlaceholderAnimation();
    }
});

onBeforeUnmount(() => {
    stopSearchPlaceholderAnimation();
});
</script>

<template>
    <div
        data-transition-needs-settle
        class="
            page-paint-surface
            relative
            min-h-full
            min-w-0
            w-full
            overflow-x-clip
            bg-green
            text-baige
        "
    >
        <!-- Page -->
        <main
            class="
                mx-auto
                w-full
                py-12
            "
        >
            <!-- Hero -->
            <section
                class="
                    px-5

                    lg:px-10

                    xl:px-16
                "
            >
                <div
                    class="
                        mx-auto
                        flex
                        max-w-7xl
                        flex-col
                        items-center
                        text-center
                    "
                >
                    <h1
                        class="
                            text-xl
                            font-bold
                            text-baige
                        "
                    >
                        Ponúkané služby
                    </h1>

                    <p
                        class="
                            text-regular
                            mt-4
                            max-w-xl
                            leading-[1.65]
                            text-baige/70

                            lg:text-lg
                        "
                    >
                        {{ pageDescription }}
                    </p>
                </div>
            </section>

            <!-- Search -->
            <section
                class="
                    mt-10
                    px-5

                    lg:mt-14
                    lg:px-10

                    xl:px-16
                "
            >
                <form
                    data-transition-stable
                    class="
                        mx-auto
                        flex
                        min-w-0
                        w-full
                        max-w-5xl
                        flex-col
                        gap-2
                        overflow-hidden
                        rounded-[2rem]
                        bg-baige
                        p-2
                        shadow-[var(--shadow-mid)]

                        md:flex-row
                        md:items-center
                    "
                    @submit.prevent
                >
                    <!-- Category -->
                    <div
                        class="
                            relative
                            min-w-0
                            shrink-0

                            md:w-[15rem]
                        "
                    >
                        <div
                            class="
                                pointer-events-none
                                absolute
                                inset-0
                                z-10
                                flex
                                items-center
                                pl-3
                                pr-10
                            "
                        >
                            <span
                                class="
                                    text-regular
                                    block
                                    min-w-0
                                    flex-1
                                    truncate
                                    text-green
                                "
                            >
                                {{
                                    selectedCategoryLabel
                                }}
                            </span>
                        </div>

                        <select
                            v-model="
                                selectedCategory
                            "
                            class="
                                text-regular
                                relative
                                z-20
                                h-12
                                w-full
                                cursor-pointer
                                appearance-none
                                rounded-[1.5rem]
                                border-0
                                bg-transparent
                                py-0
                                pl-3
                                pr-10
                                text-transparent
                                outline-none
                                focus:ring-0

                                md:rounded-none
                            "
                        >
                            <option
                                v-for="
                                    category in
                                    categoryOptions
                                "
                                :key="
                                    category.value
                                "
                                :value="
                                    category.value
                                "
                                class="
                                    text-green
                                "
                            >
                                {{
                                    category.label
                                }}
                            </option>
                        </select>

                        <i
                            class="
                                bi
                                bi-chevron-down
                                pointer-events-none
                                absolute
                                right-4
                                top-1/2
                                z-30
                                -translate-y-1/2
                                text-xs
                                text-green
                            "
                            aria-hidden="true"
                        />
                    </div>

                    <!-- Search input -->
                    <div
                        class="
                            relative
                            min-w-0
                            flex-1

                            md:ml-3
                        "
                    >
                        <i
                            class="
                                bi
                                bi-search
                                pointer-events-none
                                absolute
                                left-5
                                top-1/2
                                z-20
                                -translate-y-1/2
                                text-green/50
                            "
                            aria-hidden="true"
                        />

                        <div
                            v-if="
                                showAnimatedSearchPlaceholder
                            "
                            class="
                                pointer-events-none
                                absolute
                                inset-y-0
                                left-12
                                right-12
                                z-10
                                flex
                                min-w-0
                                items-center
                                overflow-hidden
                            "
                        >
                            <span
                                class="
                                    text-regular
                                    block
                                    min-w-0
                                    max-w-full
                                    truncate
                                    whitespace-nowrap
                                    text-green/40
                                "
                            >
                                {{
                                    displayedSearchPlaceholder
                                }}

                                <span
                                    class="
                                        ml-[1px]
                                        inline-block
                                        h-[1.05em]
                                        w-px
                                        translate-y-[0.14em]
                                        animate-pulse
                                        bg-green/35
                                    "
                                />
                            </span>
                        </div>

                        <input
                            v-model="
                                searchTerm
                            "
                            type="search"
                            autocomplete="off"
                            aria-label="Hľadať službu"
                            class="
                                text-regular
                                relative
                                z-0
                                h-12
                                w-full
                                rounded-[1.5rem]
                                border
                                border-green
                                bg-transparent
                                py-0
                                pl-12
                                pr-12
                                text-green
                                outline-none
                                transition-colors
                                duration-300

                                focus:border-green/25
                                focus:ring-0
                            "
                            @focus="
                                handleSearchFocus
                            "
                            @blur="
                                handleSearchBlur
                            "
                        >

                        <button
                            v-if="
                                searchTerm
                            "
                            type="button"
                            class="
                                absolute
                                right-4
                                top-1/2
                                z-30
                                flex
                                size-7
                                -translate-y-1/2
                                items-center
                                justify-center
                                rounded-full
                                text-green/45
                                transition-all
                                duration-200

                                hover:bg-green/10
                                hover:text-green
                            "
                            aria-label="Vymazať vyhľadávanie"
                            @mousedown.prevent
                            @click="
                                clearSearch
                            "
                        >
                            <i
                                class="
                                    bi
                                    bi-x-lg
                                    text-xs
                                "
                                aria-hidden="true"
                            />
                        </button>
                    </div>

                    <button
                        type="submit"
                        class="
                            flex
                            h-12
                            w-full
                            shrink-0
                            items-center
                            justify-center
                            gap-3
                            rounded-[1.5rem]
                            bg-green
                            px-6
                            text-baige
                            transition-all
                            duration-200

                            hover:-translate-y-0.5

                            active:translate-y-0
                            active:scale-95

                            md:w-12
                            md:px-0
                        "
                        aria-label="Hľadať"
                    >
                        <span
                            class="
                                text-regular

                                md:hidden
                            "
                        >
                            Hľadať
                        </span>

                        <i
                            class="
                                bi
                                bi-search
                                hidden
                                text-base

                                md:block
                            "
                            aria-hidden="true"
                        />
                    </button>
                </form>
            </section>

            <!-- Groups -->
            <section
                v-if="
                    groupedServices.length
                "
                class="
                    mt-16
                    space-y-20

                    lg:mt-24
                    lg:space-y-28
                "
            >
                <section
                    v-for="
                        group in
                        groupedServices
                    "
                    :key="
                        group.value
                    "
                    class="
                        min-w-0
                    "
                >
                    <!-- Category heading -->
                    <div
                        class="
                            px-5
                            text-center

                            lg:px-10
                        "
                    >
                        <h2
                            class="
                                text-xl
                                font-bold
                                text-baige
                            "
                        >
                            {{ group.label }}
                        </h2>

                        <p
                            class="
                                text-regular
                                mt-2
                                text-sm
                                text-baige/60
                            "
                        >
                            {{
                                group.services.length
                            }}

                            {{
                                group.services.length ===
                                1
                                    ? 'služba'
                                    : group.services.length <=
                                        4
                                        ? 'služby'
                                        : 'služieb'
                            }}
                        </p>
                    </div>

                    <!-- Same slider, straight + finite -->
                    <div
                        data-transition-stable
                        class="
                            mt-7
                            min-w-0
                        "
                    >
                        <ServicesSlider
                            :items="
                                group.services
                            "
                            :aria-label="
                                group.label
                            "
                            mode="linear"
                            :infinite="
                                false
                            "
                            :equal-height="
                                true
                            "
                            :scroll-motion="
                                sliderMotionEnabled
                            "
                            @select="
                                openServiceDetails
                            "
                        >
                            <template
                                #card="{ item }"
                            >
                                <ServiceCardContent
                                    :service="
                                        item
                                    "
                                    @open="
                                        openServiceDetails(
                                            item
                                        )
                                    "
                                />
                            </template>
                        </ServicesSlider>
                    </div>
                </section>
            </section>

            <!-- Empty -->
            <section
                v-else
                class="
                    mx-auto
                    flex
                    max-w-xl
                    flex-col
                    items-center
                    px-5
                    py-24
                    text-center
                "
            >
                <div
                    class="
                        flex
                        size-14
                        items-center
                        justify-center
                        rounded-full
                        bg-baige/10
                        text-baige/60
                    "
                >
                    <i
                        class="
                            bi
                            bi-search
                            text-xl
                        "
                        aria-hidden="true"
                    />
                </div>

                <h2
                    class="
                        mt-5
                        text-xl
                        font-bold
                        text-baige
                    "
                >
                    Nenašli sme žiadnu službu
                </h2>

                <p
                    class="
                        text-regular
                        mt-3
                        max-w-md
                        text-baige/65
                    "
                >
                    Skúste zmeniť hľadaný výraz
                    alebo vyberte inú kategóriu.
                </p>

                <div
                    class="
                        mt-7
                    "
                >
                    <Button
                        background-image=""
                        background-color="var(--color-baige)"
                        text-color="var(--color-green)"
                        @click="
                            resetFilters
                        "
                    >
                        Zobraziť všetky služby
                    </Button>
                </div>
            </section>

            <!-- Contact -->
            <section
                class="
                    mx-auto
                    mt-20
                    flex
                    w-full
                    max-w-4xl
                    flex-col
                    items-center
                    justify-center
                    gap-3
                    px-5
                    pb-12
                    text-center

                    lg:pb-20
                "
            >
                <h2
                    class="
                        text-xl
                        font-bold
                        text-baige
                    "
                >
                    Nie ste si istí, ktorá služba je pre vás vhodná?
                </h2>

                <p
                    class="
                        text-regular
                        mt-3
                        text-baige/70
                    "
                >
                    Kontaktujte nás a my vám radi poradíme s výberom
                    vhodnej služby.
                </p>

                <div
                    class="
                        my-6
                    "
                >
                    <Button
                        :href="
                            contactUrl
                        "
                        background-image=""
                        background-color="var(--color-baige)"
                        text-color="var(--color-green)"
                    >
                        Kontakt
                    </Button>
                </div>
            </section>
        </main>

        <ServiceBottomSheet
            v-if="
                props.expanded &&
                !props.transitioning
            "
            v-model="
                serviceDetailsOpen
            "
            :service="
                selectedService
            "
        />
    </div>
</template>

<style scoped>
input[type="search"]::-webkit-search-cancel-button,
input[type="search"]::-webkit-search-decoration,
input[type="search"]::-webkit-search-results-button,
input[type="search"]::-webkit-search-results-decoration {
    appearance: none;
    -webkit-appearance: none;
}
</style>