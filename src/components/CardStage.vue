<script setup>
import {
    computed
} from 'vue';

import PageCard from './PageCard.vue';

const props = defineProps({
    pages: {
        type: Array,
        required: true
    },

    stack: {
        type: Object,
        required: true
    }
});

const renderedCards = computed(() => {
    return props.stack.cardOrder.value
        .map((id) => {
            return props.pages.find(
                (page) => {
                    return page.id === id;
                }
            );
        })
        .filter(Boolean);
});

const activeCard = computed(() => {
    return props.pages.find(
        (page) => {
            return (
                page.id ===
                props.stack.state
                    .activePageId
            );
        }
    ) ?? null;
});

const isOverview = computed(() => {
    return props.stack.isOverview.value;
});

const stageStyle = computed(() => {
    return {
        minHeight:
            props.stack
                .stageMinHeight
                .value,
        height:
            isOverview.value
                ? props.stack
                    .stageMinHeight
                    .value
                : 'auto'
    };
});

function setStageElement(element) {
    props.stack.registerStageElement(
        element
    );
}

function activateCard(cardId) {
    props.stack.handleCardActivate(
        cardId
    );
}

function setOverviewCardElement(
    cardId,
    element
) {
    props.stack
        .registerOverviewCardElement(
            cardId,
            element
        );
}

function setExpandedCardElement(
    element
) {
    props.stack
        .registerExpandedCardElement(
            element
        );
}
</script>

<template>
    <section
        :ref="setStageElement"
        class="card-stage"
        :class="{
            'card-stage--overview':
                isOverview,
            'card-stage--expanded':
                !isOverview,
            'card-stage--dragging':
                stack.overviewDragging.value
        }"
        :style="stageStyle"
        aria-label="Stránky Humanitas"
        @pointerdown="
            stack.handleOverviewPointerDown
        "
        @pointermove="
            stack.handleOverviewPointerMove
        "
        @pointerup="
            stack.handleOverviewPointerUp
        "
        @pointercancel="
            stack.handleOverviewPointerCancel
        "
    >
        <div
            v-if="isOverview"
            class="card-stage__overview"
        >
            <PageCard
                v-for="card in renderedCards"
                :key="card.id"
                :card="card"
                variant="preview"
                :visual="
                    stack.getOverviewVisual(
                        card.id
                    )
                "
                :interactive="
                    !stack.state
                        .interactionLocked
                "
                :shared="
                    stack.state
                        .sharedPageId ===
                    card.id
                "
                @activate="
                    activateCard(
                        card.id
                    )
                "
                @element-change="
                    setOverviewCardElement(
                        card.id,
                        $event
                    )
                "
            />
        </div>

        <div
            v-else-if="activeCard"
            class="card-stage__expanded"
        >
            <PageCard
                :key="activeCard.id"
                :card="activeCard"
                variant="expanded"
                :interactive="
                    !stack.state
                        .interactionLocked
                "
                :shared="
                    stack.state
                        .sharedPageId ===
                    activeCard.id
                "
                :capture-mode="
                    stack.state.captureMode
                "
                :capture-rect="
                    stack.state.captureRect
                "
                :capture-scroll-y="
                    stack.state.captureScrollY
                "
                @minimize="
                    stack.minimizeCard()
                "
                @element-change="
                    setExpandedCardElement
                "
            />
        </div>
    </section>
</template>

<style scoped>
.card-stage {
    position: relative;
    width: 100%;
    padding: 0;
    isolation: isolate;
}

.card-stage__overview {
    position: relative;
    width: 100%;
    height: 100%;
}

.card-stage--overview {
    overflow: clip;
    touch-action: pan-y;
    cursor: grab;
    user-select: none;
}

.card-stage--overview.card-stage--dragging {
    cursor: grabbing;
}

.card-stage__expanded {
    position: relative;
    width: 100%;
    min-height:
        calc(
            100dvh -
            var(--app-header-height, 0px)
        );
}

.card-stage--expanded {
    overflow: visible;
    touch-action: auto;
}

@supports not (overflow: clip) {
    .card-stage--overview {
        overflow: hidden;
    }
}
</style>
