<script setup>
import {
    computed,
    nextTick,
    onMounted,
    onUnmounted,
    ref,
    watch
} from 'vue';

import { storeToRefs } from 'pinia';
import {
    useRoute,
    useRouter
} from 'vue-router';

import { useCookieConsent } from '../../composables/useCookieConsent.js';
import { useScrollMotion } from '../../composables/useScrollMotion.js';
import { usePublicSiteStore } from '../../stores/publicSite.js';

import AppFooter from './AppFooter.vue';
import AppHeader from './AppHeader.vue';
import Button from '../Button.vue';
import CookieConsentSheet from '../sheets/CookieConsent.vue';

const route =
    useRoute();

const router =
    useRouter();

const publicSiteStore =
    usePublicSiteStore();

const {
    company,
    openingHours,
    loading,
    error
} = storeToRefs(
    publicSiteStore
);

const {
    initializeCookieConsent
} = useCookieConsent();

const {
    motionRoot
} = useScrollMotion({
    axis:
        'y',

    velocityMultiplier:
        0.24,

    velocityDecay:
        0.87,

    maxVelocity:
        7,

    travelMultiplier:
        1.2,

    straightenVelocity:
        4.5
});

/*
|--------------------------------------------------------------------------
| Navigation
|--------------------------------------------------------------------------
*/

const navigationItems = [
    {
        label: 'Domov',
        path: '/'
    },
    {
        label: 'Služby',
        path: '/sluzby'
    },
    {
        label: 'Kontakt',
        path: '/kontakt'
    }
];

const navigationElement =
    ref(null);

const navigationButtonElements =
    ref([]);

const navigationIndicatorStyle =
    ref({
        width: '0px',
        height: '0px',
        transform:
            'translate3d(0, 0, 0)',
        opacity: '0'
    });

let navigationResizeObserver =
    null;

function isActiveRoute(path) {
    if (path === '/') {
        return route.path === '/' || route.path.startsWith('/tim/');
    }

    return (
        route.path === path ||
        route.path.startsWith(
            `${path}/`
        )
    );
}

function navigate(path) {
    if (route.path === path) {
        return;
    }

    router.push(path);
}

function setNavigationButtonElement(
    element,
    index
) {
    navigationButtonElements.value[
        index
    ] =
        element?.$el ??
        element ??
        null;
}

function getActiveNavigationIndex() {
    return navigationItems.findIndex(
        (item) => {
            return isActiveRoute(
                item.path
            );
        }
    );
}

function updateNavigationIndicator() {
    const navigation =
        navigationElement.value;

    const activeIndex =
        getActiveNavigationIndex();

    const activeButton =
        navigationButtonElements.value[
            activeIndex
        ];

    if (
        !navigation ||
        !activeButton
    ) {
        navigationIndicatorStyle.value = {
            ...navigationIndicatorStyle.value,
            opacity: '0'
        };

        return;
    }

    const navigationRect =
        navigation.getBoundingClientRect();

    const buttonRect =
        activeButton.getBoundingClientRect();

    navigationIndicatorStyle.value = {
        width:
            `${buttonRect.width}px`,

        height:
            `${buttonRect.height}px`,

        transform: [
            'translate3d(',
            `${buttonRect.left - navigationRect.left}px, `,
            `${buttonRect.top - navigationRect.top}px, `,
            '0)'
        ].join(''),

        opacity:
            '1'
    };
}

async function refreshNavigationIndicator() {
    await nextTick();

    window.requestAnimationFrame(() => {
        updateNavigationIndicator();
    });
}

/*
|--------------------------------------------------------------------------
| Quick actions
|--------------------------------------------------------------------------
*/

const companyPhone = computed(() => {
    return (
        company.value?.phone ??
        company.value?.phoneNumber ??
        company.value?.phone_number ??
        company.value?.contactPhone ??
        company.value?.contact_phone ??
        ''
    );
});

const companyPhoneHref = computed(() => {
    const normalizedPhone =
        String(companyPhone.value)
            .replace(/[^\d+]/g, '');

    return normalizedPhone
        ? `tel:${normalizedPhone}`
        : null;
});

const companyEmail = computed(() => {
    return (
        company.value?.email ??
        company.value?.contactEmail ??
        company.value?.contact_email ??
        company.value?.publicEmail ??
        company.value?.public_email ??
        ''
    );
});

const companyEmailHref = computed(() => {
    const normalizedEmail =
        String(companyEmail.value)
            .trim();

    return normalizedEmail
        ? `mailto:${normalizedEmail}`
        : null;
});

const shouldShowQuickActions = computed(() => {
    return Boolean(
        companyPhoneHref.value ||
        companyEmailHref.value
    );
});

/*
|--------------------------------------------------------------------------
| Announcement ribbon
|--------------------------------------------------------------------------
*/

const MARQUEE_SPEED_PX_PER_SECOND =
    42;

const marqueeViewportElement =
    ref(null);

const marqueeTrackElement =
    ref(null);

const marqueeGroupElement =
    ref(null);

const marqueeGroupRepeatCount =
    ref(3);

const hasReducedMotionPreference =
    ref(false);

let marqueeAnimation =
    null;

let marqueeResizeObserver =
    null;

let reducedMotionMediaQuery =
    null;

const todayDayOfWeek = computed(() => {
    const day =
        new Date().getDay();

    return day === 0
        ? 7
        : day;
});

const dayLabelByWeekday = {
    1: 'v pondelok',
    2: 'v utorok',
    3: 'v stredu',
    4: 'vo štvrtok',
    5: 'v piatok',
    6: 'v sobotu',
    7: 'v nedeľu'
};

const dayNameByWeekday = {
    1: 'pondelok',
    2: 'utorok',
    3: 'streda',
    4: 'štvrtok',
    5: 'piatok',
    6: 'sobota',
    7: 'nedeľa'
};

function normalizeDayOfWeek(value) {
    if (
        typeof value ===
            'number' &&
        Number.isFinite(value)
    ) {
        return value;
    }

    if (
        typeof value ===
            'string' &&
        value.trim()
    ) {
        const normalizedValue =
            value
                .trim()
                .toLowerCase();

        const numeric =
            Number(normalizedValue);

        if (
            Number.isFinite(numeric)
        ) {
            return numeric;
        }

        const mappedValue = {
            monday: 1,
            mon: 1,
            pondelok: 1,
            utorok: 2,
            tuesday: 2,
            tue: 2,
            streda: 3,
            wednesday: 3,
            wed: 3,
            stvrtok: 4,
            štvrtok: 4,
            thursday: 4,
            thu: 4,
            piatok: 5,
            friday: 5,
            fri: 5,
            sobota: 6,
            saturday: 6,
            sat: 6,
            nedela: 7,
            nedeľa: 7,
            sunday: 7,
            sun: 7
        }[normalizedValue];

        return mappedValue ?? null;
    }

    return null;
}

function parseTimeToMinutes(value) {
    if (
        typeof value !==
        'string'
    ) {
        return null;
    }

    const normalizedValue =
        value.trim();

    if (!normalizedValue) {
        return null;
    }

    const parts =
        normalizedValue.split(':');

    if (parts.length < 2) {
        return null;
    }

    const hours =
        Number(parts[0]);

    const minutes =
        Number(parts[1]);

    if (
        !Number.isFinite(hours) ||
        !Number.isFinite(minutes)
    ) {
        return null;
    }

    if (
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
    ) {
        return null;
    }

    return (
        hours * 60 +
        minutes
    );
}

function formatTimeLabel(value) {
    return String(value ?? '')
        .trim()
        .slice(0, 5);
}

function normalizeIntervals(entry) {
    const rawIntervals =
        Array.isArray(
            entry?.intervals
        )
            ? entry.intervals
            : [];

    return rawIntervals
        .map((interval) => {
            const opensAt =
                interval?.opensAt ??
                interval?.opens_at ??
                null;

            const closesAt =
                interval?.closesAt ??
                interval?.closes_at ??
                null;

            const opensAtMinutes =
                parseTimeToMinutes(
                    opensAt
                );

            const closesAtMinutes =
                parseTimeToMinutes(
                    closesAt
                );

            if (
                opensAtMinutes ===
                    null ||
                closesAtMinutes ===
                    null ||
                closesAtMinutes <=
                    opensAtMinutes
            ) {
                return null;
            }

            return {
                opensAt:
                    formatTimeLabel(
                        opensAt
                    ),
                closesAt:
                    formatTimeLabel(
                        closesAt
                    ),
                opensAtMinutes,
                closesAtMinutes
            };
        })
        .filter(Boolean)
        .sort((left, right) => {
            return (
                left.opensAtMinutes -
                right.opensAtMinutes
            );
        });
}

function formatIntervalsLabel(intervals) {
    if (!intervals.length) {
        return null;
    }

    return intervals
        .map((interval) => {
            return [
                interval.opensAt,
                interval.closesAt
            ].join(' - ');
        })
        .join(', ');
}

function findNearestOpening(
    entries,
    today,
    currentMinutes
) {
    for (
        let offset = 0;
        offset < 7;
        offset += 1
    ) {
        const dayOfWeek =
            ((today + offset - 1) %
                7) +
            1;

        const dayEntry =
            entries.find((entry) => {
                return (
                    Number(
                        entry.dayOfWeek
                    ) === dayOfWeek
                );
            }) ??
            null;

        if (!dayEntry) {
            continue;
        }

        if (dayEntry.isClosed) {
            continue;
        }

        const intervals =
            normalizeIntervals(
                dayEntry.entry
            );

        if (!intervals.length) {
            continue;
        }

        if (offset === 0) {
            const nextTodayInterval =
                intervals.find(
                    (interval) => {
                        return (
                            interval.opensAtMinutes >
                            currentMinutes
                        );
                    }
                ) ?? null;

            if (nextTodayInterval) {
                return {
                    offset,
                    dayOfWeek,
                    opensAt:
                        nextTodayInterval.opensAt
                };
            }

            continue;
        }

        return {
            offset,
            dayOfWeek,
            opensAt:
                intervals[0].opensAt
        };
    }

    return null;
}

const todayOpeningHoursAnnouncement = computed(() => {
    const normalizedEntries =
        Array.isArray(openingHours.value)
            ? openingHours.value
                  .map((entry) => {
                      const dayOfWeek =
                          normalizeDayOfWeek(
                              entry?.dayOfWeek ??
                                  entry?.day_of_week ??
                                  entry?.day
                          );

                      const isClosed =
                          Boolean(
                              entry?.isClosed ??
                                  entry?.is_closed
                          );

                      return {
                          dayOfWeek,
                          isClosed,
                          entry
                      };
                  })
                  .filter((entry) => {
                      return (
                          Number.isFinite(
                              entry.dayOfWeek
                          ) &&
                          entry.dayOfWeek >= 1 &&
                          entry.dayOfWeek <= 7
                      );
                  })
            : [];

    if (!normalizedEntries.length) {
        return 'Najbližšie otvorenie upresníme telefonicky';
    }

    const now =
        new Date();

    const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();

    const todayEntry =
        normalizedEntries.find((entry) => {
            return (
                entry.dayOfWeek ===
                todayDayOfWeek.value
            );
        }) ??
        null;

    const todayIntervals =
        todayEntry &&
        !todayEntry.isClosed
            ? normalizeIntervals(
                  todayEntry.entry
              )
            : [];

    const isOpenNow =
        todayIntervals.some((interval) => {
            return (
                currentMinutes >=
                    interval.opensAtMinutes &&
                currentMinutes <
                    interval.closesAtMinutes
            );
        });

    if (isOpenNow) {
        const todaySchedule =
            formatIntervalsLabel(
                todayIntervals
            );

        if (todaySchedule) {
            const todayName =
                dayNameByWeekday[
                    todayDayOfWeek.value
                ] ??
                'dnes';

            return `Dnes máme otvorené ${todaySchedule}`;
        }
    }

    const nearestOpening =
        findNearestOpening(
            normalizedEntries,
            todayDayOfWeek.value,
            currentMinutes
        );

    if (!nearestOpening) {
        return 'Najbližšie otvorenie upresníme telefonicky';
    }

    if (nearestOpening.offset === 0) {
        const todayName =
            dayNameByWeekday[
                todayDayOfWeek.value
            ] ??
            'dnes';

        return `Dnes otvárame o ${nearestOpening.opensAt}`;
    }

    if (nearestOpening.offset === 1) {
        const tomorrowDayOfWeek =
            ((todayDayOfWeek.value %
                7) +
                1);

        const tomorrowName =
            dayNameByWeekday[
                tomorrowDayOfWeek
            ] ??
            'zajtra';

        return `Najbližšie otvárame v ${tomorrowName} o ${nearestOpening.opensAt}`;
    }

    const dayLabel =
        dayLabelByWeekday[
            nearestOpening.dayOfWeek
        ] ??
        'v najbližší pracovný deň';

    return `Najbližšie otvárame ${dayLabel} o ${nearestOpening.opensAt}`;
});

const announcementMessages = computed(() => {
    return [
        'Prijímame nových pacientov',
        todayOpeningHoursAnnouncement.value
    ].filter(Boolean);
});

const shouldShowAnnouncementRibbon = computed(() => {
    return (
        announcementMessages.value.length >
        0
    );
});

function setMarqueeGroupElement(element) {
    marqueeGroupElement.value =
        element ??
        null;
}

function stopMarqueeAnimation() {
    marqueeAnimation
        ?.cancel();

    marqueeAnimation =
        null;
}

async function startMarqueeAnimation() {
    stopMarqueeAnimation();

    await nextTick();

    const viewport =
        marqueeViewportElement.value;

    const track =
        marqueeTrackElement.value;

    const group =
        marqueeGroupElement.value;

    if (
        !viewport ||
        !track ||
        !group ||
        !announcementMessages.value.length
    ) {
        return;
    }

    track.style.transform =
        'translate3d(0, 0, 0)';

    if (
        hasReducedMotionPreference.value
    ) {
        return;
    }

    const groupWidth =
        group.getBoundingClientRect()
            .width;

    if (groupWidth <= 0) {
        return;
    }

    const viewportWidth =
        Math.max(
            viewport.clientWidth,
            1
        );

    const requiredRepeats =
        Math.max(
            3,
            Math.ceil(
                viewportWidth /
                groupWidth
            ) + 2
        );

    if (
        marqueeGroupRepeatCount.value !==
        requiredRepeats
    ) {
        marqueeGroupRepeatCount.value =
            requiredRepeats;

        await nextTick();
    }

    const duration =
        (
            groupWidth /
            MARQUEE_SPEED_PX_PER_SECOND
        ) *
        1000;

    marqueeAnimation =
        track.animate(
            [
                {
                    transform:
                        'translate3d(0, 0, 0)'
                },
                {
                    transform:
                        `translate3d(-${groupWidth}px, 0, 0)`
                }
            ],
            {
                duration,
                iterations: Infinity,
                easing: 'linear'
            }
        );
}

function handleReducedMotionChange(event) {
    hasReducedMotionPreference.value =
        event.matches;

    startMarqueeAnimation();
}

/*
|--------------------------------------------------------------------------
| Loader
|--------------------------------------------------------------------------
*/

const MIN_LOADER_DURATION_MS =
    2500;

const ERROR_REVEAL_DELAY_MS =
    180;

const hasSeenInitialLoading =
    ref(false);

const isLoaderMinimumDurationDone =
    ref(false);

const loaderObject =
    ref(null);

const isErrorContentVisible =
    ref(false);

let loaderMinimumDurationTimer =
    null;

let errorRevealTimer =
    null;

let loaderErrorTransitionTimer =
    null;

let previousScrollbarGutter =
    '';

const isDataLoading = computed(() => {
    return (
        loading.value &&
        !company.value
    );
});

const isTestingLoadError = computed(() => {
    return (
        import.meta.env.DEV &&
        route.query.testLoadError ===
        '1'
    );
});

const hasFatalLoadError = computed(() => {
    return (
        Boolean(error.value) &&
        !company.value &&
        !loading.value
    );
});

const shouldShowFatalLoadError = computed(() => {
    return (
        hasFatalLoadError.value ||
        isTestingLoadError.value
    );
});

const displayedFatalLoadError = computed(() => {
    if (isTestingLoadError.value) {
        return 'Toto je testovacia chyba načítania.';
    }

    if (
        typeof error.value ===
        'string'
    ) {
        return error.value;
    }

    if (
        error.value?.message
    ) {
        return error.value.message;
    }

    return 'Skontrolujte svoje internetové pripojenie a skúste to znova.';
});

const isInitialLoading = computed(() => {
    if (
        shouldShowFatalLoadError.value
    ) {
        return false;
    }

    if (!hasSeenInitialLoading.value) {
        return isDataLoading.value;
    }

    if (
        !isLoaderMinimumDurationDone.value
    ) {
        return true;
    }

    return isDataLoading.value;
});

const shouldShowLoaderScreen = computed(() => {
    return (
        isInitialLoading.value ||
        shouldShowFatalLoadError.value
    );
});

function getLoaderSvgRoot() {
    const objectElement =
        loaderObject.value;

    if (!objectElement) {
        return null;
    }

    try {
        return (
            objectElement
                .contentDocument
                ?.documentElement ??
            null
        );
    } catch (loaderAccessError) {
        console.error(
            'The loader SVG could not be accessed.',
            loaderAccessError
        );

        return null;
    }
}

function setLoaderState(state) {
    const validStates = [
        'loading',
        'success',
        'error'
    ];

    const nextState =
        validStates.includes(state)
            ? state
            : 'loading';

    const svgRoot =
        getLoaderSvgRoot();

    if (!svgRoot) {
        return false;
    }

    svgRoot.dataset.state =
        nextState;

    svgRoot.setAttribute(
        'aria-label',
        nextState === 'loading'
            ? 'Humanitas loading'
            : nextState === 'success'
                ? 'Completed successfully'
                : 'An error occurred'
    );

    svgRoot.dispatchEvent(
        new CustomEvent(
            'loader-state',
            {
                detail: nextState
            }
        )
    );

    return true;
}

function handleLoaderReady() {
    window.requestAnimationFrame(() => {
        if (
            shouldShowFatalLoadError.value
        ) {
            queueLoaderErrorState();

            return;
        }

        setLoaderState(
            'loading'
        );
    });
}

function clearErrorRevealTimer() {
    if (
        errorRevealTimer ===
        null
    ) {
        return;
    }

    window.clearTimeout(
        errorRevealTimer
    );

    errorRevealTimer =
        null;
}

function clearLoaderErrorTransitionTimer() {
    if (
        loaderErrorTransitionTimer ===
        null
    ) {
        return;
    }

    window.clearTimeout(
        loaderErrorTransitionTimer
    );

    loaderErrorTransitionTimer =
        null;
}

function showErrorContent() {
    clearErrorRevealTimer();

    isErrorContentVisible.value =
        false;

    errorRevealTimer =
        window.setTimeout(() => {
            isErrorContentVisible.value =
                true;

            errorRevealTimer =
                null;
        }, ERROR_REVEAL_DELAY_MS);
}

function queueLoaderErrorState() {
    clearLoaderErrorTransitionTimer();
    clearErrorRevealTimer();

    isErrorContentVisible.value =
        false;

    setLoaderState(
        'loading'
    );

    loaderErrorTransitionTimer =
        window.setTimeout(() => {
            loaderErrorTransitionTimer =
                null;

            setLoaderState(
                'error'
            );

            showErrorContent();
        }, MIN_LOADER_DURATION_MS);
}

async function applyLoaderState() {
    await nextTick();

    if (
        shouldShowFatalLoadError.value
    ) {
        queueLoaderErrorState();

        return;
    }

    clearLoaderErrorTransitionTimer();
    clearErrorRevealTimer();

    isErrorContentVisible.value =
        false;

    setLoaderState(
        'loading'
    );
}

async function retryLoad() {
    clearLoaderErrorTransitionTimer();
    clearErrorRevealTimer();

    isErrorContentVisible.value =
        false;

    setLoaderState(
        'loading'
    );

    if (
        isTestingLoadError.value
    ) {
        const nextQuery = {
            ...route.query
        };

        delete nextQuery
            .testLoadError;

        await router.replace({
            query: nextQuery
        });

        return;
    }

    await publicSiteStore.reload();
}

/*
|--------------------------------------------------------------------------
| Watchers
|--------------------------------------------------------------------------
*/

watch(
    announcementMessages,
    () => {
        startMarqueeAnimation();
    },
    {
        deep: true
    }
);

watch(
    isDataLoading,
    (nextIsDataLoading) => {
        if (
            !nextIsDataLoading ||
            hasSeenInitialLoading.value
        ) {
            return;
        }

        hasSeenInitialLoading.value =
            true;

        isLoaderMinimumDurationDone.value =
            false;

        if (
            loaderMinimumDurationTimer !==
            null
        ) {
            window.clearTimeout(
                loaderMinimumDurationTimer
            );
        }

        loaderMinimumDurationTimer =
            window.setTimeout(() => {
                isLoaderMinimumDurationDone.value =
                    true;

                loaderMinimumDurationTimer =
                    null;
            }, MIN_LOADER_DURATION_MS);
    },
    {
        immediate: true
    }
);

watch(
    shouldShowFatalLoadError,
    () => {
        applyLoaderState();
    },
    {
        immediate: true
    }
);

watch(
    () => route.path,
    () => {
        refreshNavigationIndicator();
    },
    {
        immediate: true
    }
);

watch(
    shouldShowLoaderScreen,
    (isVisible, wasVisible) => {
        if (!wasVisible || isVisible) {
            return;
        }

        window.requestAnimationFrame(() => {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'auto'
            });
        });
    }
);

/*
|--------------------------------------------------------------------------
| Lifecycle
|--------------------------------------------------------------------------
*/

onMounted(() => {
    initializeCookieConsent();

    previousScrollbarGutter =
        document.documentElement
            .style
            .scrollbarGutter;

    document.documentElement
        .style
        .scrollbarGutter =
        'stable';

    reducedMotionMediaQuery =
        window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        );

    hasReducedMotionPreference.value =
        reducedMotionMediaQuery.matches;

    reducedMotionMediaQuery.addEventListener(
        'change',
        handleReducedMotionChange
    );

    marqueeResizeObserver =
        new ResizeObserver(() => {
            startMarqueeAnimation();
        });

    nextTick(() => {
        if (
            marqueeViewportElement.value
        ) {
            marqueeResizeObserver.observe(
                marqueeViewportElement.value
            );
        }

        if (
            marqueeGroupElement.value
        ) {
            marqueeResizeObserver.observe(
                marqueeGroupElement.value
            );
        }

        startMarqueeAnimation();
    });

    navigationResizeObserver =
        new ResizeObserver(() => {
            updateNavigationIndicator();
        });

    if (
        navigationElement.value
    ) {
        navigationResizeObserver.observe(
            navigationElement.value
        );
    }

    navigationButtonElements.value
        .filter(Boolean)
        .forEach((element) => {
            navigationResizeObserver.observe(
                element
            );
        });

    window.addEventListener(
        'resize',
        updateNavigationIndicator,
        {
            passive: true
        }
    );

    refreshNavigationIndicator();
});

onUnmounted(() => {
    stopMarqueeAnimation();

    marqueeResizeObserver
        ?.disconnect();

    marqueeResizeObserver =
        null;

    reducedMotionMediaQuery
        ?.removeEventListener(
            'change',
            handleReducedMotionChange
        );

    reducedMotionMediaQuery =
        null;

    navigationResizeObserver
        ?.disconnect();

    navigationResizeObserver =
        null;

    window.removeEventListener(
        'resize',
        updateNavigationIndicator
    );

    if (
        loaderMinimumDurationTimer !==
        null
    ) {
        window.clearTimeout(
            loaderMinimumDurationTimer
        );

        loaderMinimumDurationTimer =
            null;
    }

    clearLoaderErrorTransitionTimer();
    clearErrorRevealTimer();

    document.documentElement
        .style
        .scrollbarGutter =
        previousScrollbarGutter;
});
</script>

<template>
    <div
        ref="motionRoot"
        class="
            min-h-[100dvh]
            w-full
            text-green
        "
    >
        <div
            class="
                relative
                mx-auto
                flex
                min-h-[100dvh]
                w-full
                flex-col
            "
        >
            <aside
                v-if="shouldShowAnnouncementRibbon"
                aria-label="Aktuálne informácie"
                class="
                    sticky
                    top-0
                    flex
                    h-9
                    w-full
                    shrink-0
                    items-center
                    overflow-hidden
                    text-green
                    px-2
                "
            >
                <div
                    ref="marqueeViewportElement"
                    class="
                        w-full
                        overflow-hidden

                        [mask-image:linear-gradient(to_right,transparent_0%,black_8%,black_92%,transparent_100%)]
                        [-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_8%,black_92%,transparent_100%)]
                    "
                >
                    <div
                        ref="marqueeTrackElement"
                        class="
                            flex
                            w-max
                            min-w-max
                            shrink-0
                            items-center
                            whitespace-nowrap
                            will-change-transform
                        "
                    >
                        <div
                            v-for="
                                repeatIndex in
                                marqueeGroupRepeatCount
                            "
                            :key="
                                `marquee-group-${repeatIndex}`
                            "
                            :ref="
                                repeatIndex === 1
                                    ? setMarqueeGroupElement
                                    : null
                            "
                            class="
                                flex
                                shrink-0
                                items-center
                            "
                            :aria-hidden="
                                repeatIndex === 1
                                    ? undefined
                                    : 'true'
                            "
                        >
                            <template
                                v-for="
                                    (
                                        message,
                                        index
                                    ) in
                                    announcementMessages
                                "
                                :key="
                                    `message-${repeatIndex}-${index}-${message}`
                                "
                            >
                                <span
                                    class="
                                        shrink-0
                                        px-6
                                        text-xs
                                        leading-none
                                        text-green

                                        sm:px-8
                                    "
                                >
                                    {{ message }}
                                </span>

                                <span
                                    aria-hidden="true"
                                    class="
                                        shrink-0
                                        text-xs
                                        text-green/65
                                    "
                                >
                                    •
                                </span>
                            </template>
                        </div>
                    </div>
                </div>
            </aside>

            <div
                class="
                    sticky
                    h-[70px]
                    w-full
                    shrink-0
                "
                :class="
                    shouldShowAnnouncementRibbon
                        ? 'top-9'
                        : 'top-0'
                "
            >
                <AppHeader
                    :show-menu="false"
                    :is-fixed="false"
                />
            </div>

            <main
                class="
                    mx-auto
                    w-full
                    max-w-[1600px]
                    flex-1
                    px-2
                    pb-0

                    sm:px-3

                    lg:px-4
                "
            >
                <section
                    class="
                        page-surface
                        w-full
                        overflow-hidden
                        rounded-[40px]
                        bg-green
                        text-baige
                        shadow-[var(--shadow-strong)]
                    "
                >
                    <RouterView v-slot="{ Component }">
                        <component
                            :is="Component"
                            :expanded="true"
                            :transitioning="false"
                        />
                    </RouterView>
                </section>
            </main>

            <AppFooter />

            <CookieConsentSheet />

            <div
                class="
                    fixed
                    bottom-[max(0.5rem,env(safe-area-inset-bottom))]
                    left-1/2
                    z-[1200]
                    w-max
                    max-w-[calc(100%-1rem)]
                    -translate-x-1/2
                "
            >
                <div
                    data-scroll-motion
                    data-motion-seed="8"
                    data-base-rotation="0"
                    data-rotation-mode="offset"
                    data-motion-strength="0.35"
                    data-straighten-strength="0.98"
                    data-max-y="4"
                    data-max-x="0"
                    data-max-scale="0.001"
                    class="
                        scroll-motion
                        flex
                        w-max
                        max-w-full
                        items-center
                        justify-center
                        gap-2
                    "
                >
                    <nav
                        ref="navigationElement"
                        aria-label="Hlavná navigácia"
                        class="
                            relative
                            flex
                            w-max
                            max-w-full
                            shrink-0
                            items-center
                            justify-center
                            gap-2
                            overflow-x-auto
                            rounded-full
                            border
                            border-baige/5
                            bg-green
                            p-2
                            shadow-[var(--shadow-mid)]
                            [scrollbar-width:none]
                            [&::-webkit-scrollbar]:hidden

                            sm:gap-3
                        "
                    >
                        <span
                            aria-hidden="true"
                            class="
                                pointer-events-none
                                absolute
                                left-0
                                top-0
                                rounded-full
                                bg-baige
                                transition-[transform,width,height,opacity]
                                duration-500
                                ease-[cubic-bezier(0.22,1,0.36,1)]
                                will-change-[transform,width,height]
                                motion-reduce:duration-[1ms]
                            "
                            :style="
                                navigationIndicatorStyle
                            "
                        />

                        <Button
                            v-for="
                                (
                                    item,
                                    index
                                ) in
                                navigationItems
                            "
                            :key="item.path"
                            :ref="
                                (element) => {
                                    setNavigationButtonElement(
                                        element,
                                        index
                                    );
                                }
                            "
                            type="button"
                            background-image=""
                            background-color=""
                            :text-color="
                                isActiveRoute(item.path)
                                    ? 'var(--color-green)'
                                    : 'var(--color-baige)'
                            "
                            class="
                                relative
                                z-10
                                shrink-0
                            "
                            :aria-current="
                                isActiveRoute(item.path)
                                    ? 'page'
                                    : undefined
                            "
                            @click="
                                navigate(item.path)
                            "
                        >
                            {{ item.label }}
                        </Button>
                    </nav>

                    <nav
                        v-if="shouldShowQuickActions"
                        aria-label="Rýchle akcie"
                        class="
                            relative
                            hidden
                            w-max
                            shrink-0
                            items-center
                            justify-center
                            gap-1
                            rounded-full
                            border
                            border-baige/5
                            bg-green
                            p-2
                            shadow-[var(--shadow-strong)]

                            sm:flex
                        "
                    >
                        <Button
                            v-if="companyPhoneHref"
                            :href="companyPhoneHref"
                            background-image=""
                            background-color=""
                            text-color="var(--color-baige)"
                            class="
                                relative
                                shrink-0
                            "
                            aria-label="Zavolať do ambulancie"
                        >
                            <span
                                class="
                                    flex
                                    items-center
                                    gap-2
                                "
                            >
                                Zavolať
                            </span>
                        </Button>

                        <Button
                            v-if="companyEmailHref"
                            :href="companyEmailHref"
                            background-image=""
                            background-color=""
                            text-color="var(--color-baige)"
                            class="
                                relative
                                shrink-0
                            "
                            aria-label="Napísať e-mail ambulancii"
                        >
                            <span
                                class="
                                    flex
                                    items-center
                                    gap-2
                                "
                            >
                                Napísať
                            </span>
                        </Button>
                    </nav>
                </div>
            </div>

            <Transition
                enter-active-class="
                    transition-opacity
                    duration-200
                    ease-out
                    motion-reduce:duration-[1ms]
                "
                enter-from-class="opacity-0"
                enter-to-class="opacity-100"
                leave-active-class="
                    transition-opacity
                    duration-200
                    ease-out
                    motion-reduce:duration-[1ms]
                "
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <div
                    v-if="shouldShowLoaderScreen"
                    key="loader-screen"
                    class="
                        fixed
                        inset-0
                        z-[10000]
                        h-[100dvh]
                        bg-baige
                        px-5
                        py-6
                    "
                    :aria-label="
                        shouldShowFatalLoadError
                            ? 'Obsah sa nepodarilo načítať'
                            : 'Načítavanie obsahu'
                    "
                >
                    <div
                        class="
                            absolute
                            inset-0
                            flex
                            items-center
                            justify-center
                        "
                    >
                        <object
                            ref="loaderObject"
                            data="/humanitas_loader_states.svg"
                            type="image/svg+xml"
                            aria-label="Humanitas"
                            class="
                                h-auto
                                w-[clamp(10rem,28vw,18rem)]
                                shrink-0
                            "
                            @load="handleLoaderReady"
                        >
                            Humanitas
                        </object>
                    </div>

                    <div
                        v-if="shouldShowFatalLoadError"
                        class="
                            absolute
                            left-1/2
                            top-[calc(50%+clamp(5.5rem,16vw,8.2rem))]
                            w-full
                            max-w-xl
                            -translate-x-1/2
                            px-5
                        "
                    >
                        <div
                            class="
                                flex
                                w-full
                                flex-col
                                items-center
                                text-center
                                transition-[opacity,transform,filter]
                                duration-700
                                ease-[cubic-bezier(0.16,1,0.3,1)]
                                will-change-[opacity,transform,filter]
                                motion-reduce:duration-[1ms]
                            "
                            :class="
                                isErrorContentVisible
                                    ? [
                                        'visible',
                                        'pointer-events-auto',
                                        'translate-y-0',
                                        'scale-100',
                                        'opacity-100',
                                        'blur-0'
                                    ]
                                    : [
                                        'invisible',
                                        'pointer-events-none',
                                        'translate-y-3.5',
                                        'scale-[0.98]',
                                        'opacity-0',
                                        'blur-[5px]'
                                    ]
                            "
                            :aria-hidden="
                                !isErrorContentVisible
                            "
                        >
                            <h1
                                class="
                                    text-xl
                                    font-bold
                                    text-green
                                "
                            >
                                Stránku sa nepodarilo načítať
                            </h1>

                            <p
                                class="
                                    text-regular
                                    mt-4
                                    max-w-lg
                                    text-green/70
                                "
                            >
                                {{
                                    displayedFatalLoadError
                                }}
                            </p>

                            <div class="mt-7">
                                <Button
                                    background-color="var(--color-green)"
                                    background-image=""
                                    text-color="var(--color-baige)"
                                    :tabindex="
                                        isErrorContentVisible
                                            ? 0
                                            : -1
                                    "
                                    @click="retryLoad"
                                >
                                    Skúsiť znova
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </div>
    </div>
</template>