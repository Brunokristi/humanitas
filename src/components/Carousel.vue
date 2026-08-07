<script setup>
import {
    computed,
    onBeforeUnmount,
    ref,
    watch
} from 'vue';

import {
    useScrollMotion
} from '../composables/useScrollMotion';

import Card from './Card.vue';
import DesktopCarouselControls from './DesktopCarouselControls.vue';

const props = defineProps({
    items: {
        type: Array,
        required: true
    },

    initialIndex: {
        type: Number,
        default: 0
    },

    ariaLabel: {
        type: String,
        default: 'Posuvné karty'
    },

    previousLabel: {
        type: String,
        default: 'Predchádzajúca karta'
    },

    nextLabel: {
        type: String,
        default: 'Nasledujúca karta'
    },

    scrollMotion: {
        type: Boolean,
        default: false
    }
});

const scrollMotionEnabled = computed(() => {
    return props.scrollMotion;
});

const {
    motionRoot
} = useScrollMotion({
    enabled:
        scrollMotionEnabled,

    disableOnCoarsePointer:
        true
});

const currentIndex = ref(
    Math.min(
        Math.max(
            props.initialIndex,
            0
        ),
        Math.max(
            props.items.length - 1,
            0
        )
    )
);

const stageElement =
    ref(null);

const dragX =
    ref(0);

const cardWidth =
    ref(1);

const isDragging =
    ref(false);

const lastDirection =
    ref(1);

const pointerId =
    ref(null);

const pointerStartX =
    ref(0);

const previousPointerX =
    ref(0);

const previousPointerTime =
    ref(0);

const pointerVelocity =
    ref(0);

const exitingCards =
    ref({});

const exitTimers =
    new Map();

const cardCount = computed(() => {
    return props.items.length;
});

const dragProgress = computed(() => {
    return Math.min(
        Math.abs(
            dragX.value
        ) /
            Math.max(
                cardWidth.value,
                1
            ),
        1
    );
});

const deckDirection = computed(() => {
    if (
        Math.abs(
            dragX.value
        ) >
        2
    ) {
        return dragX.value < 0
            ? 1
            : -1;
    }

    return lastDirection.value;
});

const currentNumber = computed(() => {
    if (!cardCount.value) {
        return '00';
    }

    return String(
        currentIndex.value + 1
    ).padStart(
        2,
        '0'
    );
});

const totalNumber = computed(() => {
    return String(
        cardCount.value
    ).padStart(
        2,
        '0'
    );
});

const stackPositions = [
    {
        x: -12,
        y: -16,
        scale: 0.975,
        rotate: -1.8
    },

    {
        x: 12,
        y: -29,
        scale: 0.95,
        rotate: 1.8
    },

    {
        x: -9,
        y: -42,
        scale: 0.925,
        rotate: -1.2
    },

    {
        x: 9,
        y: -54,
        scale: 0.9,
        rotate: 1.2
    },

    {
        x: 0,
        y: -65,
        scale: 0.875,
        rotate: 0
    }
];

function clamp(
    value,
    minimum,
    maximum
) {
    return Math.min(
        maximum,
        Math.max(
            minimum,
            value
        )
    );
}

function circularIndex(index) {
    if (!cardCount.value) {
        return 0;
    }

    return (
        index %
            cardCount.value +
        cardCount.value
    ) %
        cardCount.value;
}

function updateCardWidth() {
    const cardElement =
        stageElement.value
            ?.querySelector(
                '[data-carousel-card]'
            );

    const rect =
        cardElement
            ?.getBoundingClientRect();

    cardWidth.value =
        rect?.width ||
        1;
}

function getDeckDepth(index) {
    if (!cardCount.value) {
        return 0;
    }

    if (
        index ===
        currentIndex.value
    ) {
        return 0;
    }

    if (
        deckDirection.value >
        0
    ) {
        return (
            index -
            currentIndex.value +
            cardCount.value
        ) %
            cardCount.value;
    }

    return (
        currentIndex.value -
        index +
        cardCount.value
    ) %
        cardCount.value;
}

function getStackTransform(depth) {
    const positionIndex =
        Math.min(
            Math.max(
                depth - 1,
                0
            ),
            stackPositions.length -
                1
        );

    return stackPositions[
        positionIndex
    ];
}

function isCardExiting(index) {
    return Boolean(
        exitingCards.value[
            index
        ]
    );
}

function isCardActive(index) {
    return (
        index ===
            currentIndex.value &&
        !isCardExiting(
            index
        )
    );
}

function getCardWrapperClasses(
    index
) {
    const active =
        isCardActive(
            index
        );

    return [
        active
            ? 'pointer-events-auto'
            : 'pointer-events-none',

        active &&
        isDragging.value
            ? 'transition-none'
            : [
                'transition-transform',
                'duration-[280ms]',
                'ease-[cubic-bezier(0.2,0.85,0.25,1)]'
            ].join(' '),

        isCardExiting(
            index
        )
            ? 'pointer-events-none'
            : ''
    ];
}

function getCardWrapperStyle(
    index
) {
    const exitState =
        exitingCards.value[
            index
        ];

    if (exitState) {
        return {
            transform: [
                `translate3d(${exitState.x}px, ${exitState.y}px, 0)`,
                `rotate(${exitState.rotate}deg)`,
                `scale(${exitState.scale})`
            ].join(' '),

            zIndex:
                60
        };
    }

    const active =
        index ===
        currentIndex.value;

    if (active) {
        const normalizedDrag =
            dragX.value /
            Math.max(
                cardWidth.value,
                1
            );

        const absoluteProgress =
            Math.abs(
                normalizedDrag
            );

        const verticalMovement =
            absoluteProgress *
            7;

        const rotation =
            normalizedDrag *
            5;

        const scale =
            1 -
            absoluteProgress *
                0.012;

        return {
            transform: [
                `translate3d(${dragX.value}px, ${verticalMovement}px, 0)`,
                `rotate(${rotation}deg)`,
                `scale(${scale})`
            ].join(' '),

            zIndex:
                40
        };
    }

    const depth =
        getDeckDepth(
            index
        );

    const stack =
        getStackTransform(
            depth
        );

    const revealProgress =
        depth === 1
            ? dragProgress.value
            : 0;

    const x =
        stack.x *
        (
            1 -
            revealProgress
        );

    const y =
        stack.y *
        (
            1 -
            revealProgress
        );

    const scale =
        stack.scale +
        (
            1 -
            stack.scale
        ) *
            revealProgress;

    const rotation =
        stack.rotate *
        (
            1 -
            revealProgress
        );

    return {
        transform: [
            `translate3d(${x}px, ${y}px, 0)`,
            `rotate(${rotation}deg)`,
            `scale(${scale})`
        ].join(' '),

        zIndex:
            Math.max(
                1,
                40 - depth
            )
    };
}

/*
 * Returns the rotation currently owned
 * by the carousel wrapper.
 *
 * The scroll-motion engine uses the
 * opposite amount while scrolling so
 * the visible card wants to straighten.
 */

function getCardBaseRotation(
    index
) {
    const exitState =
        exitingCards.value[
            index
        ];

    if (exitState) {
        return (
            exitState.rotate ??
            0
        );
    }

    const active =
        index ===
        currentIndex.value;

    if (active) {
        const normalizedDrag =
            dragX.value /
            Math.max(
                cardWidth.value,
                1
            );

        return (
            normalizedDrag *
            5
        );
    }

    const depth =
        getDeckDepth(
            index
        );

    const stack =
        getStackTransform(
            depth
        );

    const revealProgress =
        depth === 1
            ? dragProgress.value
            : 0;

    return (
        stack.rotate *
        (
            1 -
            revealProgress
        )
    );
}

function clearExitState(index) {
    const timer =
        exitTimers.get(
            index
        );

    if (timer) {
        window.clearTimeout(
            timer
        );

        exitTimers.delete(
            index
        );
    }

    if (
        !exitingCards.value[
            index
        ]
    ) {
        return;
    }

    const nextStates = {
        ...exitingCards.value
    };

    delete nextStates[
        index
    ];

    exitingCards.value =
        nextStates;
}

function scheduleExitRemoval(
    index
) {
    const existingTimer =
        exitTimers.get(
            index
        );

    if (existingTimer) {
        window.clearTimeout(
            existingTimer
        );
    }

    const timer =
        window.setTimeout(
            () => {
                clearExitState(
                    index
                );
            },
            300
        );

    exitTimers.set(
        index,
        timer
    );
}

function resetDragState() {
    isDragging.value =
        false;

    pointerId.value =
        null;

    pointerVelocity.value =
        0;

    dragX.value =
        0;
}

function commitMovement(
    direction,
    targetIndex = null
) {
    if (
        cardCount.value <= 1
    ) {
        resetDragState();

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
            : circularIndex(
                targetIndex
            );

    if (
        incomingIndex ===
        outgoingIndex
    ) {
        resetDragState();

        return;
    }

    clearExitState(
        incomingIndex
    );

    clearExitState(
        outgoingIndex
    );

    lastDirection.value =
        direction;

    const targetX =
        direction > 0
            ? -cardWidth.value *
                1.15
            : cardWidth.value *
                1.15;

    exitingCards.value = {
        ...exitingCards.value,

        [outgoingIndex]: {
            x:
                targetX,

            y:
                8,

            rotate:
                direction > 0
                    ? -5
                    : 5,

            scale:
                0.985
        }
    };

    currentIndex.value =
        incomingIndex;

    resetDragState();

    scheduleExitRemoval(
        outgoingIndex
    );
}

function goNext() {
    commitMovement(
        1
    );
}

function goPrevious() {
    commitMovement(
        -1
    );
}

function goTo(index) {
    if (
        index ===
            currentIndex.value ||
        cardCount.value <= 1
    ) {
        return;
    }

    const forwardDistance =
        (
            index -
            currentIndex.value +
            cardCount.value
        ) %
        cardCount.value;

    const backwardDistance =
        (
            currentIndex.value -
            index +
            cardCount.value
        ) %
        cardCount.value;

    const direction =
        forwardDistance <=
        backwardDistance
            ? 1
            : -1;

    commitMovement(
        direction,
        index
    );
}

function shouldIgnorePointerStart(
    target
) {
    return Boolean(
        target?.closest?.(
            [
                'a',
                'button',
                'input',
                'textarea',
                'select',
                'label',
                '[data-no-drag]'
            ].join(', ')
        )
    );
}

function handlePointerDown(
    event
) {
    if (
        shouldIgnorePointerStart(
            event.target
        )
    ) {
        return;
    }

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

    pointerVelocity.value =
        0;

    dragX.value =
        0;

    isDragging.value =
        true;

    try {
        event.currentTarget
            ?.setPointerCapture?.(
                event.pointerId
            );
    } catch {
        //
    }
}

function handlePointerMove(
    event
) {
    if (
        !isDragging.value ||
        pointerId.value !==
            event.pointerId
    ) {
        return;
    }

    const now =
        performance.now();

    const elapsed =
        Math.max(
            now -
            previousPointerTime.value,
            1
        );

    const movement =
        event.clientX -
        previousPointerX.value;

    pointerVelocity.value =
        movement /
        elapsed;

    previousPointerX.value =
        event.clientX;

    previousPointerTime.value =
        now;

    const distance =
        event.clientX -
        pointerStartX.value;

    const maximumDrag =
        cardWidth.value *
        0.72;

    dragX.value =
        clamp(
            distance,
            -maximumDrag,
            maximumDrag
        );
}

function handlePointerEnd(
    event
) {
    if (
        !isDragging.value ||
        pointerId.value !==
            event.pointerId
    ) {
        return;
    }

    try {
        event.currentTarget
            ?.releasePointerCapture?.(
                event.pointerId
            );
    } catch {
        //
    }

    const distance =
        Math.abs(
            dragX.value
        );

    const distanceThreshold =
        cardWidth.value *
        0.11;

    const velocityThreshold =
        0.28;

    const shouldChange =
        distance >=
            distanceThreshold ||
        Math.abs(
            pointerVelocity.value
        ) >=
            velocityThreshold;

    if (!shouldChange) {
        resetDragState();

        return;
    }

    const movementValue =
        Math.abs(
            dragX.value
        ) >
        2
            ? dragX.value
            : pointerVelocity.value;

    const direction =
        movementValue < 0
            ? 1
            : -1;

    commitMovement(
        direction
    );
}

function handlePointerCancel() {
    if (!isDragging.value) {
        return;
    }

    resetDragState();
}

function handleKeydown(event) {
    if (
        event.key ===
        'ArrowLeft'
    ) {
        event.preventDefault();

        goPrevious();
    }

    if (
        event.key ===
        'ArrowRight'
    ) {
        event.preventDefault();

        goNext();
    }
}

watch(
    () =>
        props.items.length,

    (length) => {
        if (!length) {
            currentIndex.value =
                0;

            resetDragState();

            return;
        }

        if (
            currentIndex.value >
            length - 1
        ) {
            currentIndex.value =
                length - 1;
        }
    }
);

onBeforeUnmount(() => {
    exitTimers.forEach(
        (timer) => {
            window.clearTimeout(
                timer
            );
        }
    );

    exitTimers.clear();
});
</script>

<template>
    <section
        ref="motionRoot"
        class="
            relative
            z-20
            w-full
        "
        :aria-label="
            ariaLabel
        "
    >
        <div
            class="
                mx-auto
                w-full
                px-7
                pb-10
                pt-10
            "
        >
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
                    place-items-center
                    outline-none

                    active:cursor-grabbing
                "
                @keydown="
                    handleKeydown
                "
                @pointerdown="
                    handlePointerDown
                "
                @pointermove="
                    handlePointerMove
                "
                @pointerup="
                    handlePointerEnd
                "
                @pointercancel="
                    handlePointerCancel
                "
            >
                <div
                    v-for="
                        (
                            item,
                            index
                        ) in
                        items
                    "
                    :key="
                        item.id ??
                        index
                    "
                    data-carousel-card
                    class="
                        relative
                        col-start-1
                        row-start-1
                        flex
                        w-full
                        max-w-[36rem]
                        origin-[50%_92%]
                        justify-self-center
                        [backface-visibility:hidden]
                    "
                    :class="[
                        getCardWrapperClasses(
                            index
                        ),
                        {
                            '[will-change:transform]':
                                isDragging
                        }
                    ]"
                    :style="
                        getCardWrapperStyle(
                            index
                        )
                    "
                    :aria-hidden="
                        !isCardActive(
                            index
                        )
                    "
                >
                    <Card
                        :item="
                            item
                        "
                        :active="
                            isCardActive(
                                index
                            )
                        "
                        :class="{
                            'scroll-motion':
                                scrollMotion
                        }"
                        :data-scroll-motion="
                            scrollMotion
                                ? ''
                                : undefined
                        "
                        :data-motion-seed="
                            scrollMotion
                                ? index + 1
                                : undefined
                        "
                        :data-base-rotation="
                            scrollMotion
                                ? getCardBaseRotation(
                                    index
                                )
                                : undefined
                        "
                        :data-rotation-mode="
                            scrollMotion
                                ? 'offset'
                                : undefined
                        "
                        :data-motion-strength="
                            scrollMotion
                                ? 1
                                : undefined
                        "
                        :data-straighten-strength="
                            scrollMotion
                                ? 0.96
                                : undefined
                        "
                        :data-max-y="
                            scrollMotion
                                ? 12
                                : undefined
                        "
                        :data-max-scale="
                            scrollMotion
                                ? 0.004
                                : undefined
                        "
                    >
                        <template
                            #default="slotProps"
                        >
                            <slot
                                name="card"
                                :item="
                                    slotProps.item
                                "
                                :index="
                                    index
                                "
                                :active="
                                    slotProps.active
                                "
                            >
                                <div
                                    class="
                                        flex
                                        flex-col
                                        gap-6
                                    "
                                >
                                    <h3
                                        class="
                                            text-regular
                                            font-bold
                                            text-green
                                        "
                                    >
                                        {{
                                            slotProps
                                                .item
                                                .question
                                        }}
                                    </h3>

                                    <p
                                        class="
                                            text-regular
                                            max-w-[25rem]
                                            leading-[1.55]
                                            text-green
                                        "
                                    >
                                        {{
                                            slotProps
                                                .item
                                                .answer
                                        }}
                                    </p>
                                </div>
                            </slot>
                        </template>
                    </Card>
                </div>
            </div>
        </div>

        <!-- Desktop controls -->
        <DesktopCarouselControls
            :count="
                cardCount
            "
            :current-index="
                currentIndex
            "
            :previous-label="
                previousLabel
            "
            :next-label="
                nextLabel
            "
            tablist-label="Výber karty"
            card-aria-prefix="Zobraziť kartu"
            variant="stacked"
            @previous="
                goPrevious
            "
            @next="
                goNext
            "
            @select="
                goTo
            "
        />

        <p
            class="
                sr-only
            "
            aria-live="polite"
        >
            Karta
            {{ currentNumber }}
            z
            {{ totalNumber }}
        </p>
    </section>
</template>