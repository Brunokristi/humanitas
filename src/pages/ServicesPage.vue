<script setup>
import {
    computed,
    onBeforeUnmount,
    onMounted,
    ref
} from 'vue';

import { storeToRefs } from 'pinia';

import { usePublicSiteStore } from '../stores/publicSite';

import Button from '../components/Button.vue';
import Card from '../components/Card.vue';
import ServiceBottomSheet from '../components/ServiceBottomSheet.vue';

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

const searchTerm =
    ref('');

const selectedCategory =
    ref('all');

const selectedService =
    ref(null);

const serviceDetailsOpen =
    ref(false);

const categoryTracks =
    new Map();

/*
 * Services
 */

const activeServices = computed(() => {
    return services.value.filter(
        (service) => {
            return service.isActive;
        }
    );
});

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
            label: 'Všetky kategórie',
            value: 'all'
        },
        ...categories.values()
    ];
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
                        .filter(Boolean)
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
                        services: []
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

/*
 * Helpers
 */

function normalizeText(value) {
    return String(
        value ?? ''
    )
        .trim()
        .toLocaleLowerCase('sk')
        .normalize('NFD')
        .replace(
            /[\u0300-\u036f]/g,
            ''
        );
}

function trimText(
    value,
    maxLength
) {
    const text =
        String(
            value ?? ''
        ).trim();

    if (!text) {
        return '';
    }

    if (
        text.length <=
        maxLength
    ) {
        return text;
    }

    return `${text
        .slice(
            0,
            maxLength
        )
        .trim()}…`;
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

function serviceTitle(service) {
    return trimText(
        service?.name,
        80
    );
}

function serviceDescription(service) {
    return trimText(
        rawServiceDescription(
            service
        ),
        105
    );
}

function serviceDurationLabel(
    service
) {
    const minutes =
        service?.durationMinutes ??
        service?.duration_minutes;

    const sessions =
        service?.durationSessions ??
        service?.duration_sessions;

    if (!minutes) {
        return null;
    }

    if (
        sessions &&
        sessions > 1
    ) {
        return `${sessions} × ${minutes} min`;
    }

    return `${minutes} min`;
}

function selfPayPrice(service) {
    return (
        service?.selfPayAmount ??
        service?.self_pay_amount ??
        null
    );
}

function hasSelfPayPrice(service) {
    return (
        selfPayPrice(
            service
        ) !== null
    );
}

function openServiceDetails(service) {
    selectedService.value =
        service;

    serviceDetailsOpen.value =
        true;
}

function resetFilters() {
    searchTerm.value =
        '';

    selectedCategory.value =
        'all';

    if (!searchFocused.value) {
        startSearchPlaceholderAnimation();
    }
}

/*
 * Search
 */

const searchFocused =
    ref(false);

const searchPlaceholderText =
    ref('');

const searchPlaceholderIndex =
    ref(0);

const searchPlaceholderDeleting =
    ref(false);

let searchPlaceholderTimer =
    null;

const searchPlaceholders = [
    'Psychologické vyšetrenie',
    'Vodičské oprávnenie',
    'Psychológ pre dieťa',
    'Psychoterapia',
    'Vyšetrenie vodičov',
    'Klinická psychológia'
];

const showAnimatedSearchPlaceholder = computed(() => {
    return (
        !searchTerm.value &&
        !searchFocused.value
    );
});

const selectedCategoryLabel = computed(() => {
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

function schedulePlaceholderTick(delay) {
    stopSearchPlaceholderAnimation();

    searchPlaceholderTimer =
        window.setTimeout(() => {
            animateSearchPlaceholder();
        }, delay);
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

    /*
     * Type the current phrase.
     */
    if (!searchPlaceholderDeleting.value) {
        if (
            searchPlaceholderText.value.length <
            target.length
        ) {
            searchPlaceholderText.value =
                target.slice(
                    0,
                    searchPlaceholderText.value.length + 1
                );

            schedulePlaceholderTick(
                65 +
                Math.random() *
                55
            );

            return;
        }

        /*
         * Keep the complete phrase visible
         * before deleting it.
         */
        searchPlaceholderDeleting.value =
            true;

        schedulePlaceholderTick(
            1800
        );

        return;
    }

    /*
     * Delete the current phrase.
     */
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

    /*
     * Continue with the next phrase.
     */
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

function handleSearchFocus() {
    searchFocused.value =
        true;

    stopSearchPlaceholderAnimation();
}

function handleSearchBlur() {
    searchFocused.value =
        false;

    if (!searchTerm.value) {
        startSearchPlaceholderAnimation();
    }
}

function clearSearch() {
    searchTerm.value =
        '';
}

onMounted(() => {
    startSearchPlaceholderAnimation();
});

onBeforeUnmount(() => {
    stopSearchPlaceholderAnimation();
});

/*
 * Playful cards
 */

function serviceCardPosition(
    index,
    groupIndex
) {
    const positions = [
        '-rotate-[2deg] translate-y-4',
        'rotate-[1.5deg] -translate-y-1',
        '-rotate-[1deg] translate-y-7',
        'rotate-[2deg] translate-y-2',
        '-rotate-[1.5deg] -translate-y-2',
        'rotate-[1deg] translate-y-6'
    ];

    const offsets = [
        0,
        2,
        5,
        1,
        4,
        3
    ];

    const offset =
        offsets[
            groupIndex %
            offsets.length
        ];

    return positions[
        (
            index +
            offset
        ) %
        positions.length
    ];
}

function categoryHeadingPosition(index) {
    const positions = [
        '-rotate-[0.8deg] translate-x-1',
        'rotate-[0.7deg] -translate-x-1',
        '-rotate-[0.5deg] translate-x-2'
    ];

    return positions[
        index %
        positions.length
    ];
}

function serviceBackgroundPosition(service) {
    const seed =
        String(
            service?.id ??
            service?.slug ??
            service?.name ??
            ''
        );

    let hash =
        0;

    for (
        let index = 0;
        index < seed.length;
        index++
    ) {
        hash =
            (
                hash *
                31 +
                seed.charCodeAt(
                    index
                )
            ) >>> 0;
    }

    const x =
        10 +
        (
            hash %
            81
        );

    const y =
        10 +
        (
            Math.floor(
                hash /
                81
            ) %
            81
        );

    return `${x}% ${y}%`;
}

/*
 * Category slider
 */

function setCategoryTrack(
    category,
    element
) {
    if (!element) {
        categoryTracks.delete(
            category
        );

        return;
    }

    categoryTracks.set(
        category,
        element
    );
}

function scrollCategory(
    category,
    direction
) {
    const track =
        categoryTracks.get(
            category
        );

    if (!track) {
        return;
    }

    const card =
        track.querySelector(
            '[data-service-slide]'
        );

    if (!card) {
        return;
    }

    const styles =
        window.getComputedStyle(
            track
        );

    const gap =
        Number.parseFloat(
            styles.columnGap ||
            styles.gap ||
            '0'
        ) || 0;

    const distance =
        card.getBoundingClientRect()
            .width +
        gap;

    track.scrollBy({
        left:
            direction *
            distance,
        behavior: 'smooth'
    });
}
</script>

<template>
    <div>
        <!-- Loading -->
        <div
            v-if="
                loading &&
                !company
            "
            class="
                mx-auto
                w-full
                max-w-[100rem]
                px-5
                py-10

                lg:px-10

                xl:px-16
            "
        >
            <div
                class="
                    mx-auto
                    max-w-xl
                    space-y-4
                "
            >
                <div
                    class="
                        mx-auto
                        h-10
                        w-60
                        animate-pulse
                        rounded-full
                        bg-baige/10
                    "
                />

                <div
                    class="
                        h-5
                        w-full
                        animate-pulse
                        rounded-full
                        bg-baige/10
                    "
                />
            </div>

            <div
                class="
                    mx-auto
                    mt-12
                    h-16
                    max-w-5xl
                    animate-pulse
                    rounded-[2rem]
                    bg-baige/10
                "
            />

            <div
                class="
                    mt-16
                    flex
                    gap-5
                    overflow-hidden
                "
            >
                <div
                    v-for="index in 4"
                    :key="index"
                    class="
                        h-[27rem]
                        w-[72vw]
                        max-w-[21rem]
                        shrink-0
                        animate-pulse
                        rounded-[2.5rem]
                        bg-baige/10

                        lg:w-[19rem]
                    "
                />
            </div>
        </div>

        <!-- Error -->
        <div
            v-else-if="
                error &&
                !company
            "
            class="
                mx-auto
                max-w-xl
                px-5
                py-16
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
                Obsah sa nepodarilo načítať
            </h1>

            <p
                class="
                    text-regular
                    mt-5
                    text-baige/65
                "
            >
                {{ error }}
            </p>

            <div class="mt-8">
                <Button
                    background-image=""
                    background-color="#FBF9F3"
                    text-color="#335940"
                    @click="
                        publicSiteStore.reload
                    "
                >
                    Skúsiť znova
                </Button>
            </div>
        </div>

        <!-- Page -->
        <main
            v-else
            class="
                mx-auto
                w-full
                max-w-[100rem]
                pt-5
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

                        lg:items-start
                        lg:text-left
                    "
                >
                    <div
                        class="
                            lg:rotate-0
                        "
                    >
                        <h1
                            class="
                                text-xl
                                font-bold
                                text-baige

                                lg:text-4xl

                                xl:text-5xl
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
                    class="
                        mx-auto
                        flex
                        w-full
                        max-w-5xl
                        flex-col
                        gap-2
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
                        <!-- Visible category -->
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
                                {{ selectedCategoryLabel }}
                            </span>
                        </div>

                        <!-- Actual select -->
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
                                {{ category.label }}
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
                                text-green/45
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
                        "
                    >
                        <!-- Search icon -->
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

                        <!-- Animated placeholder -->
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
                                {{ searchPlaceholderText }}

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

                        <!-- Actual input -->
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
                                border-green/10
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

                                md:ml-3
                            "
                            @focus="
                                handleSearchFocus
                            "
                            @blur="
                                handleSearchBlur
                            "
                        >

                        <!-- Clear -->
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

                    <!-- Search button -->
                    <button
                        type="submit"
                        class="
                            flex
                            h-12
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
                        <!-- Mobile text -->
                        <span
                            class="
                                text-regular

                                md:hidden
                            "
                        >
                            Hľadať
                        </span>

                        <!-- Desktop icon -->
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

            <!-- Grouped services -->
            <section
                v-if="
                    groupedServices.length
                "
                class="
                    mt-16
                    space-y-10

                    lg:mt-24
                    lg:space-y-20
                "
            >
                <section
                    v-for="
                        (group, groupIndex) in
                        groupedServices
                    "
                    :key="
                        group.value
                    "
                    class="
                        min-w-0
                        overflow-hidden
                    "
                >
                    <!-- Header -->
                    <div
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
                                items-end
                                justify-between
                                gap-6
                            "
                        >
                            <div
                                :class="
                                    categoryHeadingPosition(
                                        groupIndex
                                    )
                                "
                                class="
                                    origin-left
                                    transition-transform
                                    lg:translate-x-0
                                "
                            >
                                <h2
                                    class="
                                        mt-2
                                        max-w-xl
                                        text-xl
                                        font-bold
                                        text-baige

                                        lg:text-3xl

                                        xl:text-4xl
                                    "
                                >
                                    {{ group.label }}
                                </h2>

                                <p
                                    class="
                                        text-regular
                                        mt-2
                                        text-sm
                                        text-baige/55
                                    "
                                >
                                    {{
                                        group.services.length
                                    }}
                                    {{
                                        group.services.length === 1
                                            ? 'služba'
                                            : group.services.length <= 4
                                                ? 'služby'
                                                : 'služieb'
                                    }}
                                </p>
                            </div>

                            <!-- Desktop controls -->
                            <div
                                v-if="
                                    group.services.length >
                                    2
                                "
                                class="
                                    hidden
                                    shrink-0
                                    items-center
                                    gap-2

                                    md:flex
                                "
                            >
                                <button
                                    type="button"
                                    class="
                                        flex
                                        size-11
                                        items-center
                                        justify-center
                                        rounded-full
                                        border
                                        border-baige/20
                                        text-baige
                                        transition-all
                                        duration-300

                                        hover:-translate-y-0.5
                                        hover:bg-baige
                                        hover:text-green

                                        active:scale-95
                                    "
                                    :aria-label="
                                        `Predchádzajúce služby v kategórii ${group.label}`
                                    "
                                    @click="
                                        scrollCategory(
                                            group.value,
                                            -1
                                        )
                                    "
                                >
                                    <i
                                        class="
                                            bi
                                            bi-arrow-left
                                        "
                                        aria-hidden="true"
                                    />
                                </button>

                                <button
                                    type="button"
                                    class="
                                        flex
                                        size-11
                                        items-center
                                        justify-center
                                        rounded-full
                                        bg-baige
                                        text-green
                                        shadow-[var(--shadow-soft)]
                                        transition-all
                                        duration-300

                                        hover:-translate-y-0.5

                                        active:translate-y-0
                                        active:scale-95
                                    "
                                    :aria-label="
                                        `Ďalšie služby v kategórii ${group.label}`
                                    "
                                    @click="
                                        scrollCategory(
                                            group.value,
                                            1
                                        )
                                    "
                                >
                                    <i
                                        class="
                                            bi
                                            bi-arrow-right
                                        "
                                        aria-hidden="true"
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Slider -->
                    <div>
                        <div
                            :ref="
                                (element) => {
                                    setCategoryTrack(
                                        group.value,
                                        element
                                    );
                                }
                            "
                            class="
                                services-track
                                flex
                                snap-x
                                snap-mandatory
                                items-start
                                gap-3
                                overflow-x-auto
                                overscroll-x-contain
                                scroll-smooth
                                px-[8vw]
                                pb-14
                                pt-5

                                sm:gap-4
                                sm:px-[10vw]

                                lg:gap-5
                                lg:px-[max(2.5rem,calc((100vw-90rem)/2))]
                                lg:pb-16
                                lg:pt-6

                                xl:gap-6
                            "
                        >
                            <div
                                v-for="
                                    (
                                        service,
                                        serviceIndex
                                    ) in
                                    group.services
                                "
                                :key="
                                    service.id ??
                                    service.slug ??
                                    service.name
                                "
                                data-service-slide
                                class="
                                    flex
                                    w-[72vw]
                                    max-w-[19rem]
                                    shrink-0
                                    snap-center
                                    justify-center

                                    sm:w-[20rem]

                                    lg:w-[19rem]
                                    lg:max-w-none

                                    xl:w-[20.5rem]
                                "
                                :class="
                                    serviceCardPosition(
                                        serviceIndex,
                                        groupIndex
                                    )
                                "
                                role="button"
                                tabindex="0"
                                @click="
                                    openServiceDetails(
                                        service
                                    )
                                "
                                @keydown.enter="
                                    openServiceDetails(
                                        service
                                    )
                                "
                                @keydown.space.prevent="
                                    openServiceDetails(
                                        service
                                    )
                                "
                            >
                                <Card
                                    :item="
                                        service
                                    "
                                    :equal-height="
                                        true
                                    "
                                    :image-opacity="
                                        0.5
                                    "
                                    :background-position="
                                        serviceBackgroundPosition(
                                            service
                                        )
                                    "
                                    class="
                                        group/service
                                        h-[27rem]
                                        w-full
                                        max-w-none
                                        cursor-pointer
                                        transition-all
                                        duration-500
                                        ease-out

                                        hover:z-20
                                        hover:-translate-y-2
                                        hover:rotate-0
                                        hover:shadow-[var(--shadow-strong)]

                                        lg:h-[29rem]
                                    "
                                >
                                    <template
                                        #default="{ item }"
                                    >
                                        <div
                                            class="
                                                flex
                                                h-full
                                                w-full
                                                flex-col
                                            "
                                        >
                                            <!-- Title -->
                                            <div
                                                class="
                                                    min-h-[6rem]
                                                    shrink-0
                                                "
                                            >
                                                <h3
                                                    class="
                                                        text-regular
                                                        line-clamp-3
                                                        text-xl
                                                        font-bold
                                                        leading-[1.25]
                                                        text-green

                                                        lg:text-[1.35rem]
                                                    "
                                                >
                                                    {{
                                                        serviceTitle(
                                                            item
                                                        )
                                                    }}
                                                </h3>
                                            </div>

                                            <!-- Description -->
                                            <div
                                                class="
                                                    min-h-[4rem]
                                                    shrink-0
                                                "
                                            >
                                                <p
                                                    v-if="
                                                        serviceDescription(
                                                            item
                                                        )
                                                    "
                                                    class="
                                                        text-regular
                                                        line-clamp-3
                                                        text-sm
                                                        leading-[1.55]
                                                        text-green/70
                                                    "
                                                >
                                                    {{
                                                        serviceDescription(
                                                            item
                                                        )
                                                    }}
                                                </p>
                                            </div>

                                            <!-- Metadata -->
                                            <div
                                                class="
                                                    mt-auto
                                                    flex
                                                    flex-col
                                                    gap-3
                                                    pt-6
                                                "
                                            >
                                                <div
                                                    v-if="
                                                        serviceDurationLabel(
                                                            item
                                                        )
                                                    "
                                                    class="
                                                        border-l-2
                                                        border-green
                                                        pl-3
                                                    "
                                                >
                                                    <p
                                                        class="
                                                            text-regular
                                                            font-bold
                                                            leading-5
                                                            text-green
                                                        "
                                                    >
                                                        {{
                                                            serviceDurationLabel(
                                                                item
                                                            )
                                                        }}
                                                    </p>
                                                </div>

                                                <div
                                                    v-if="
                                                        hasSelfPayPrice(
                                                            item
                                                        )
                                                    "
                                                    class="
                                                        border-l-2
                                                        border-green
                                                        pl-3
                                                    "
                                                >
                                                    <p
                                                        class="
                                                            text-regular
                                                            font-bold
                                                            leading-5
                                                            text-green
                                                        "
                                                    >
                                                        od
                                                        {{
                                                            selfPayPrice(
                                                                item
                                                            )
                                                        }}
                                                        €
                                                    </p>
                                                </div>
                                            </div>

                                            <!-- CTA -->
                                            <div
                                                class="
                                                    flex
                                                    shrink-0
                                                    justify-center
                                                    pt-6
                                                "
                                            >
                                                <Button
                                                    background-image=""
                                                    background-color="#335940"
                                                    text-color="#FBF9F3"
                                                    @click.stop="
                                                        openServiceDetails(
                                                            item
                                                        )
                                                    "
                                                >
                                                    Viac o službe
                                                </Button>
                                            </div>
                                        </div>
                                    </template>
                                </Card>
                            </div>
                        </div>
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

                <div class="mt-7">
                    <Button
                        background-image=""
                        background-color="#FBF9F3"
                        text-color="#335940"
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
                    mt-16

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
                        flex
                        flex-wrap
                        justify-center
                        gap-3
                    "
                >
                    <Button
                        :href="
                            contactUrl
                        "
                        background-image=""
                        background-color="#FBF9F3"
                        text-color="#335940"
                    >
                        Kontakt
                    </Button>
                </div>
            </section>
        </main>

        <ServiceBottomSheet
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

.services-track {
    scrollbar-width: none;
    scroll-padding-inline: 8vw;
}

.services-track::-webkit-scrollbar {
    display: none;
}

@media (min-width: 1024px) {
    .services-track {
        scroll-padding-inline: max(
            2.5rem,
            calc((100vw - 90rem) / 2)
        );
    }
}
</style>