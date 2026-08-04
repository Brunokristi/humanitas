<script setup>
import {
    computed,
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

const hasSeenInitialLoading =
    ref(false);

const isLoaderMinimumDurationDone =
    ref(false);

let loaderMinimumDurationTimer =
    null;

let previousScrollbarGutter =
    '';

const isDataLoading = computed(() => {
    return (
        loading.value &&
        !company.value
    );
});

const isInitialLoading = computed(() => {
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

const hasFatalLoadError = computed(() => {
    return (
        Boolean(error.value) &&
        !company.value &&
        !loading.value
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
                    v-if="isInitialLoading"
                    key="loading"
                    class="
                        flex
                        min-h-[100dvh]
                        items-center
                        justify-center
                    "
                    aria-label="Načítavanie obsahu"
                >
                    <object
                        data="/images/logo_animated.svg"
                        type="image/svg+xml"
                        aria-label="Humanitas"
                        class="
                            h-auto
                            w-[clamp(10rem,28vw,18rem)]
                        "
                    >
                        Humanitas
                    </object>
                </div>

                <main
                    v-else-if="hasFatalLoadError"
                    key="error"
                    class="
                        flex
                        min-h-[100dvh]
                        items-center
                        justify-center
                        px-5
                        py-16
                    "
                >
                    <section
                        class="
                            w-full
                            max-w-2xl
                            rounded-[2.2rem]
                            border
                            border-green/15
                            bg-white/45
                            px-6
                            py-10
                            text-center
                            shadow-[var(--shadow-strong)]

                            sm:px-10
                        "
                    >
                        <h1
                            class="
                                heading
                                text-green
                            "
                        >
                            Obsah sa nepodarilo načítať
                        </h1>

                        <p
                            class="
                                text-regular
                                mt-5
                                text-green/70
                            "
                        >
                            {{ error }}
                        </p>

                        <div class="mt-8">
                            <Button
                                background-color="#FBF9F3"
                                text-color="#335940"
                                @click="
                                    publicSiteStore.reload
                                "
                            >
                                Skúsiť znova
                            </Button>
                        </div>
                    </section>
                </main>

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
                            px-2
                            overflow-visible

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
    border-radius: inherit;
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
    animation-duration: 460ms;
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
    animation-duration: 420ms;
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
        460ms
        linear
        both;
}

html[data-humanitas-transition='open']
::view-transition-new(humanitas-page-surface) {
    animation:
        humanitas-open-new
        460ms
        linear
        both;
}

html[data-humanitas-transition='close']
::view-transition-old(humanitas-page-surface) {
    animation:
        humanitas-close-old
        420ms
        linear
        both;
}

html[data-humanitas-transition='close']
::view-transition-new(humanitas-page-surface) {
    animation:
        humanitas-close-new
        420ms
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

@keyframes humanitas-open-old {
    0%,
    52% {
        opacity: 1;
    }

    100% {
        opacity: 0;
    }
}

@keyframes humanitas-open-new {
    0%,
    24% {
        opacity: 0;
    }

    76%,
    100% {
        opacity: 1;
    }
}

@keyframes humanitas-close-old {
    0%,
    42% {
        opacity: 1;
    }

    100% {
        opacity: 0;
    }
}

@keyframes humanitas-close-new {
    0%,
    18% {
        opacity: 0;
    }

    70%,
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
