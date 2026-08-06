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

import { useCookieConsent } from '../composables/useCookieConsent';
import { usePublicSiteStore } from '../stores/publicSite';

import AppHeader from './AppHeader.vue';
import AppFooter from './AppFooter.vue';
import Button from './Button.vue';
import CookieConsentSheet from './CookieConsentSheet.vue';

const route =
    useRoute();

const router =
    useRouter();

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

const publicSiteStore =
    usePublicSiteStore();

const {
    company,
    loading,
    error
} = storeToRefs(
    publicSiteStore
);

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

const {
    initializeCookieConsent
} = useCookieConsent();

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
    if (!import.meta.env.DEV) {
        return false;
    }

    return (
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

function isActiveRoute(path) {
    if (path === '/') {
        return route.path === '/';
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
    if (!element) {
        navigationButtonElements.value[
            index
        ] = null;

        return;
    }

    const root =
        element.$el ??
        element;

    navigationButtonElements.value[
        index
    ] = root;
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

    refreshNavigationIndicator();

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
});

onUnmounted(() => {
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

    navigationResizeObserver
        ?.disconnect();

    navigationResizeObserver =
        null;

    window.removeEventListener(
        'resize',
        updateNavigationIndicator
    );

    document.documentElement
        .style
        .scrollbarGutter =
        previousScrollbarGutter;
});
</script>

<template>
    <div
        class="
            min-h-[100dvh]
            w-full
            bg-baige
            text-green
        "
        style="--app-header-height: 60px;"
    >
        <div
            class="
                relative
                mx-auto
                flex
                min-h-[100dvh]
                w-full
                max-w-[100rem]
                flex-col
            "
        >
            <div
                class="
                    flex
                    min-h-[100dvh]
                    flex-col
                "
            >
                <div
                    class="app-shell-header"
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
                        px-2
                        pb-2

                        sm:px-3
                        sm:pb-3

                        lg:px-4
                        lg:pb-4
                    "
                >
                    <section
                        class="
                            w-full
                            page-surface
                            overflow-hidden
                            rounded-[40px]
                            bg-green
                            text-baige
                            shadow-[var(--shadow-strong)]
                        "
                    >
                        <nav
                            ref="navigationElement"
                            aria-label="Hlavná navigácia"
                            class="
                                page-navigation
                                relative
                                flex
                                w-full
                                items-center
                                justify-center
                                gap-2
                                overflow-x-auto
                                px-4
                                pt-4
                                pb-15

                                sm:gap-3
                                sm:px-6
                                sm:pt-5

                                lg:px-8
                            "
                        >
                            <span
                                aria-hidden="true"
                                class="
                                    page-navigation__indicator
                                    pointer-events-none
                                    absolute
                                    left-0
                                    top-0
                                    rounded-full
                                    bg-baige
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
                                background-color="transparent"
                                :text-color="
                                    isActiveRoute(item.path)
                                        ? 'var(--color-green)'
                                        : 'color-mix(in srgb, var(--color-baige) 70%, transparent)'
                                "
                                class="
                                    page-navigation__button
                                    relative
                                    z-10
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
            </div>

            <Transition
                name="shell-fade"
            >
                <div
                    v-if="shouldShowLoaderScreen"
                    key="loader-screen"
                    class="
                        app-shell-loader
                        px-5
                        py-6
                    "
                    :aria-label="
                        shouldShowFatalLoadError
                            ? 'Obsah sa nepodarilo načítať'
                            : 'Načítavanie obsahu'
                    "
                >
                    <div class="app-shell-loader__center">
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
                            app-shell-loader__error-slot
                            w-full
                            max-w-xl
                        "
                    >
                        <div
                            class="
                                error-content
                                flex
                                w-full
                                flex-col
                                items-center
                                text-center
                            "
                            :class="{
                                'error-content--visible':
                                    shouldShowFatalLoadError &&
                                    isErrorContentVisible
                            }"
                            :aria-hidden="
                                !shouldShowFatalLoadError ||
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
                                    background-color="#335940"
                                    background-image=""
                                    text-color="#FBF9F3"
                                    :tabindex="
                                        shouldShowFatalLoadError &&
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

<style scoped>
.app-shell-header {
    position: sticky;
    top: 0;
    width: 100%;
    height: 60px;
    flex-shrink: 0;
    background: transparent;
}

.page-navigation {
    scrollbar-width: none;
}

.page-navigation::-webkit-scrollbar {
    display: none;
}

.page-navigation__indicator {
    transition:
        transform 520ms cubic-bezier(0.22, 1, 0.36, 1),
        width 520ms cubic-bezier(0.22, 1, 0.36, 1),
        height 520ms cubic-bezier(0.22, 1, 0.36, 1),
        opacity 160ms ease;
    will-change:
        transform,
        width,
        height;
}

.page-navigation__button {
    flex-shrink: 0;
}

.app-shell-loader {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    height: 100dvh;
    z-index: 60;
    background: var(--color-baige);
}

.app-shell-loader__center {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.app-shell-loader__error-slot {
    position: absolute;
    left: 50%;
    top: calc(50% + clamp(5.5rem, 16vw, 8.2rem));
    transform: translateX(-50%);
}

.shell-fade-enter-active,
.shell-fade-leave-active {
    transition: opacity 0.24s ease;
}

.shell-fade-enter-from,
.shell-fade-leave-to {
    opacity: 0;
}

.error-content {
    pointer-events: none;
    visibility: hidden;
    opacity: 0;
    filter: blur(5px);
    transform: translateY(14px) scale(0.98);
    transition:
        opacity 520ms cubic-bezier(0.22, 1, 0.36, 1),
        transform 700ms cubic-bezier(0.16, 1, 0.3, 1),
        filter 600ms cubic-bezier(0.22, 1, 0.36, 1),
        visibility 0s linear 700ms;
}

.error-content--visible {
    pointer-events: auto;
    visibility: visible;
    opacity: 1;
    filter: blur(0);
    transform: translateY(0) scale(1);
    transition:
        opacity 520ms cubic-bezier(0.22, 1, 0.36, 1),
        transform 700ms cubic-bezier(0.16, 1, 0.3, 1),
        filter 600ms cubic-bezier(0.22, 1, 0.36, 1),
        visibility 0s;
}

@media (
    prefers-reduced-motion: reduce
) {
    .shell-fade-enter-active,
    .shell-fade-leave-active,
    .error-content,
    .page-navigation__indicator {
        transition-duration: 1ms;
    }
}
</style>
