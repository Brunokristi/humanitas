<script setup>
import {
    computed,
    ref,
    watch,
    onMounted,
    onUnmounted
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
} = storeToRefs(publicSiteStore);

const stack =
    useCardStack({
        pages,
        router,
        route
    });

const {
    initializeCookieConsent
} = useCookieConsent();

const isFullyExpanded = computed(() => {
    return (
        stack.mode.value ===
        'expanded'
    );
});

const MIN_LOADER_DURATION_MS =
    2500;

const hasSeenInitialLoading =
    ref(false);

const isLoaderMinimumDurationDone =
    ref(false);

let loaderMinimumDurationTimer =
    null;

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

function handleMenuClick() {
    if (
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
});
</script>

<template>
    <!-- Full viewport background -->
    <div
        class="
            min-h-[100dvh]
            w-full
            bg-baige
            text-green
        "
    >
        <!-- Centered site container -->
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
                    pointer-events-none
                    absolute
                    inset-0
                "
                aria-hidden="true"
            />

            <Transition
                name="shell-fade"
                mode="out-in"
            >
                <!-- Global loading state -->
                <div
                    v-if="isInitialLoading"
                    key="loading"
                    class="
                        flex
                        flex-1
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

                <!-- Global fatal error state -->
                <main
                    v-else-if="hasFatalLoadError"
                    key="error"
                    class="
                        flex
                        flex-1
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
                            border border-green/15
                            bg-white/45
                            px-6
                            py-10
                            text-center
                            shadow-[var(--shadow-mid)]

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
                                @click="publicSiteStore.reload"
                            >
                                Skúsiť znova
                            </Button>
                        </div>
                    </section>
                </main>

                <!-- App content -->
                <div
                    v-else
                    key="content"
                    class="
                        flex
                        flex-1
                        flex-col
                    "
                >
                    <!-- Header -->
                    <div
                        class="
                            relative
                            h-[60px]
                            w-full
                            shrink-0
                        "
                    >
                        <AppHeader
                            :show-menu="
                                isFullyExpanded
                            "
                            :is-fixed="
                                isFullyExpanded
                            "
                            @menu-click="
                                handleMenuClick
                            "
                        />
                    </div>

                    <!-- Page cards -->
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

                            sm:px-6
                        "
                    >
                        <CardStage
                            :pages="pages"
                            :stack="stack"
                        />
                    </main>

                    <!-- Footer -->
                    <AppFooter />

                    <CookieConsentSheet />
                </div>
            </Transition>
        </div>
    </div>
</template>

<style scoped>
.shell-fade-enter-active,
.shell-fade-leave-active {
    transition:
        opacity 0.34s ease,
        transform 0.34s ease;
}

.shell-fade-enter-from,
.shell-fade-leave-to {
    opacity: 0;
    transform: translateY(6px);
}
</style>