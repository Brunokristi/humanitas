<script setup>
import {
    computed,
    onMounted,
    onUnmounted
} from 'vue';

import {
    useRoute,
    useRouter
} from 'vue-router';

import { pages } from '../data/pages';
import { useCardStack } from '../composables/useCardStack';

import AppHeader from './AppHeader.vue';
import AppFooter from './AppFooter.vue';
import CardStage from './CardStage.vue';

const route =
    useRoute();

const router =
    useRouter();

const stack =
    useCardStack({
        pages,
        router,
        route
    });

const isFullyExpanded = computed(() => {
    return (
        stack.mode.value ===
        'expanded'
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
                overflow-x-hidden
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
        </div>
    </div>
</template>