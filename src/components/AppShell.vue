<script setup>
import {
    computed,
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

const isFullyExpanded = computed(() => {
    return stack.mode.value === 'expanded'
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
            flex
            flex-col
            min-h-[100dvh]
            overflow-x-hidden
            bg-baige
            text-green
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

        <div class="relative h-[50px] w-full">
            <AppHeader
                :show-menu="isFullyExpanded"
                :is-fixed="isFullyExpanded"
                @menu-click="handleMenuClick"
            />
        </div>

        <main
            class="
                relative
                z-20
                flex
                items-start
                justify-center
                p-2
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