<script setup>
import {
    computed,
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

const isInitialLoading = computed(() => {
    return (
        loading.value &&
        !company.value
    );
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

onMounted(() => {
    initializeCookieConsent();

    window.addEventListener(
        'keydown',
        handleGlobalKeydown
    );
});

onUnmounted(() => {
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

            <!-- Global loading state -->
            <div
                v-if="isInitialLoading"
                class="
                    flex
                    flex-1
                    flex-col
                "
            >
                <div
                    class="
                        relative
                        h-[60px]
                        w-full
                        shrink-0
                        px-5
                    "
                >
                    <div
                        class="
                            mx-auto
                            mt-5
                            h-6
                            w-56
                            animate-pulse
                            rounded-full
                            bg-green/10
                        "
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

                        sm:px-6
                    "
                >
                    <section
                        class="
                            mt-2
                            w-full
                            min-h-[min(76dvh,780px)]
                            space-y-5
                            px-2
                        "
                        aria-label="Načítavanie obsahu"
                    >
                        <div
                            v-for="index in 3"
                            :key="`loading-card-${index}`"
                            class="
                                h-[13.5rem]
                                w-full
                                animate-pulse
                                rounded-[2.4rem]
                                border border-green/10
                                bg-green/5
                            "
                        />
                    </section>
                </main>

                <div
                    class="
                        px-5
                        pb-8
                    "
                >
                    <div
                        class="
                            mx-auto
                            h-24
                            w-full
                            max-w-4xl
                            animate-pulse
                            rounded-[2rem]
                            bg-green/8
                        "
                    />
                </div>
            </div>

            <!-- Global fatal error state -->
            <main
                v-else-if="hasFatalLoadError"
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
            <template v-else>
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
            </template>
        </div>
    </div>
</template>