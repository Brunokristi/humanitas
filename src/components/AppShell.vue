<script setup>
import {
    onMounted,
    onUnmounted
} from 'vue'
import {
    useRoute,
    useRouter
} from 'vue-router'
import { pages } from '../data/pages'
import { useCardStack } from '../composables/useCardStack'
import AppHeader from './AppHeader.vue'
import AppFooter from './AppFooter.vue'
import CardStage from './CardStage.vue'

const route = useRoute()
const router = useRouter()

const stack = useCardStack({
    pages,
    router,
    route
})

function handleGlobalKeydown(event) {
    if (
        event.key === 'Escape' &&
        stack.mode.value === 'expanded'
    ) {
        stack.minimizeCard()
    }
}

function handleMenuClick() {
    if (stack.mode.value === 'expanded') {
        stack.minimizeCard()
    }
}

onMounted(() => {
    window.addEventListener(
        'keydown',
        handleGlobalKeydown
    )
})

onUnmounted(() => {
    window.removeEventListener(
        'keydown',
        handleGlobalKeydown
    )
})
</script>

<template>
    <div
        class="
            relative
            min-h-[100dvh]
            overflow-x-hidden
            bg-baige
            text-green
        "
    >
        <div
            class="
                subtle-grid
                pointer-events-none
                absolute
                inset-0
            "
            aria-hidden="true"
        />

        <AppHeader
            :show-menu="stack.mode.value === 'expanded'"
            @menu-click="handleMenuClick"
        />

        <main
            class="
                relative
                z-20
                flex
                min-h-[100dvh]
                items-start
                justify-center
                px-4
                pt-28
                sm:px-6
                sm:pt-32
            "
            :class="
                stack.mode.value === 'expanded'
                    ? 'pb-14 sm:pb-20'
                    : 'pb-20 sm:pb-24'
            "
        >
            <CardStage
                :pages="pages"
                :stack="stack"
            />
        </main>

        <AppFooter />
    </div>
</template>