<script setup>
import {
    computed,
    onBeforeUnmount,
    onMounted,
    ref,
    watch
} from 'vue';
import {
    useRoute,
    useRouter
} from 'vue-router';

import { storeToRefs } from 'pinia';

import { usePageSeo } from '../composables/usePageSeo';
import { SITE_URL } from '../seo/site';
import { usePublicSiteStore } from '../stores/publicSite';

import Button from '../components/Button.vue';
import EmployeeCarousel from '../components/EmployeeCarousel.vue';
import FaqCarousel from '../components/Carousel.vue';
import ServiceBottomSheet from '../components/sheets/Service.vue';
import ServicesSlider from '../components/Slider.vue';
import EmployeeBottomSheet from '../components/sheets/Employee.vue';
import ServiceCardContent from '../components/ServiceCardContent.vue';

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

const router =
    useRouter();

const route =
    useRoute();

const publicSiteStore =
    usePublicSiteStore();

const {
    company,
    currentBranch,
    services,
    employees,
    contacts,
    openingHours,
    loading,
    error
} = storeToRefs(
    publicSiteStore
);

const servicesUrl =
    '/sluzby';

const contactUrl =
    '/kontakt';

/*
|--------------------------------------------------------------------------
| SEO
|--------------------------------------------------------------------------
*/

usePageSeo({
    pageKey: 'home',

    breadcrumbs: [
        {
            name: 'Domov',
            url: 'https://klinickapsychologiars.sk/'
        }
    ]
});

/*
|--------------------------------------------------------------------------
| Performance
|--------------------------------------------------------------------------
*/

const isMobilePerformanceMode =
    ref(
        typeof window !==
            'undefined'
            ? window.matchMedia(
                '(max-width: 767px), (pointer: coarse)'
            ).matches
            : false
    );

const heavyContentReady =
    ref(false);

let performanceMediaQuery =
    null;

let heavyContentTask =
    null;

const renderHeavyContent = computed(() => {
    return (
        !isMobilePerformanceMode.value ||
        heavyContentReady.value
    );
});

const decorativeMotionEnabled = computed(() => {
    return (
        props.expanded &&
        !props.transitioning
    );
});

function cancelHeavyContentTask() {
    if (
        heavyContentTask ===
        null
    ) {
        return;
    }

    if (
        typeof window !==
            'undefined' &&
        'cancelIdleCallback' in window
    ) {
        window.cancelIdleCallback(
            heavyContentTask
        );
    } else {
        window.clearTimeout(
            heavyContentTask
        );
    }

    heavyContentTask =
        null;
}

function scheduleHeavyContent() {
    if (
        !props.expanded ||
        props.transitioning ||
        heavyContentReady.value ||
        !isMobilePerformanceMode.value
    ) {
        return;
    }

    cancelHeavyContentTask();

    const reveal = () => {
        heavyContentTask =
            null;

        heavyContentReady.value =
            true;
    };

    if (
        typeof window !==
            'undefined' &&
        'requestIdleCallback' in window
    ) {
        heavyContentTask =
            window.requestIdleCallback(
                reveal,
                {
                    timeout: 320
                }
            );

        return;
    }

    heavyContentTask =
        window.setTimeout(
            reveal,
            90
        );
}

function updatePerformanceMode() {
    isMobilePerformanceMode.value =
        Boolean(
            performanceMediaQuery
                ?.matches
        );

    stopHeroPhraseAnimation();
    startHeroPhraseAnimation();

    if (
        isMobilePerformanceMode.value
    ) {
        scheduleHeavyContent();
    }
}

/*
|--------------------------------------------------------------------------
| Hero
|--------------------------------------------------------------------------
*/

const heroPhrases = [
    'váš príbeh',
    'to, čo prežívate',
    'vaše obavy',
    'vaše pocity',
    'to, čo je pre vás dôležité'
];

const heroPhraseIndex =
    ref(0);

let heroPhraseTimer =
    null;

const heroPhrase = computed(() => {
    return (
        heroPhrases[
            heroPhraseIndex.value
        ] ??
        ''
    );
});

function stopHeroPhraseAnimation() {
    if (
        heroPhraseTimer ===
        null
    ) {
        return;
    }

    window.clearInterval(
        heroPhraseTimer
    );

    heroPhraseTimer =
        null;
}

function startHeroPhraseAnimation() {
    if (
        heroPhraseTimer !==
            null ||
        !props.expanded ||
        props.transitioning
    ) {
        return;
    }

    heroPhraseTimer =
        window.setInterval(
            () => {
                heroPhraseIndex.value =
                    (
                        heroPhraseIndex.value +
                        1
                    ) %
                    heroPhrases.length;
            },
            2800
        );
}

/*
|--------------------------------------------------------------------------
| Services
|--------------------------------------------------------------------------
*/

const selectedService =
    ref(null);

const serviceDetailsOpen =
    ref(false);

let syncingSheetFromRoute =
    false;

let syncingRouteFromSheet =
    false;

const activeServices = computed(() => {
    return services.value.filter(
        (service) => {
            return service.isActive;
        }
    );
});

const homepageServices = computed(() => {
    return activeServices.value
        .filter(
            hasServiceDescription
        )
        .slice(
            0,
            6
        );
});

const remainingServicesCount =
    computed(() => {
        return Math.max(
            activeServices.value.length -
                homepageServices.value.length,
            0
        );
    });

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

function hasServiceDescription(
    service
) {
    return Boolean(
        String(
            rawServiceDescription(
                service
            )
        ).trim()
    );
}

function serviceTitle(service) {
    return trimText(
        service?.name,
        80
    );
}

function serviceDescription(
    service
) {
    return trimText(
        rawServiceDescription(
            service
        ),
        80
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
        return `${sessions} x ${minutes} min`;
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

function toRouteSlug(value) {
    const normalized =
        String(
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
            )
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
    return toRouteSlug(
        service?.slug ??
        service?.serviceSlug ??
        service?.service_slug ??
        service?.name ??
        service?.id
    );
}

function routeServiceSlug() {
    const queryValue =
        route.query.sluzba;

    const value =
        Array.isArray(queryValue)
            ? queryValue[0]
            : queryValue;

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

    return (
        activeServices.value.find(
            (service) => {
                return (
                    serviceRouteSlug(
                        service
                    ) === slug
                );
            }
        ) ?? null
    );
}

function updateHomeServiceQuery(
    serviceSlug,
    replace = false
) {
    const nextQuery = {
        ...route.query
    };

    if (serviceSlug) {
        nextQuery.sluzba =
            serviceSlug;
    } else {
        delete nextQuery.sluzba;
    }

    syncingRouteFromSheet =
        true;

    const action = replace
        ? router.replace({
            query: nextQuery,
            hash: route.hash
        })
        : router.push({
            query: nextQuery,
            hash: route.hash
        });

    action.finally(() => {
        syncingRouteFromSheet =
            false;
    });
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

    const serviceSlug =
        serviceRouteSlug(
            service
        );

    if (!serviceSlug) {
        return;
    }

    if (
        routeServiceSlug() ===
        serviceSlug
    ) {
        return;
    }

    updateHomeServiceQuery(
        serviceSlug,
        replace
    );
}

function syncServiceSheetWithRoute() {
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

        updateHomeServiceQuery(
            null,
            true
        );

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

function openServiceDetails(
    service
) {
    openRouteSyncedService(
        service
    );
}

/*
|--------------------------------------------------------------------------
| Team
|--------------------------------------------------------------------------
*/

const selectedEmployee =
    ref(null);

const employeeSheetOpen =
    ref(false);

let syncingEmployeeSheetFromRoute =
    false;

let syncingEmployeeRouteFromSheet =
    false;

const orderedEmployees = computed(() => {
    const normalizeName = (
        employee
    ) => {
        return employeeName(
            employee
        )
            .normalize('NFD')
            .replace(
                /[\u0300-\u036f]/g,
                ''
            )
            .toLocaleLowerCase(
                'sk'
            );
    };

    return [
        ...employees.value
            .filter((employee) => {
                return employee?.isActive !== false;
            })
    ].sort((left, right) => {
        const leftName =
            normalizeName(left);

        const rightName =
            normalizeName(right);

        const leftIsLenka =
            leftName.includes(
                'lenka hafernikova'
            );

        const rightIsLenka =
            rightName.includes(
                'lenka hafernikova'
            );

        if (
            leftIsLenka &&
            !rightIsLenka
        ) {
            return -1;
        }

        if (
            !leftIsLenka &&
            rightIsLenka
        ) {
            return 1;
        }

        return 0;
    });
});

function employeeName(employee) {
    return [
        employee?.titleBefore,
        employee?.firstName,
        employee?.lastName,
        employee?.titleAfter
    ]
        .filter(Boolean)
        .join(' ');
}

function employeeRouteSlug(employee) {
    const candidate =
        employee?.slug ??
        employeeName(employee) ??
        employee?.id ??
        null;

    return toRouteSlug(
        candidate
    );
}

function routeEmployeeSlug() {
    const rawSlug =
        route.params.employeeSlug;

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

function findEmployeeByRouteSlug(slug) {
    if (!slug) {
        return null;
    }

    return (
        orderedEmployees.value.find(
            (employee) => {
                return (
                    employeeRouteSlug(
                        employee
                    ) === slug
                );
            }
        ) ?? null
    );
}

function openRouteSyncedEmployee(
    employee,
    options = {}
) {
    if (!employee) {
        return;
    }

    const {
        syncRoute = true,
        replace = false
    } = options;

    selectedEmployee.value =
        employee;

    employeeSheetOpen.value =
        true;

    if (
        !syncRoute ||
        syncingEmployeeSheetFromRoute
    ) {
        return;
    }

    const slug =
        employeeRouteSlug(
            employee
        );

    if (!slug) {
        return;
    }

    if (
        route.name ===
            'employee-detail' &&
        routeEmployeeSlug() === slug
    ) {
        return;
    }

    syncingEmployeeRouteFromSheet =
        true;

    const navigation = {
        name: 'employee-detail',
        params: {
            employeeSlug: slug
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
        syncingEmployeeRouteFromSheet =
            false;
    });
}

function syncEmployeeSheetWithRoute() {
    if (
        route.name !==
            'home' &&
        route.name !==
            'employee-detail'
    ) {
        return;
    }

    const slug =
        routeEmployeeSlug();

    if (!slug) {
        if (employeeSheetOpen.value) {
            syncingEmployeeSheetFromRoute =
                true;

            employeeSheetOpen.value =
                false;

            selectedEmployee.value =
                null;

            syncingEmployeeSheetFromRoute =
                false;
        }

        return;
    }

    const matchedEmployee =
        findEmployeeByRouteSlug(
            slug
        );

    if (!matchedEmployee) {
        if (loading.value) {
            return;
        }

        syncingEmployeeRouteFromSheet =
            true;

        router.replace({
            name: 'home',
            query: route.query,
            hash: route.hash
        }).finally(() => {
            syncingEmployeeRouteFromSheet =
                false;
        });

        return;
    }

    syncingEmployeeSheetFromRoute =
        true;

    selectedEmployee.value =
        matchedEmployee;

    employeeSheetOpen.value =
        true;

    syncingEmployeeSheetFromRoute =
        false;
}

function openEmployee(employee) {
    const resolvedEmployee =
        employee ??
        orderedEmployees.value?.[0] ??
        null;

    if (!resolvedEmployee) {
        return;
    }

    openRouteSyncedEmployee(
        resolvedEmployee
    );
}

function clearEmployeeSeoTags() {
    if (typeof document === 'undefined') {
        return;
    }

    document.head
        .querySelectorAll(
            '[data-humanitas-employee-seo]'
        )
        .forEach((element) => {
            element.remove();
        });
}

function setEmployeeSeoTag(
    tagName,
    key,
    attributes,
    textContent = null
) {
    if (typeof document === 'undefined') {
        return;
    }

    const selector =
        `[data-humanitas-employee-seo="${key}"]`;

    let element =
        document.head.querySelector(
            selector
        );

    if (!element) {
        element =
            document.createElement(
                tagName
            );

        element.setAttribute(
            'data-humanitas-employee-seo',
            key
        );

        document.head.appendChild(
            element
        );
    }

    Object.entries(attributes).forEach(
        ([attributeName, attributeValue]) => {
            if (
                attributeValue === null ||
                attributeValue === undefined ||
                attributeValue === ''
            ) {
                element.removeAttribute(
                    attributeName
                );

                return;
            }

            element.setAttribute(
                attributeName,
                String(attributeValue)
            );
        }
    );

    if (textContent !== null) {
        element.textContent =
            textContent;
    }
}

function applyEmployeeRouteSeo() {
    if (typeof document === 'undefined') {
        return;
    }

    if (route.name !== 'employee-detail') {
        clearEmployeeSeoTags();
        return;
    }

    const routeSlug =
        routeEmployeeSlug();

    const employee =
        findEmployeeByRouteSlug(
            routeSlug
        );

    if (!employee) {
        return;
    }

    const slug =
        employeeRouteSlug(
            employee
        );

    if (!slug) {
        return;
    }

    const name =
        employeeName(employee) ||
        'Náš tím';

    const title =
        `${name} | Tím Humanitas`;

    const position =
        String(
            employee?.position ??
            ''
        ).trim();

    const bio =
        String(
            employee?.bio ??
            ''
        ).trim();

    const description =
        bio ||
        (position
            ? `${name} pôsobí v tíme Humanitas ako ${position}.`
            : `${name} je členom tímu Humanitas.`);

    const canonical =
        `${SITE_URL}/tim/${slug}`;

    document.title = title;
    document.documentElement.lang = 'sk';

    document.head
        .querySelectorAll(
            '[data-humanitas-seo]'
        )
        .forEach((element) => {
            element.remove();
        });

    setEmployeeSeoTag('meta', 'description', {
        name: 'description',
        content: description
    });

    setEmployeeSeoTag('meta', 'robots', {
        name: 'robots',
        content: 'index,follow'
    });

    setEmployeeSeoTag('link', 'canonical', {
        rel: 'canonical',
        href: canonical
    });

    setEmployeeSeoTag('meta', 'og:title', {
        property: 'og:title',
        content: title
    });

    setEmployeeSeoTag('meta', 'og:description', {
        property: 'og:description',
        content: description
    });

    setEmployeeSeoTag('meta', 'og:url', {
        property: 'og:url',
        content: canonical
    });

    setEmployeeSeoTag('meta', 'og:type', {
        property: 'og:type',
        content: 'profile'
    });

    setEmployeeSeoTag('meta', 'twitter:title', {
        name: 'twitter:title',
        content: title
    });

    setEmployeeSeoTag('meta', 'twitter:description', {
        name: 'twitter:description',
        content: description
    });

    setEmployeeSeoTag(
        'script',
        'jsonld',
        {
            type: 'application/ld+json'
        },
        JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name,
            description,
            worksFor: {
                '@type': 'MedicalClinic',
                name: 'Humanitas'
            },
            url: canonical
        })
    );
}

/*
|--------------------------------------------------------------------------
| FAQ
|--------------------------------------------------------------------------
*/

const todayDayOfWeek = computed(() => {
    const day =
        new Date().getDay();

    return day === 0
        ? 7
        : day;
});

const todaysOpeningHours =
    computed(() => {
        return (
            openingHours.value.find(
                (entry) => {
                    return (
                        entry.dayOfWeek ===
                        todayDayOfWeek.value
                    );
                }
            ) ??
            null
        );
    });

const openingHoursTodayLabel =
    computed(() => {
        const entry =
            todaysOpeningHours.value;

        if (!entry) {
            return 'Dnes neuvedené';
        }

        if (entry.isClosed) {
            return 'Dnes zatvorené';
        }

        if (
            !entry.intervals?.length
        ) {
            return 'Dnes neuvedené';
        }

        const schedule =
            entry.intervals
                .map((interval) => {
                    return `${interval.opensAt} - ${interval.closesAt}`;
                })
                .join(', ');

        return `Dnes ${schedule}`;
    });

const primaryContact = computed(() => {
    return (
        contacts.value.find(
            (contact) => {
                return contact.isPrimary;
            }
        ) ??
        contacts.value.find(
            (contact) => {
                return (
                    contact.type ===
                    'phone'
                );
            }
        ) ??
        contacts.value.find(
            (contact) => {
                return (
                    contact.type ===
                    'email'
                );
            }
        ) ??
        contacts.value[0] ??
        null
    );
});

const branchAddressLabel =
    computed(() => {
        const address =
            currentBranch.value
                ?.address;

        if (!address) {
            return '';
        }

        return [
            address.line1,
            address.line2,

            [
                address.postalCode,
                address.city
            ]
                .filter(Boolean)
                .join(' '),

            address.country
        ]
            .filter(Boolean)
            .join(', ');
    });

const faqItems = computed(() => {
    return [
        {
            id:
                'location',

            question:
                'Kde nás nájdete?',

            answer:
                branchAddressLabel.value
                    ? `Nájdete nás na adrese ${branchAddressLabel.value}.`
                    : 'Informácie o adrese nájdete v sekcii Kontakt.'
        },

        {
            id:
                'booking',

            question:
                'Ako sa objednať?',

            answer:
                primaryContact.value
                    ?.value
                    ? `Najjednoduchšie je zavolať nám na ${primaryContact.value.value}.`
                    : 'Kontaktujte nás prostredníctvom kontaktnej sekcie.'
        },

        {
            id:
                'opening-hours',

            question:
                'Kedy máme otvorené?',

            answer:
                openingHoursTodayLabel.value
        }
    ];
});

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

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
        .trim()}...`;
}

/*
|--------------------------------------------------------------------------
| Watchers
|--------------------------------------------------------------------------
*/

watch(
    [
        () => props.expanded,
        () => props.transitioning
    ],
    () => {
        stopHeroPhraseAnimation();
        startHeroPhraseAnimation();

        if (!props.expanded) {
            cancelHeavyContentTask();

            heavyContentReady.value =
                false;

            return;
        }

        if (!props.transitioning) {
            scheduleHeavyContent();
        }
    }
);

watch(
    [
        () => route.query.sluzba,
        activeServices,
        loading
    ],

    () => {
        syncServiceSheetWithRoute();
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

        updateHomeServiceQuery(
            null,
            true
        );

        selectedService.value =
            null;
    }
);

watch(
    [
        () => route.name,
        () => route.params.employeeSlug,
        orderedEmployees,
        loading
    ],

    () => {
        syncEmployeeSheetWithRoute();
        applyEmployeeRouteSeo();
    },

    {
        immediate: true
    }
);

watch(
    employeeSheetOpen,

    (isOpen) => {
        if (
            syncingEmployeeSheetFromRoute ||
            syncingEmployeeRouteFromSheet
        ) {
            return;
        }

        if (isOpen) {
            if (
                selectedEmployee.value
            ) {
                openRouteSyncedEmployee(
                    selectedEmployee.value,
                    {
                        replace: true
                    }
                );
            }

            return;
        }

        if (
            route.name ===
            'employee-detail'
        ) {
            syncingEmployeeRouteFromSheet =
                true;

            router.replace({
                name: 'home',
                query: route.query,
                hash: route.hash
            }).finally(() => {
                syncingEmployeeRouteFromSheet =
                    false;
            });
        }

        selectedEmployee.value =
            null;
    }
);

/*
|--------------------------------------------------------------------------
| Lifecycle
|--------------------------------------------------------------------------
*/

onMounted(() => {
    performanceMediaQuery =
        window.matchMedia(
            '(max-width: 767px), (pointer: coarse)'
        );

    performanceMediaQuery
        .addEventListener?.(
            'change',
            updatePerformanceMode
        );

    updatePerformanceMode();
    startHeroPhraseAnimation();
    scheduleHeavyContent();
});

onBeforeUnmount(() => {
    cancelHeavyContentTask();
    stopHeroPhraseAnimation();
    clearEmployeeSeoTags();

    performanceMediaQuery
        ?.removeEventListener?.(
            'change',
            updatePerformanceMode
        );

    performanceMediaQuery =
        null;
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
            bg-green
            text-baige
        "
    >
        <main
            class="
                relative
                isolate
                space-y-32
                py-12

                md:pb-24
            "
        >
            <!-- Hero -->
            <section
                class="
                    mx-auto
                    grid
                    w-full
                    max-w-7xl
                    grid-cols-1
                    items-center
                    gap-8

                    md:min-h-[36rem]
                    md:grid-cols-[minmax(0,0.9fr)_minmax(28rem,1.1fr)]
                    md:gap-14
                    md:px-10
                    md:pt-10

                    xl:gap-20
                    xl:px-16
                "
            >
                <div
                    class="
                        flex
                        flex-col
                        items-center
                        gap-6
                        text-center
                    "
                >
                    <h1
                        class="
                            max-w-2xl
                            text-xl
                            leading-[1.08]
                            text-baige

                            md:text-3xl
                        "
                    >
                        <span>
                            Podeľte sa s nami o
                        </span>

                        <br>

                        <span
                            class="
                                relative
                                inline-grid
                                min-h-[1.35em]
                                overflow-hidden
                                align-top
                            "
                        >
                            <Transition
                                name="hero-phrase"
                                mode="out-in"
                            >
                                <strong
                                    :key="
                                        heroPhrase
                                    "
                                    class="
                                        col-start-1
                                        row-start-1
                                        inline-block
                                        whitespace-nowrap
                                    "
                                >
                                    {{ heroPhrase }}
                                </strong>
                            </Transition>
                        </span>
                    </h1>

                    <p
                        class="
                            text-regular
                            max-w-lg
                            px-10
                            text-baige/70

                            md:px-0
                            md:text-lg
                        "
                    >
                        Pomáhame deťom, dospelým aj rodinám
                        lepšie porozumieť tomu, čo prežívajú.
                    </p>

                    <Button
                        :href="
                            contactUrl
                        "
                        background-image=""
                        background-color="var(--color-baige)"
                        text-color="var(--color-green)"
                        class="
                            mt-10
                            whitespace-nowrap
                        "
                    >
                        Objednať sa teraz
                    </Button>

                    <p
                        class="
                            text-regular
                            max-w-lg
                            px-10
                            text-baige/70

                            md:px-0
                        "
                    >
                        {{
                            currentBranch?.description ??
                            'Ambulancia klinickej a dopravnej psychológie a psychoterapie v Rimavskej Sobote'
                        }}
                    </p>


                </div>

                <div
                    data-transition-stable
                    class="
                        relative
                        flex
                        min-h-[20rem]
                        w-full
                        items-center
                        justify-center
                        overflow-x-clip

                        md:min-h-[34rem]
                        md:overflow-visible
                    "
                >
                    <img
                        src="/images/humanitas_rodina.svg"
                        alt="Humanitas"
                        class="
                            block
                            w-full
                            shrink-0
                            object-contain
                            opacity-70

                            md:max-h-[34rem]
                            md:max-w-[42rem]
                        "
                    >
                </div>
            </section>

            <!-- Services -->
            <section
                class="
                    mx-auto
                    flex
                    w-full
                    flex-col
                    gap-7
                "
            >
                <div
                    class="
                        flex
                        w-full
                        flex-col
                        items-center
                        gap-3
                        px-5
                        text-center

                        md:px-10

                        xl:px-16
                    "
                >
                    <h2
                        class="
                            text-xl
                            font-bold
                            text-baige

                            md:text-2xl
                        "
                    >
                        Ponúkané služby
                    </h2>

                    <p
                        class="
                            text-regular
                            max-w-md
                            text-baige/70
                        "
                    >
                        Pozrite si, s čím sa na nás môžete
                        obrátiť.
                    </p>
                </div>

                <div
                    data-transition-stable
                    class="
                        min-w-0
                        overflow-visible
                    "
                >
                    <ServicesSlider
                        v-if="
                            homepageServices.length
                        "
                        :items="
                            homepageServices
                        "
                        aria-label="Ponúkané služby"
                        mode="circular"
                        :infinite="true"
                        :equal-height="true"
                        :scroll-motion="
                            decorativeMotionEnabled
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

                    <p
                        v-else
                        class="
                            text-regular
                            text-center
                            text-baige/70
                        "
                    >
                        Služby momentálne nie sú k dispozícii.
                    </p>
                </div>

                <div
                    class="
                        flex
                        flex-col
                        items-center
                        gap-3
                        px-5
                        text-center
                    "
                >
                    <p
                        class="
                            text-regular
                            pb-3
                            text-baige/70
                        "
                    >
                        Nenašli ste, čo hľadáte?
                        <br>
                        Pozrite si všetky služby, ktoré ponúkame.
                    </p>

                    <Button
                        v-if="
                            remainingServicesCount >
                            0
                        "
                        :href="
                            servicesUrl
                        "
                        :notification="
                            remainingServicesCount
                        "
                        background-image=""
                        background-color="var(--color-baige)"
                        text-color="var(--color-green)"
                    >
                        Ďalšie služby
                    </Button>
                </div>
            </section>

            <!-- FAQ + Illustration + Team -->
            <section
                class="
                    relative
                    mx-auto
                    grid
                    w-full
                    max-w-7xl
                    grid-cols-1
                    gap-y-24

                    max-md:[content-visibility:auto]
                    max-md:[contain-intrinsic-size:auto_1200px]

                    lg:grid-cols-[minmax(0,1fr)_minmax(12rem,0.7fr)_minmax(0,1fr)]
                    lg:items-start
                    lg:gap-x-8
                    lg:px-10

                    xl:grid-cols-[minmax(0,1fr)_minmax(14rem,0.8fr)_minmax(0,1fr)]
                    xl:gap-x-12
                    xl:px-16
                "
            >
                <!-- FAQ -->
                <section
                    class="
                        relative
                        z-10
                        min-w-0
                        w-full
                        text-center
                    "
                >
                    <!-- Aligned copy -->
                    <div
                        class="
                            flex
                            min-h-[6.5rem]
                            flex-col
                            items-center
                            gap-3
                        "
                    >
                        <h2
                            class="
                                text-xl
                                font-bold
                                text-baige

                                lg:text-2xl
                            "
                        >
                            Časté otázky
                        </h2>

                        <p
                            class="
                                text-regular
                                max-w-sm
                                text-baige/70
                            "
                        >
                            Všetko dôležité na jednom mieste.
                        </p>
                    </div>

                    <!-- FAQ carousel -->
                    <div
                        class="
                            mt-8
                            flex
                            min-w-0
                            w-full
                            justify-center
                        "
                    >
                        <FaqCarousel
                            v-if="renderHeavyContent"
                            :items="faqItems"
                            :scroll-motion="
                                decorativeMotionEnabled
                            "
                        />
                    </div>

                    <!-- FAQ CTA -->
                    <div
                        class="
                            mt-8
                            flex
                            flex-col
                            items-center
                            gap-5
                        "
                    >
                        <p
                            class="
                                text-regular
                                max-w-xs
                                text-baige/70
                            "
                        >
                            Nenašli ste odpoveď?
                            <br>
                            Radi vám pomôžeme osobne.
                        </p>

                        <Button
                            :href="contactUrl"
                            background-image=""
                            background-color="var(--color-green)"
                            text-color="var(--color-baige)"
                        >
                            Kontaktujte nás
                        </Button>
                    </div>
                </section>

                <!-- Illustration -->
                <section
                    class="
                        relative
                        z-0
                        flex
                        w-full
                        items-center
                        justify-center
                        opacity-70

                        lg:min-h-[40rem]
                        lg:overflow-visible
                    "
                >
                    <img
                        src="/images/humanitas_ruky.svg"
                        alt=""
                        aria-hidden="true"
                        draggable="false"
                        class="
                            pointer-events-none
                            h-auto
                            w-[min(110vw,32rem)]
                            max-w-none
                            rotate-[35deg]
                            scale-[1.35]
                            object-contain
                            [transform-origin:center_center]

                            md:w-[36rem]
                            md:scale-[1.55]

                            lg:absolute
                            lg:left-1/2
                            lg:top-1/2
                            lg:w-[58rem]
                            lg:scale-[1.65]
                            lg:-translate-x-1/2
                            lg:-translate-y-1/2
                            lg:rotate-[1deg]

                            xl:w-[66rem]
                            xl:scale-[1.95]
                            2xl:w-[72rem]
                            2xl:scale-[2.05]

                        "
                    >
                </section>

                <!-- Team -->
                <section
                    v-if="orderedEmployees.length"
                    class="
                        relative
                        z-10
                        min-w-0
                        w-full
                        text-center
                        pb-10

                        md:pb-14
                    "
                >
                    <!-- Aligned copy -->
                    <div
                        class="
                            flex
                            min-h-[6.5rem]
                            flex-col
                            items-center
                            gap-3
                        "
                    >
                        <h2
                            class="
                                text-xl
                                font-bold
                                text-baige

                                lg:text-2xl
                            "
                        >
                            Náš tím
                        </h2>

                        <p
                            class="
                                text-regular
                                max-w-sm
                                text-baige/70
                            "
                        >
                            Ľudia, na ktorých sa môžete obrátiť.
                        </p>
                    </div>

                    <!-- Team carousel -->
                    <div
                        class="
                            mt-8
                            min-w-0
                            w-full
                            pb-4

                            md:pb-6
                        "
                    >
                        <EmployeeCarousel
                            v-if="renderHeavyContent"
                            :items="orderedEmployees"
                            aria-label="Náš tím"
                            :scroll-motion="
                                decorativeMotionEnabled
                            "
                            @select="
                                openEmployee
                            "
                        />
                    </div>
                </section>
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

        <EmployeeBottomSheet
            v-if="
                props.expanded &&
                !props.transitioning
            "
            v-model="
                employeeSheetOpen
            "
            :employee="
                selectedEmployee
            "
        />
    </div>
</template>

<style scoped>
.hero-phrase-enter-active,
.hero-phrase-leave-active {
    transition:
        opacity 520ms ease,
        transform 620ms cubic-bezier(
            0.16,
            1,
            0.3,
            1
        ),
        filter 520ms ease;
}

.hero-phrase-enter-from {
    opacity: 0;
    transform: translate3d(
        0,
        0.35em,
        0
    );
    filter: blur(4px);
}

.hero-phrase-enter-to {
    opacity: 1;
    transform: translate3d(
        0,
        0,
        0
    );
    filter: blur(0);
}

.hero-phrase-leave-from {
    opacity: 1;
    transform: translate3d(
        0,
        0,
        0
    );
    filter: blur(0);
}

.hero-phrase-leave-to {
    opacity: 0;
    transform: translate3d(
        0,
        -0.25em,
        0
    );
    filter: blur(3px);
}

@media (
    prefers-reduced-motion:
    reduce
) {
    .hero-phrase-enter-active,
    .hero-phrase-leave-active {
        transition:
            opacity 150ms ease;
    }

    .hero-phrase-enter-from,
    .hero-phrase-enter-to,
    .hero-phrase-leave-from,
    .hero-phrase-leave-to {
        transform: none;
        filter: none;
    }
}
</style>