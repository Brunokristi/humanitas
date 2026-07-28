<script setup>
import {
    computed,
    onBeforeUnmount,
    ref
} from 'vue';

const props = defineProps({
    items: {
        type: Array,
        required: true
    },

    initialIndex: {
        type: Number,
        default: 0
    }
});

const currentIndex = ref(
    Math.min(
        Math.max(props.initialIndex, 0),
        Math.max(props.items.length - 1, 0)
    )
);

const stageElement = ref(null);

const dragX = ref(0);
const cardWidth = ref(1);
const isDragging = ref(false);
const lastDirection = ref(1);

const pointerId = ref(null);
const pointerStartX = ref(0);
const previousPointerX = ref(0);
const previousPointerTime = ref(0);
const pointerVelocity = ref(0);

const exitingCards = ref({});
const exitTimers = new Map();

const cardCount = computed(() => {
    return props.items.length;
});

const dragProgress = computed(() => {
    return Math.min(
        Math.abs(dragX.value) /
            Math.max(cardWidth.value, 1),
        1
    );
});

const deckDirection = computed(() => {
    if (Math.abs(dragX.value) > 2) {
        return dragX.value < 0
            ? 1
            : -1;
    }

    return lastDirection.value;
});

const currentNumber = computed(() => {
    return String(currentIndex.value + 1)
        .padStart(2, '0');
});

const totalNumber = computed(() => {
    return String(cardCount.value)
        .padStart(2, '0');
});

function clamp(value, min, max) {
    return Math.min(
        max,
        Math.max(min, value)
    );
}

function circularIndex(index) {
    if (!cardCount.value) {
        return 0;
    }

    return (
        index % cardCount.value +
        cardCount.value
    ) % cardCount.value;
}

function updateCardWidth() {
    const rect = stageElement.value
        ?.getBoundingClientRect();

    cardWidth.value = rect?.width || 1;
}

function getDeckDepth(index) {
    if (!cardCount.value) {
        return 0;
    }

    if (index === currentIndex.value) {
        return 0;
    }

    if (deckDirection.value > 0) {
        return (
            index -
            currentIndex.value +
            cardCount.value
        ) % cardCount.value;
    }

    return (
        currentIndex.value -
        index +
        cardCount.value
    ) % cardCount.value;
}

const stackPositions = [
    {
        x: -18,
        y: -16,
        scale: 0.975,
        rotate: -2.2
    },
    {
        x: 20,
        y: -29,
        scale: 0.95,
        rotate: 2.7
    },
    {
        x: -13,
        y: -42,
        scale: 0.925,
        rotate: -1.5
    },
    {
        x: 15,
        y: -54,
        scale: 0.9,
        rotate: 1.9
    },
    {
        x: -7,
        y: -65,
        scale: 0.875,
        rotate: -0.8
    }
];

function getStackTransform(depth) {
    const positionIndex = Math.min(
        Math.max(depth - 1, 0),
        stackPositions.length - 1
    );

    return stackPositions[positionIndex];
}

function isCardExiting(index) {
    return Boolean(
        exitingCards.value[index]
    );
}

function isCardActive(index) {
    return (
        index === currentIndex.value &&
        !isCardExiting(index)
    );
}

function getCardClasses(index) {
    const active = isCardActive(index);
    const exiting = isCardExiting(index);

    return [
        active
            ? 'pointer-events-auto shadow-[0_2.8rem_6rem_rgba(16,35,24,0.22),0_0.8rem_2rem_rgba(16,35,24,0.12)]'
            : 'pointer-events-none shadow-[0_2rem_4.5rem_rgba(16,35,24,0.15),0_0.6rem_1.5rem_rgba(16,35,24,0.08)]',

        active && isDragging.value
            ? 'transition-none'
            : 'transition-[transform,box-shadow] duration-[560ms] ease-[cubic-bezier(0.16,1,0.3,1)]',

        exiting
            ? 'pointer-events-none'
            : ''
    ];
}

function getCardStyle(index) {
    const exitState =
        exitingCards.value[index];

    if (exitState) {
        return {
            transform: `
                translate3d(
                    ${exitState.x}px,
                    ${exitState.y}px,
                    0
                )
                rotate(${exitState.rotate}deg)
                scale(${exitState.scale})
            `,
            zIndex: 60
        };
    }

    const active =
        index === currentIndex.value;

    if (active) {
        const normalizedDrag =
            dragX.value /
            Math.max(cardWidth.value, 1);

        const absoluteProgress =
            Math.abs(normalizedDrag);

        const verticalMovement =
            absoluteProgress * 12;

        const rotation =
            normalizedDrag * 7;

        const scale =
            1 - absoluteProgress * 0.018;

        return {
            transform: `
                translate3d(
                    ${dragX.value}px,
                    ${verticalMovement}px,
                    0
                )
                rotate(${rotation}deg)
                scale(${scale})
            `,
            zIndex: 40
        };
    }

    const depth = getDeckDepth(index);
    const stack = getStackTransform(depth);

    const revealProgress =
        depth === 1
            ? dragProgress.value
            : 0;

    const x =
        stack.x *
        (1 - revealProgress);

    const y =
        stack.y *
        (1 - revealProgress);

    const scale =
        stack.scale +
        (1 - stack.scale) *
            revealProgress;

    const rotate =
        stack.rotate *
        (1 - revealProgress);

    return {
        transform: `
            translate3d(
                ${x}px,
                ${y}px,
                0
            )
            rotate(${rotate}deg)
            scale(${scale})
        `,
        zIndex: Math.max(
            1,
            40 - depth
        )
    };
}

function clearExitState(index) {
    const timer =
        exitTimers.get(index);

    if (timer) {
        window.clearTimeout(timer);
        exitTimers.delete(index);
    }

    if (!exitingCards.value[index]) {
        return;
    }

    const nextStates = {
        ...exitingCards.value
    };

    delete nextStates[index];

    exitingCards.value = nextStates;
}

function scheduleExitRemoval(index) {
    const existingTimer =
        exitTimers.get(index);

    if (existingTimer) {
        window.clearTimeout(existingTimer);
    }

    const timer = window.setTimeout(() => {
        clearExitState(index);
    }, 580);

    exitTimers.set(index, timer);
}

function commitMovement(
    direction,
    targetIndex = null
) {
    if (cardCount.value <= 1) {
        return;
    }

    updateCardWidth();

    const outgoingIndex =
        currentIndex.value;

    const incomingIndex =
        targetIndex === null
            ? circularIndex(
                currentIndex.value +
                direction
            )
            : circularIndex(targetIndex);

    if (incomingIndex === outgoingIndex) {
        restoreCard();
        return;
    }

    clearExitState(incomingIndex);
    clearExitState(outgoingIndex);

    lastDirection.value = direction;

    const targetX =
        direction > 0
            ? -cardWidth.value * 0.72
            : cardWidth.value * 0.72;

    exitingCards.value = {
        ...exitingCards.value,

        [outgoingIndex]: {
            x: targetX,
            y: 16,
            rotate:
                direction > 0
                    ? -7
                    : 7,
            scale: 0.975
        }
    };

    currentIndex.value = incomingIndex;
    dragX.value = 0;
    isDragging.value = false;
    pointerId.value = null;
    pointerVelocity.value = 0;

    scheduleExitRemoval(outgoingIndex);
}

function restoreCard() {
    isDragging.value = false;
    pointerId.value = null;
    pointerVelocity.value = 0;
    dragX.value = 0;
}

function goNext() {
    commitMovement(1);
}

function goPrevious() {
    commitMovement(-1);
}

function goTo(index) {
    if (
        index === currentIndex.value ||
        cardCount.value <= 1
    ) {
        return;
    }

    const forwardDistance = (
        index -
        currentIndex.value +
        cardCount.value
    ) % cardCount.value;

    const backwardDistance = (
        currentIndex.value -
        index +
        cardCount.value
    ) % cardCount.value;

    const direction =
        forwardDistance <= backwardDistance
            ? 1
            : -1;

    commitMovement(
        direction,
        index
    );
}

function handlePointerDown(event) {
    if (
        cardCount.value <= 1 ||
        event.button !== 0 ||
        isDragging.value
    ) {
        return;
    }

    updateCardWidth();

    pointerId.value =
        event.pointerId;

    pointerStartX.value =
        event.clientX;

    previousPointerX.value =
        event.clientX;

    previousPointerTime.value =
        performance.now();

    pointerVelocity.value = 0;
    dragX.value = 0;
    isDragging.value = true;

    event.currentTarget.setPointerCapture(
        event.pointerId
    );
}

function handlePointerMove(event) {
    if (
        !isDragging.value ||
        pointerId.value !== event.pointerId
    ) {
        return;
    }

    const now = performance.now();

    const elapsed = Math.max(
        now - previousPointerTime.value,
        1
    );

    const movement =
        event.clientX -
        previousPointerX.value;

    pointerVelocity.value =
        movement / elapsed;

    previousPointerX.value =
        event.clientX;

    previousPointerTime.value =
        now;

    const distance =
        event.clientX -
        pointerStartX.value;

    const maximumDrag =
        cardWidth.value * 0.72;

    dragX.value = clamp(
        distance,
        -maximumDrag,
        maximumDrag
    );
}

function handlePointerEnd(event) {
    if (
        !isDragging.value ||
        pointerId.value !== event.pointerId
    ) {
        return;
    }

    const distance =
        Math.abs(dragX.value);

    const distanceThreshold =
        cardWidth.value * 0.15;

    const velocityThreshold = 0.4;

    const shouldChange =
        distance >= distanceThreshold ||
        Math.abs(pointerVelocity.value) >=
            velocityThreshold;

    if (!shouldChange) {
        restoreCard();
        return;
    }

    const movementValue =
        Math.abs(dragX.value) > 2
            ? dragX.value
            : pointerVelocity.value;

    const direction =
        movementValue < 0
            ? 1
            : -1;

    commitMovement(direction);
}

function handlePointerCancel() {
    if (!isDragging.value) {
        return;
    }

    restoreCard();
}

function handleKeydown(event) {
    if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrevious();
    }

    if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
    }
}

onBeforeUnmount(() => {
    exitTimers.forEach((timer) => {
        window.clearTimeout(timer);
    });

    exitTimers.clear();
});
</script>

<template>
    <section
        class="mx-auto w-full max-w-[36rem] overflow-hidden md:max-w-[39rem]"
        aria-label="Často kladené otázky"
    >
        <div class="px-7 pb-12 pt-20 md:px-10 md:pb-16 md:pt-24">
            <div
                ref="stageElement"
                tabindex="0"
                class="
                    relative
                    isolate
                    grid
                    w-full
                    cursor-grab
                    touch-pan-y
                    select-none
                    outline-none
                    active:cursor-grabbing
                    px-5
                "
                @keydown="handleKeydown"
                @pointerdown="handlePointerDown"
                @pointermove="handlePointerMove"
                @pointerup="handlePointerEnd"
                @pointercancel="handlePointerCancel"
            >
                <article
                    v-for="(item, index) in items"
                    :key="`${item.question}-${index}`"
                    class="
                        relative
                        col-start-1
                        row-start-1
                        flex
                        min-h-[20rem]
                        w-full
                        origin-[50%_92%]
                        overflow-hidden
                        rounded-[clamp(2.5rem,8vw,4.4rem)]
                        bg-baige
                        text-green
                        opacity-100
                        [backface-visibility:hidden]
                        [will-change:transform,box-shadow]
                        md:min-h-[36rem]
                    "
                    :class="getCardClasses(index)"
                    :style="getCardStyle(index)"
                    :aria-hidden="index !== currentIndex"
                >
                    <div
                        class="
                            pointer-events-none
                            absolute
                            inset-0
                            rounded-[inherit]
                            bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.58),transparent_35%)]
                        "
                        aria-hidden="true"
                    />

                    <div
                        class="
                            pointer-events-none
                            absolute
                            inset-0
                            rounded-[inherit]
                            shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]
                        "
                        aria-hidden="true"
                    />

                    <div
                        class="
                            relative
                            flex
                            w-full
                            flex-col
                            justify-center
                            px-[clamp(2.1rem,8vw,4.2rem)]
                            py-[clamp(2.4rem,8vw,4rem)]
                        "
                    >
                        <h3 class="text-bold max-w-[21rem] text-green">
                            {{ item.question }}
                        </h3>

                        <p
                            class="
                                text-regular
                                mt-[clamp(2rem,7vw,3.25rem)]
                                max-w-[25rem]
                                leading-[1.55]
                                text-green/85
                            "
                        >
                            {{ item.answer }}
                        </p>
                    </div>
                </article>
            </div>
        </div>

        <div
            v-if="cardCount > 1"
            class="
                grid
                grid-cols-[auto_minmax(0,1fr)]
                items-center
                gap-6
                px-7
                md:grid-cols-[auto_minmax(0,1fr)_auto]
                md:px-10
            "
        >
            <div class="flex items-center gap-3 text-baige">
                <span class="text-regular">
                    {{ currentNumber }}
                </span>

                <span
                    class="h-px w-8 bg-baige/30"
                    aria-hidden="true"
                />

                <span class="text-regular text-baige/40">
                    {{ totalNumber }}
                </span>
            </div>

            <div
                class="flex items-center justify-end gap-2 md:justify-center"
                role="tablist"
                aria-label="Výber otázky"
            >
                <button
                    v-for="(_, index) in items"
                    :key="index"
                    type="button"
                    class="
                        h-1.5
                        rounded-full
                        bg-baige/30
                        transition-[width,background-color,transform]
                        duration-500
                        ease-[cubic-bezier(0.16,1,0.3,1)]
                        hover:scale-110
                        focus-visible:outline
                        focus-visible:outline-2
                        focus-visible:outline-offset-4
                        focus-visible:outline-baige/70
                    "
                    :class="
                        index === currentIndex
                            ? 'w-8 bg-baige'
                            : 'w-1.5'
                    "
                    :aria-label="`Zobraziť otázku ${index + 1}`"
                    :aria-selected="index === currentIndex"
                    role="tab"
                    @click="goTo(index)"
                />
            </div>

            <div class="hidden items-center gap-3 md:flex">
                <button
                    type="button"
                    class="
                        flex
                        h-13
                        w-13
                        items-center
                        justify-center
                        rounded-full
                        bg-baige/10
                        text-baige
                        transition-[transform,background-color]
                        duration-500
                        ease-[cubic-bezier(0.16,1,0.3,1)]
                        hover:scale-110
                        hover:bg-baige/18
                        active:scale-95
                        focus-visible:outline
                        focus-visible:outline-2
                        focus-visible:outline-offset-4
                        focus-visible:outline-baige/70
                    "
                    aria-label="Predchádzajúca otázka"
                    @click="goPrevious"
                >
                    <svg
                        viewBox="0 0 24 24"
                        class="h-5 w-5"
                        aria-hidden="true"
                    >
                        <path
                            d="M15 5 8 12l7 7"
                            fill="none"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.6"
                        />
                    </svg>
                </button>

                <button
                    type="button"
                    class="
                        flex
                        h-13
                        w-13
                        items-center
                        justify-center
                        rounded-full
                        bg-baige/10
                        text-baige
                        transition-[transform,background-color]
                        duration-500
                        ease-[cubic-bezier(0.16,1,0.3,1)]
                        hover:scale-110
                        hover:bg-baige/18
                        active:scale-95
                        focus-visible:outline
                        focus-visible:outline-2
                        focus-visible:outline-offset-4
                        focus-visible:outline-baige/70
                    "
                    aria-label="Nasledujúca otázka"
                    @click="goNext"
                >
                    <svg
                        viewBox="0 0 24 24"
                        class="h-5 w-5"
                        aria-hidden="true"
                    >
                        <path
                            d="m9 5 7 7-7 7"
                            fill="none"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.6"
                        />
                    </svg>
                </button>
            </div>
        </div>
    </section>
</template>