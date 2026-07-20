<script setup>
import { computed } from 'vue'
import PageCard from './PageCard.vue'

const props = defineProps({
    pages: {
        type: Array,
        required: true
    },
    stack: {
        type: Object,
        required: true
    }
})

const renderedCards = computed(() => {
    const ids = [...props.stack.cardOrder.value].reverse()

    return ids
        .map((id) => {
            return props.pages.find((page) => page.id === id)
        })
        .filter(Boolean)
})

function activateCard(cardId, element) {
    props.stack.handleCardActivate(cardId, element)
}

function handleCardElementChange(payload) {
    props.stack.registerCardElement(
        payload.cardId,
        payload.element
    )

    if (
        props.stack.mode.value === 'stacked' &&
        payload.element
    ) {
        props.stack.rememberStackedRect(
            payload.cardId,
            payload.element
        )
    }
}
</script>

<template>
    <section
        class="
            card-stage
            relative
            w-full
            max-w-[900px]
        "
        :class="
            stack.mode.value === 'expanded'
                ? 'h-auto min-h-[70dvh]'
                : 'h-[min(76dvh,780px)]'
        "
        aria-label="Card interface"
    >
        <PageCard
            v-for="card in renderedCards"
            :key="card.id"
            :card="card"
            :mode="stack.mode.value"
            :visual="stack.getCardVisual(card.id)"
            :reduced-motion="stack.reducedMotion.value"
            @activate="activateCard(card.id, $event)"
            @handle-pointer-down="
                stack.handleExpandedHandlePointerDown($event)
            "
            @handle-pointer-move="
                stack.handleExpandedHandlePointerMove($event)
            "
            @handle-pointer-up="
                stack.handleExpandedHandlePointerUp($event)
            "
            @handle-pointer-cancel="
                stack.handleExpandedHandlePointerCancel($event)
            "
            @minimize="stack.minimizeCard()"
            @transition-end="
                stack.handleTransitionEnd($event)
            "
            @card-element-change="
                handleCardElementChange
            "
        />
    </section>
</template>
