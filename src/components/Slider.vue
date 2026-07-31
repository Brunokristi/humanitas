<script setup>
import {
    computed,
    onBeforeUnmount,
    onMounted,
    ref,
    watch
} from 'vue';

import Card from './Card.vue';

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
        default: 'Posuvník'
    },

    cardHeight: {
        type: String,
        default: '23rem'
    },

    backgroundImage: {
        type: String,
        default: '/images/humanitas_pozadie.png'
    },

    backgroundColor: {
        type: String,
        default: '#FBF9F3'
    },

    imageOpacity: {
        type: Number,
        default: 0.5
    },

    imageScale: {
        type: Number,
        default: 2.8
    }
});

const emit = defineEmits([
    'select'
]);

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

const sliderElement = ref(null);

const cardWidth = ref(360);

const viewportWidth = ref(
    typeof window !== 'undefined'
        ? window.innerWidth
        : 1024
);

const dragX = ref(0);

const isDragging = ref(false);
const hasDragged = ref(false);

const pointerId = ref(null);
const pointerStartX = ref(0);
const previousPointerX = ref(0);
const previousPointerTime = ref(0);
const pointerVelocity = ref(0);

const CARD_ANGLE_GAP = 14;
const RECYCLE_DISTANCE = 2;
const CLICK_DRAG_THRESHOLD = 8;

const cardCount = computed(() => {
    return props.items.length;
});

const circleRadius = computed(() => {
    if (
        viewportWidth.value <
        480
    ) {
        return 1150;
    }

    if (
        viewportWidth.value <
        768
    ) {
        return 1350;
    }

    return 1750;
});

const wheelOffsetY = computed(() => {
    if (
        viewportWidth.value <
        480
    ) {
        return 28;
    }

    if (
        viewportWidth.value <
        768
    ) {
        return 34;
    }

    return 42;
});

const dragAngle = computed(() => {
    if (!cardWidth.value) {
        return 0;
    }

    return (
        dragX.value /
        cardWidth.value
    ) * CARD_ANGLE_GAP;
});

const wheelAngle = computed(() => {
    return dragAngle.value;
});

/*
 * We know the exact card height.
 *
 * We only add some room underneath because
 * the cards travel down the circular path.
 */
const sliderHeight = computed(() => {
    return `calc(${props.cardHeight} + 5.5rem)`;
});

function circularIndex(index) {
    if (!cardCount.value) {
        return 0;
    }

    return (
        index %
        cardCount.value +
        cardCount.value
    ) % cardCount.value;
}

function getRelativeIndex(index) {
    if (!cardCount.value) {
        return 0;
    }

    let difference =
        index -
        currentIndex.value;

    const half =
        cardCount.value / 2;

    if (
        difference >
        half
    ) {
        difference -=
            cardCount.value;
    }

    if (
        difference <
        -half
    ) {
        difference +=
            cardCount.value;
    }

    return difference;
}

function isRecyclingCard(index) {
    return (
        Math.abs(
            getRelativeIndex(index)
        ) >=
        RECYCLE_DISTANCE
    );
}

function isCardVisible(index) {
    return (
        Math.abs(
            getRelativeIndex(index)
        ) <
        RECYCLE_DISTANCE
    );
}

function updateMeasurements() {
    if (
        typeof window !==
        'undefined'
    ) {
        viewportWidth.value =
            window.innerWidth;
    }

    const card =
        sliderElement.value
            ?.querySelector(
                '[data-slider-card]'
            );

    if (!card) {
        return;
    }

    const rect =
        card.getBoundingClientRect();

    if (rect.width) {
        cardWidth.value =
            rect.width;
    }
}

function getCardStyle(index) {
    const relativeIndex =
        getRelativeIndex(index);

    const angleDegrees =
        relativeIndex *
        CARD_ANGLE_GAP +
        wheelAngle.value;

    const angleRadians =
        angleDegrees *
        (
            Math.PI /
            180
        );

    const radius =
        circleRadius.value;

    const x =
        radius *
        Math.sin(
            angleRadians
        );

    const rise =
        radius -
        radius *
        Math.cos(
            angleRadians
        );

    const y =
        wheelOffsetY.value -
        rise;

    const rotation =
        -angleDegrees;

    const relativeDistance =
        Math.abs(
            relativeIndex
        );

    let opacity = 1;

    if (
        relativeDistance >=
        2
    ) {
        opacity = 0;
    } else if (
        relativeDistance >
        1
    ) {
        opacity =
            Math.max(
                0,
                1 -
                (
                    relativeDistance -
                    1
                )
            );
    }

    const fractionalPosition =
        Math.abs(
            relativeIndex +
            (
                wheelAngle.value /
                CARD_ANGLE_GAP
            )
        );

    if (
        fractionalPosition >
        1.65
    ) {
        opacity =
            Math.min(
                opacity,
                Math.max(
                    0,
                    (
                        2 -
                        fractionalPosition
                    ) /
                    0.35
                )
            );
    }

    const zIndex =
        1000 -
        Math.round(
            Math.abs(
                angleDegrees
            ) *
            10
        );

    return {
        transform: [
            'translateX(-50%)',
            `translate3d(${x}px, ${y}px, 0)`,
            `rotate(${rotation}deg)`
        ].join(' '),

        opacity,

        zIndex
    };
}

function goNext() {
    if (
        cardCount.value <= 1
    ) {
        return;
    }

    currentIndex.value =
        circularIndex(
            currentIndex.value + 1
        );

    dragX.value = 0;
}

function goPrevious() {
    if (
        cardCount.value <= 1
    ) {
        return;
    }

    currentIndex.value =
        circularIndex(
            currentIndex.value - 1
        );

    dragX.value = 0;
}

function goTo(index) {
    currentIndex.value =
        circularIndex(index);

    dragX.value = 0;
}

function handleCardClick(
    event,
    item,
    index
) {
    if (
        !isCardVisible(index)
    ) {
        return;
    }

    if (
        hasDragged.value
    ) {
        return;
    }

    if (
        event.target.closest(
            [
                'a',
                'button',
                'input',
                'textarea',
                'select',
                '[data-no-drag]'
            ].join(', ')
        )
    ) {
        return;
    }

    emit(
        'select',
        item
    );
}

function handlePointerDown(event) {
    if (
        event.button !== 0
    ) {
        return;
    }

    if (
        event.target.closest(
            [
                'a',
                'button',
                'input',
                'textarea',
                'select',
                '[data-no-drag]'
            ].join(', ')
        )
    ) {
        return;
    }

    hasDragged.value = false;

    if (
        cardCount.value <= 1
    ) {
        return;
    }

    updateMeasurements();

    isDragging.value = true;

    pointerId.value =
        event.pointerId;

    pointerStartX.value =
        event.clientX;

    previousPointerX.value =
        event.clientX;

    previousPointerTime.value =
        performance.now();

    pointerVelocity.value = 0;

    try {
        event.currentTarget
            ?.setPointerCapture?.(
                event.pointerId
            );
    } catch {
        //
    }
}

function handlePointerMove(event) {
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

    if (
        Math.abs(distance) >
        CLICK_DRAG_THRESHOLD
    ) {
        hasDragged.value = true;
    }

    const maximumDrag =
        cardWidth.value *
        0.95;

    dragX.value =
        Math.max(
            -maximumDrag,
            Math.min(
                maximumDrag,
                distance
            )
        );
}

function handlePointerEnd(event) {
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

    const threshold =
        cardWidth.value *
        0.14;

    const velocityThreshold =
        0.2;

    const shouldMove =
        distance >=
            threshold ||
        Math.abs(
            pointerVelocity.value
        ) >=
            velocityThreshold;

    if (!shouldMove) {
        restoreSlider();

        return;
    }

    const directionValue =
        Math.abs(
            dragX.value
        ) > 5
            ? dragX.value
            : pointerVelocity.value;

    if (
        directionValue <
        0
    ) {
        goNext();
    } else {
        goPrevious();
    }

    restorePointerState();
}

function handlePointerCancel() {
    hasDragged.value = true;

    restoreSlider();
}

function restorePointerState() {
    isDragging.value = false;

    pointerId.value =
        null;

    pointerVelocity.value =
        0;
}

function restoreSlider() {
    restorePointerState();

    dragX.value = 0;
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

function handleResize() {
    updateMeasurements();
}

watch(
    () => props.items,
    () => {
        updateMeasurements();

        currentIndex.value =
            Math.min(
                currentIndex.value,
                Math.max(
                    props.items.length - 1,
                    0
                )
            );
    },
    {
        deep: true
    }
);

onMounted(() => {
    updateMeasurements();

    window.addEventListener(
        'resize',
        handleResize
    );
});

onBeforeUnmount(() => {
    restoreSlider();

    window.removeEventListener(
        'resize',
        handleResize
    );
});
</script>

<template>
    <section
        class="
            relative
            w-full
            overflow-hidden
        "
        :aria-label="ariaLabel"
    >
        <div
            ref="sliderElement"
            tabindex="0"
            class="
                relative
                mx-auto
                w-full
                cursor-grab
                touch-pan-y
                select-none
                outline-none
                transition-[height]
                duration-300
                active:cursor-grabbing
                h-[420px]
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
                    (item, index)
                    in items
                "
                :key="
                    item.id ??
                    index
                "
                data-slider-card
                class="
                    absolute
                    left-1/2
                    top-0

                    w-[72vw]
                    max-w-[27rem]

                    [transform-origin:50%_0%]

                    transition-[transform,opacity]
                    duration-300
                    ease-[cubic-bezier(0.2,0.85,0.25,1)]

                    [backface-visibility:hidden]
                    [will-change:transform,opacity]
                "
                :class="{
                    'transition-none':
                        isDragging ||
                        isRecyclingCard(
                            index
                        ),

                    'pointer-events-none':
                        !isCardVisible(
                            index
                        ),

                    'cursor-pointer':
                        isCardVisible(
                            index
                        )
                }"
                :style="
                    getCardStyle(
                        index
                    )
                "
                :aria-hidden="
                    !isCardVisible(
                        index
                    )
                "
                @click="
                    handleCardClick(
                        $event,
                        item,
                        index
                    )
                "
            >
                <div
                    data-slider-card-content
                    class="
                        w-full
                    "
                    :style="{
                        height: cardHeight
                    }"
                >
                    <Card
                        :item="item"
                        :active="
                            index ===
                            currentIndex
                        "
                        :equal-height="true"
                        :background-image="
                            backgroundImage
                        "
                        :background-color="
                            backgroundColor
                        "
                        :image-scale="
                            imageScale
                        "
                    >
                        <template #default="slotProps">
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
                            />
                        </template>
                    </Card>
                </div>
            </div>
        </div>

        <div
            v-if="
                cardCount > 1
            "
            class="
                mt-5
                hidden
                items-center
                justify-center
                gap-5
                md:flex
            "
        >
            <button
                type="button"
                class="
                    flex
                    h-11
                    w-11
                    cursor-pointer
                    items-center
                    justify-center
                    rounded-full
                    text-baige
                    transition-transform
                    duration-200
                    hover:scale-110
                    active:scale-95
                "
                aria-label="
                    Predchádzajúca karta
                "
                @click="
                    goPrevious
                "
            >
                <i
                    class="
                        bi
                        bi-chevron-left
                        text-lg
                    "
                    aria-hidden="true"
                />
            </button>

            <div
                class="
                    flex
                    items-center
                    justify-center
                    gap-2
                "
            >
                <button
                    v-for="
                        (_, index)
                        in items
                    "
                    :key="index"
                    type="button"
                    class="
                        h-1.5
                        cursor-pointer
                        rounded-full
                        bg-baige/40
                        transition-[width,background-color]
                        duration-200
                    "
                    :class="
                        index ===
                        currentIndex
                            ? 'w-8 bg-baige'
                            : 'w-1.5'
                    "
                    :aria-label="
                        `Zobraziť kartu ${
                            index + 1
                        }`
                    "
                    @click="
                        goTo(index)
                    "
                />
            </div>

            <button
                type="button"
                class="
                    flex
                    h-11
                    w-11
                    cursor-pointer
                    items-center
                    justify-center
                    rounded-full
                    text-baige
                    transition-transform
                    duration-200
                    hover:scale-110
                    active:scale-95
                "
                aria-label="
                    Nasledujúca karta
                "
                @click="
                    goNext
                "
            >
                <i
                    class="
                        bi
                        bi-chevron-right
                        text-lg
                    "
                    aria-hidden="true"
                />
            </button>
        </div>
    </section>
</template>