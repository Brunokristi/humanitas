<script setup>
import {
    computed,
    nextTick,
    onMounted,
    onUnmounted,
    provide,
    ref,
    watch
} from 'vue';

import { storeToRefs } from 'pinia';

import {
    useRoute,
    useRouter
} from 'vue-router';

import { pages } from '../data/pages';
import { useCookieConsent } from '../composables/useCookieConsent';
import { useCardStack } from '../composables/useCardStack';
import { usePublicSiteStore } from '../stores/publicSite';

import AppHeader from './AppHeader.vue';
import AppFooter from './AppFooter.vue';
import Button from './Button.vue';
import CardStage from './CardStage.vue';
import CookieConsentSheet from './CookieConsentSheet.vue';

const route =
    useRoute();

const router =
    useRouter();

const publicSiteStore =
    usePublicSiteStore();

const {
    company,
    loading,
    error
} = storeToRefs(
    publicSiteStore
);

const stack =
    useCardStack({
        pages,
        router,
        route
    });

provide(
    'humanitasNavigateToPath',
    (path) => {
        stack.navigateToPath(
            path
        );
    }
);

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

function handleGlobalKeydown(event) {
    if (
        event.key ===
            'Escape' &&
        stack.mode.value ===
            'expanded'
    ) {
        stack.minimizeCard();
    }
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

    window.addEventListener(
        'keydown',
        handleGlobalKeydown
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

    window.removeEventListener(
        'keydown',
        handleGlobalKeydown
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
            <Transition
                name="shell-fade"
                mode="out-in"
            >
                <div
                    v-if="shouldShowLoaderScreen"
                    key="loader-screen"
                    class="
                        flex
                        min-h-[100dvh]
                        flex-col
                        items-center
                        justify-center
                        px-5
                        py-16
                    "
                    :aria-label="
                        shouldShowFatalLoadError
                            ? 'Obsah sa nepodarilo načítať'
                            : 'Načítavanie obsahu'
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

                    <div
                        class="
                            flex
                            h-48
                            w-full
                            max-w-xl
                            shrink-0
                            items-start
                            justify-center
                            pt-1
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

                <div
                    v-else
                    key="content"
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
                            relative
                            z-20
                            flex
                            w-full
                            flex-1
                            items-start
                            justify-center
                            overflow-visible
                            px-2

                            sm:px-6
                        "
                    >
                        <CardStage
                            :pages="pages"
                            :stack="stack"
                        />
                    </main>

                    <AppFooter />

                    <CookieConsentSheet />
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

.shell-fade-enter-active,
.shell-fade-leave-active {
    transition:
        opacity 0.24s ease;
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

    transform:
        translateY(14px)
        scale(0.98);

    transition:
        opacity 520ms
            cubic-bezier(
                0.22,
                1,
                0.36,
                1
            ),
        transform 700ms
            cubic-bezier(
                0.16,
                1,
                0.3,
                1
            ),
        filter 600ms
            cubic-bezier(
                0.22,
                1,
                0.36,
                1
            ),
        visibility 0s linear 700ms;
}

.error-content--visible {
    pointer-events: auto;
    visibility: visible;
    opacity: 1;
    filter: blur(0);

    transform:
        translateY(0)
        scale(1);

    transition:
        opacity 520ms
            cubic-bezier(
                0.22,
                1,
                0.36,
                1
            ),
        transform 700ms
            cubic-bezier(
                0.16,
                1,
                0.3,
                1
            ),
        filter 600ms
            cubic-bezier(
                0.22,
                1,
                0.36,
                1
            ),
        visibility 0s linear 0s;
}

@media (
    prefers-reduced-motion:
    reduce
) {
    .shell-fade-enter-active,
    .shell-fade-leave-active,
    .error-content {
        transition-duration: 1ms;
    }
}
</style>

<style>
/*
 * The browser creates frozen compositor snapshots for these
 * transitions. No live page layout is scaled frame by frame.
 */

::view-transition-group(humanitas-page-surface) {
    overflow: clip;
    border-radius: 40px;
    box-shadow: var(--shadow-strong);
    z-index: 9000;
}

::view-transition-image-pair(humanitas-page-surface) {
    isolation: isolate;
    overflow: clip;
    border-radius: 40px;
}

::view-transition-old(humanitas-page-surface),
::view-transition-new(humanitas-page-surface) {
    height: 100%;
    mix-blend-mode: normal;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
}

::view-transition-group(humanitas-page-menu) {
    z-index: 9100;
}

::view-transition-old(humanitas-page-menu),
::view-transition-new(humanitas-page-menu) {
    mix-blend-mode: normal;
}

html[data-humanitas-transition='open']
::view-transition-group(humanitas-page-surface) {
    animation-duration: 520ms;
    animation-timing-function:
        cubic-bezier(
            0.16,
            1,
            0.3,
            1
        );
}

html[data-humanitas-transition='close']
::view-transition-group(humanitas-page-surface) {
    animation-duration: 480ms;
    animation-timing-function:
        cubic-bezier(
            0.22,
            1,
            0.36,
            1
        );
}

html[data-humanitas-transition='open']
::view-transition-old(humanitas-page-surface) {
    animation:
        humanitas-open-old
        520ms
        linear
        both;
}

html[data-humanitas-transition='open']
::view-transition-new(humanitas-page-surface) {
    animation:
        humanitas-open-new
        520ms
        linear
        both;
}

html[data-humanitas-transition='close']
::view-transition-old(humanitas-page-surface) {
    animation:
        humanitas-close-old
        480ms
        linear
        both;
}

html[data-humanitas-transition='close']
::view-transition-new(humanitas-page-surface) {
    animation:
        humanitas-close-new
        480ms
        linear
        both;
}

html[data-humanitas-transition='open']
::view-transition-old(root),
html[data-humanitas-transition='open']
::view-transition-new(root),
html[data-humanitas-transition='close']
::view-transition-old(root),
html[data-humanitas-transition='close']
::view-transition-new(root) {
    animation: none;
    mix-blend-mode: normal;
}

html[data-humanitas-transition='switch-forward']
::view-transition-old(root) {
    animation:
        humanitas-switch-forward-old
        310ms
        cubic-bezier(
            0.32,
            0.72,
            0,
            1
        )
        both;
}

html[data-humanitas-transition='switch-forward']
::view-transition-new(root) {
    animation:
        humanitas-switch-forward-new
        310ms
        cubic-bezier(
            0.32,
            0.72,
            0,
            1
        )
        both;
}

html[data-humanitas-transition='switch-backward']
::view-transition-old(root) {
    animation:
        humanitas-switch-backward-old
        310ms
        cubic-bezier(
            0.32,
            0.72,
            0,
            1
        )
        both;
}

html[data-humanitas-transition='switch-backward']
::view-transition-new(root) {
    animation:
        humanitas-switch-backward-new
        310ms
        cubic-bezier(
            0.32,
            0.72,
            0,
            1
        )
        both;
}

/*
 * Keep the source snapshot dominant while the
 * card changes size. The destination layout is
 * introduced only near the end, avoiding a long
 * double exposure between two differently reflowed
 * page layouts.
 */


/*
 * Page-specific decorative animations must not
 * advance between the old and new snapshots.
 */
html[data-humanitas-transition='open']
.page-card *,
html[data-humanitas-transition='close']
.page-card * {
    animation-play-state: paused !important;
}

html[data-humanitas-transition='open']
::view-transition-old(humanitas-page-menu) {
    animation:
        humanitas-menu-old
        520ms
        linear
        both;
}

html[data-humanitas-transition='open']
::view-transition-new(humanitas-page-menu) {
    animation:
        humanitas-menu-new
        520ms
        linear
        both;
}

html[data-humanitas-transition='close']
::view-transition-old(humanitas-page-menu) {
    animation:
        humanitas-menu-old
        480ms
        linear
        both;
}

html[data-humanitas-transition='close']
::view-transition-new(humanitas-page-menu) {
    animation:
        humanitas-menu-new
        480ms
        linear
        both;
}

@keyframes humanitas-menu-old {
    0%,
    68% {
        opacity: 1;
    }

    100% {
        opacity: 0;
    }
}

@keyframes humanitas-menu-new {
    0%,
    62% {
        opacity: 0;
    }

    100% {
        opacity: 1;
    }
}

@keyframes humanitas-open-old {
    0%,
    70% {
        opacity: 1;
    }

    100% {
        opacity: 0;
    }
}

@keyframes humanitas-open-new {
    0%,
    64% {
        opacity: 0;
    }

    100% {
        opacity: 1;
    }
}

@keyframes humanitas-close-old {
    0%,
    66% {
        opacity: 1;
    }

    100% {
        opacity: 0;
    }
}

@keyframes humanitas-close-new {
    0%,
    60% {
        opacity: 0;
    }

    100% {
        opacity: 1;
    }
}

@keyframes humanitas-switch-forward-old {
    from {
        transform:
            translate3d(
                0,
                0,
                0
            )
            scale(1);
        opacity: 1;
    }

    to {
        transform:
            translate3d(
                -24%,
                0,
                0
            )
            scale(0.965);
        opacity: 0.72;
    }
}

@keyframes humanitas-switch-forward-new {
    from {
        transform:
            translate3d(
                100%,
                0,
                0
            )
            scale(0.99);
        opacity: 1;
    }

    to {
        transform:
            translate3d(
                0,
                0,
                0
            )
            scale(1);
        opacity: 1;
    }
}

@keyframes humanitas-switch-backward-old {
    from {
        transform:
            translate3d(
                0,
                0,
                0
            )
            scale(1);
        opacity: 1;
    }

    to {
        transform:
            translate3d(
                24%,
                0,
                0
            )
            scale(0.965);
        opacity: 0.72;
    }
}

@keyframes humanitas-switch-backward-new {
    from {
        transform:
            translate3d(
                -100%,
                0,
                0
            )
            scale(0.99);
        opacity: 1;
    }

    to {
        transform:
            translate3d(
                0,
                0,
                0
            )
            scale(1);
        opacity: 1;
    }
}

@media (
    prefers-reduced-motion:
    reduce
) {
    ::view-transition-group(*),
    ::view-transition-old(*),
    ::view-transition-new(*) {
        animation-duration: 1ms !important;
    }
}
</style>