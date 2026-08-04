<script setup>
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch
} from 'vue';

import Button from './Button.vue';
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

    equalHeight: {
        type: Boolean,
        default: false
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
        default: 0.2
    },

    imageScale: {
        type: Number,
        default: 2.8
    },

    autoPlay: {
        type: Boolean,
        default: true
    },

    autoPlayDelay: {
        type: Number,
        default: 3000
    }
});

const emit = defineEmits([
    'select'
]);

/*
 * =========================================================
 * EASY SLIDER CONTROLS
 * =========================================================
 *
 * Mobile card spacing:
 *
 * 0.50 = very close together
 * 0.60 = close together
 * 0.68 = current setting
 * 0.80 = more space
 * 1.00 = approximately one card width apart
 *
 * Lower mobile.spacing to bring the cards closer.
 */

const SLIDER_SETTINGS = Object.freeze({
    mobile: {
        spacing: 0.8,

        radiusUnder480: 1150,
        radiusUnder768: 1350,

        wheelOffsetUnder480: 28,
        wheelOffsetUnder768: 34,

        minimumAngle: 0
    },

    tablet: {
        gap: 4,
        radius: 1750,
        wheelOffset: 42
    },

    desktop: {
        gap: 18,
        edgePeek: 24
    }
});

/*
 * General behaviour settings
 */

const CLICK_DRAG_THRESHOLD = 8;
const MIN_CARD_WIDTH = 240;

/*
 * Elements and measurements
 */

const sliderElement = ref(null);

const sliderWidth = ref(1024);
const cardWidth = ref(360);
const equalCardHeight = ref(null);

const viewportWidth = ref(
    typeof window !== 'undefined'
        ? window.innerWidth
        : 1024
);

/*
 * Drag state
 */

const dragX = ref(0);
const isDragging = ref(false);
const hasDragged = ref(false);
const pointerId = ref(null);

const pointerStartX = ref(0);
const previousPointerX = ref(0);
const previousPointerTime = ref(0);
const pointerVelocity = ref(0);

/*
 * Autoplay
 */

const isPointerInside = ref(false);
const hasFocusWithin = ref(false);
const prefersReducedMotion = ref(false);

let autoPlayTimer = null;
let reducedMotionMediaQuery = null;

/*
 * Slider position
 */

const virtualIndex = ref(0);
const suppressTransitions = ref(false);

/*
 * Cards which need to move instantly from one
 * side of the circular slider to the other.
 */

const repositioningCards = ref([]);

let repositionFrame = null;
let revealFrame = null;

/*
 * Basic computed values
 */

const cardCount = computed(() => {
    return props.items.length;
});

const renderedItems = computed(() => {
    if (!cardCount.value) {
        return [];
    }

    return props.items.map((item, originalIndex) => {
        return {
            item,
            originalIndex,

            renderKey: `${
                item?.id ??
                item?.slug ??
                originalIndex
            }`
        };
    });
});

const currentIndex = computed(() => {
    return circularIndex(
        virtualIndex.value
    );
});

const isMobile = computed(() => {
    return viewportWidth.value < 768;
});

const isDesktop = computed(() => {
    return viewportWidth.value >= 1024;
});

/*
 * Mobile and tablet:
 * active card + one card on each side.
 *
 * Desktop:
 * active card + two cards on each side.
 */

const visibleSideCount = computed(() => {
    return isDesktop.value
        ? 2
        : 1;
});

/*
 * Circular mobile settings
 */

const circleRadius = computed(() => {
    if (viewportWidth.value < 480) {
        return SLIDER_SETTINGS.mobile.radiusUnder480;
    }

    if (viewportWidth.value < 768) {
        return SLIDER_SETTINGS.mobile.radiusUnder768;
    }

    return SLIDER_SETTINGS.tablet.radius;
});

const wheelOffsetY = computed(() => {
    if (viewportWidth.value < 480) {
        return SLIDER_SETTINGS.mobile.wheelOffsetUnder480;
    }

    if (viewportWidth.value < 768) {
        return SLIDER_SETTINGS.mobile.wheelOffsetUnder768;
    }

    return SLIDER_SETTINGS.tablet.wheelOffset;
});

/*
 * Distance between mobile card centres.
 *
 * On mobile, this is controlled by:
 *
 * SLIDER_SETTINGS.mobile.spacing
 */

const mobileCardStep = computed(() => {
    const measuredWidth = Math.max(
        cardWidth.value,
        MIN_CARD_WIDTH
    );

    if (isMobile.value) {
        return measuredWidth *
            SLIDER_SETTINGS.mobile.spacing;
    }

    return measuredWidth +
        SLIDER_SETTINGS.tablet.gap;
});

const mobileAngleGap = computed(() => {
    const radius = Math.max(
        circleRadius.value,
        1
    );

    const ratio = Math.min(
        mobileCardStep.value /
            (
                radius *
                2
            ),
        0.999
    );

    const calculatedAngle =
        2 *
        Math.asin(
            ratio
        ) *
        (
            180 /
            Math.PI
        );

    return Math.max(
        calculatedAngle,
        SLIDER_SETTINGS.mobile.minimumAngle
    );
});

/*
 * Desktop spacing
 */

const desktopCardStep = computed(() => {
    const measuredWidth = Math.max(
        cardWidth.value,
        MIN_CARD_WIDTH
    );

    const preferredStep =
        measuredWidth +
        SLIDER_SETTINGS.desktop.gap;

    const maximumVisibleStep =
        sliderWidth.value /
            4 +
        measuredWidth /
            4 -
        SLIDER_SETTINGS.desktop.edgePeek /
            2;

    return Math.max(
        measuredWidth,

        Math.min(
            preferredStep,
            maximumVisibleStep
        )
    );
});

/*
 * Drag progress
 *
 * Mobile uses the actual mobile card spacing so
 * the card follows the pointer more naturally.
 */

const dragStep = computed(() => {
    return isDesktop.value
        ? desktopCardStep.value
        : mobileCardStep.value;
});

const dragProgress = computed(() => {
    if (!dragStep.value) {
        return 0;
    }

    return dragX.value /
        dragStep.value;
});

/*
 * Cards are absolutely positioned, so the stage
 * requires an explicit height.
 */

const sliderHeight = computed(() => {
    if (
        props.equalHeight &&
        equalCardHeight.value
    ) {
        const extraSpace = isDesktop.value
            ? 115
            : 85;

        return `${
            equalCardHeight.value +
            extraSpace
        }px`;
    }

    if (isDesktop.value) {
        return '30rem';
    }

    if (viewportWidth.value >= 768) {
        return '30rem';
    }

    return '25rem';
});

/*
 * Index helpers
 */

function circularIndex(index) {
    if (!cardCount.value) {
        return 0;
    }

    return (
        (
            index %
            cardCount.value
        ) +
        cardCount.value
    ) %
        cardCount.value;
}

function middleCopyIndex(originalIndex) {
    return circularIndex(
        originalIndex
    );
}

function initializeVirtualIndex() {
    if (!cardCount.value) {
        virtualIndex.value = 0;

        return;
    }

    virtualIndex.value = middleCopyIndex(
        Math.min(
            Math.max(
                props.initialIndex,
                0
            ),

            cardCount.value -
                1
        )
    );
}

/*
 * Returns the circular position without applying
 * the current drag movement.
 */

function getStaticCardPosition(
    renderIndex,
    activeIndex
) {
    if (!cardCount.value) {
        return 0;
    }

    let delta =
        renderIndex -
        activeIndex;

    const halfCount =
        cardCount.value /
        2;

    if (delta > halfCount) {
        delta -= cardCount.value;
    } else if (delta < -halfCount) {
        delta += cardCount.value;
    }

    return delta;
}

function getCardPosition(renderIndex) {
    return (
        getStaticCardPosition(
            renderIndex,
            currentIndex.value
        ) +
        dragProgress.value
    );
}

function isCardSelectable(renderIndex) {
    return (
        Math.abs(
            getCardPosition(
                renderIndex
            )
        ) <=
        visibleSideCount.value
    );
}

function isCardVisible(renderIndex) {
    const distance = Math.abs(
        getCardPosition(
            renderIndex
        )
    );

    return (
        distance <
        visibleSideCount.value +
            0.8
    );
}

function shouldRenderCard(renderIndex) {
    if (
        cardCount.value <=
        visibleSideCount.value *
            2 +
            3
    ) {
        return true;
    }

    const distance = Math.abs(
        getCardPosition(
            renderIndex
        )
    );

    return (
        distance <=
        visibleSideCount.value +
            1.35
    );
}

/*
 * Circular repositioning
 */

function isCardRepositioning(renderIndex) {
    return repositioningCards.value.includes(
        renderIndex
    );
}

function clearRepositionFrames() {
    if (repositionFrame !== null) {
        window.cancelAnimationFrame(
            repositionFrame
        );

        repositionFrame = null;
    }

    if (revealFrame !== null) {
        window.cancelAnimationFrame(
            revealFrame
        );

        revealFrame = null;
    }
}

function prepareWrappedReposition(
    nextVirtualIndex
) {
    clearRepositionFrames();

    const previousIndex =
        currentIndex.value;

    const nextIndex = circularIndex(
        nextVirtualIndex
    );

    repositioningCards.value = props.items
        .map((_, renderIndex) => {
            const previousPosition =
                getStaticCardPosition(
                    renderIndex,
                    previousIndex
                );

            const nextPosition =
                getStaticCardPosition(
                    renderIndex,
                    nextIndex
                );

            /*
             * Normal movement changes the position
             * by approximately one.
             *
             * A larger change means that this card
             * wrapped from one side to the other.
             */

            if (
                Math.abs(
                    nextPosition -
                    previousPosition
                ) >
                1.5
            ) {
                return renderIndex;
            }

            return null;
        })
        .filter((renderIndex) => {
            return renderIndex !== null;
        });

    if (!repositioningCards.value.length) {
        return;
    }

    /*
     * First frame:
     * move the invisible card immediately.
     *
     * Second frame:
     * reveal it in its new position.
     */

    repositionFrame =
        window.requestAnimationFrame(
            () => {
                repositionFrame = null;

                revealFrame =
                    window.requestAnimationFrame(
                        () => {
                            revealFrame = null;

                            repositioningCards.value =
                                [];
                        }
                    );
            }
        );
}

/*
 * Measurements
 */

function updateMeasurements() {
    if (typeof window !== 'undefined') {
        viewportWidth.value =
            window.innerWidth;
    }

    if (
        sliderElement.value
            ?.clientWidth
    ) {
        sliderWidth.value =
            sliderElement.value.clientWidth;
    }

    const card =
        sliderElement.value
            ?.querySelector(
                '[data-slider-card]'
            );

    if (!card) {
        return;
    }

    const width = card.offsetWidth;

    if (width) {
        cardWidth.value = width;
    }
}

async function updateEqualCardHeight() {
    if (!props.equalHeight) {
        equalCardHeight.value = null;

        return;
    }

    equalCardHeight.value = null;

    await nextTick();

    const cards =
        sliderElement.value
            ?.querySelectorAll(
                '[data-slider-card-content]'
            );

    if (!cards?.length) {
        return;
    }

    const heights = Array.from(
        cards
    ).map((card) => {
        return card.scrollHeight;
    });

    equalCardHeight.value = Math.max(
        ...heights
    );
}

/*
 * Card positioning
 */

function getDesktopCardStyle(renderIndex) {
    const position = getCardPosition(
        renderIndex
    );

    const distance = Math.abs(
        position
    );

    const x =
        desktopCardStep.value *
        position;

    const y =
        64 -
        Math.pow(
            distance,
            1.65
        ) *
            24;

    const rotation =
        position *
        -6.5;

    const scale =
        1 -
        Math.min(
            distance,
            2
        ) *
            0.025;

    let opacity = 1;

    if (distance > 2.05) {
        opacity = Math.max(
            0,

            (
                2.7 -
                distance
            ) /
                0.65
        );
    }

    const zIndex =
        1000 -
        Math.round(
            distance *
            100
        );

    return {
        transform: [
            'translateX(-50%)',

            `translate3d(
                ${x}px,
                ${y}px,
                0
            )`,

            `rotate(
                ${rotation}deg
            )`,

            `scale(
                ${scale}
            )`
        ].join(' '),

        opacity,
        zIndex
    };
}

function getMobileCardStyle(renderIndex) {
    const position = getCardPosition(
        renderIndex
    );

    const angleDegrees =
        position *
        mobileAngleGap.value;

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

    const distance = Math.abs(
        position
    );

    let opacity = 1;

    if (distance > 1.05) {
        opacity = Math.max(
            0,

            (
                1.8 -
                distance
            ) /
                0.75
        );
    }

    const zIndex =
        1000 -
        Math.round(
            distance *
            100
        );

    return {
        transform: [
            'translateX(-50%)',

            `translate3d(
                ${x}px,
                ${y}px,
                0
            )`,

            `rotate(
                ${rotation}deg
            )`
        ].join(' '),

        opacity,
        zIndex
    };
}

function getCardStyle(renderIndex) {
    const style = isDesktop.value
        ? getDesktopCardStyle(
            renderIndex
        )
        : getMobileCardStyle(
            renderIndex
        );

    if (
        !isCardRepositioning(
            renderIndex
        )
    ) {
        return style;
    }

    return {
        ...style,

        opacity: 0,

        pointerEvents:
            'none',

        transitionProperty:
            'none'
    };
}

/*
 * Autoplay
 */

function clearAutoPlayTimer() {
    if (autoPlayTimer === null) {
        return;
    }

    window.clearTimeout(
        autoPlayTimer
    );

    autoPlayTimer = null;
}

function canRunAutoPlay() {
    return (
        props.autoPlay &&
        props.autoPlayDelay > 0 &&
        cardCount.value > 1 &&
        !isDragging.value &&
        !isPointerInside.value &&
        !hasFocusWithin.value &&
        !prefersReducedMotion.value &&
        (
            typeof document ===
                'undefined' ||
            !document.hidden
        )
    );
}

function scheduleAutoPlay() {
    clearAutoPlayTimer();

    if (!canRunAutoPlay()) {
        return;
    }

    const delay = Math.max(
        props.autoPlayDelay,
        500
    );

    autoPlayTimer = window.setTimeout(
        () => {
            autoPlayTimer = null;

            if (!canRunAutoPlay()) {
                scheduleAutoPlay();

                return;
            }

            goNext();
        },
        delay
    );
}

function handleMouseEnter() {
    isPointerInside.value = true;

    clearAutoPlayTimer();
}

function handleMouseLeave() {
    isPointerInside.value = false;

    scheduleAutoPlay();
}

function handleFocusIn() {
    hasFocusWithin.value = true;

    clearAutoPlayTimer();
}

function handleFocusOut(event) {
    if (
        event.currentTarget
            ?.contains(
                event.relatedTarget
            )
    ) {
        return;
    }

    hasFocusWithin.value = false;

    scheduleAutoPlay();
}

function handleVisibilityChange() {
    if (document.hidden) {
        clearAutoPlayTimer();

        return;
    }

    scheduleAutoPlay();
}

function handleReducedMotionChange(event) {
    prefersReducedMotion.value =
        event.matches;

    scheduleAutoPlay();
}

/*
 * Navigation
 */

function moveToVirtualIndex(
    nextVirtualIndex
) {
    if (cardCount.value <= 1) {
        dragX.value = 0;

        return;
    }

    prepareWrappedReposition(
        nextVirtualIndex
    );

    suppressTransitions.value = false;

    virtualIndex.value =
        nextVirtualIndex;

    dragX.value = 0;
}

function goNext() {
    moveToVirtualIndex(
        virtualIndex.value +
            1
    );

    scheduleAutoPlay();
}

function goPrevious() {
    moveToVirtualIndex(
        virtualIndex.value -
            1
    );

    scheduleAutoPlay();
}

function goTo(originalIndex) {
    if (cardCount.value <= 1) {
        return;
    }

    const normalizedTarget =
        circularIndex(
            originalIndex
        );

    const currentOriginalIndex =
        currentIndex.value;

    const forwardDistance =
        (
            normalizedTarget -
            currentOriginalIndex +
            cardCount.value
        ) %
        cardCount.value;

    const backwardDistance =
        (
            currentOriginalIndex -
            normalizedTarget +
            cardCount.value
        ) %
        cardCount.value;

    const targetVirtualIndex =
        forwardDistance <=
        backwardDistance
            ? virtualIndex.value +
                forwardDistance
            : virtualIndex.value -
                backwardDistance;

    moveToVirtualIndex(
        targetVirtualIndex
    );

    scheduleAutoPlay();
}

/*
 * Card selection
 */

function handleCardClick(
    event,
    renderedItem,
    renderIndex
) {
    if (
        !isCardSelectable(
            renderIndex
        )
    ) {
        return;
    }

    if (hasDragged.value) {
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
        renderedItem.item
    );
}

/*
 * Drag
 */

function handlePointerDown(event) {
    if (event.button !== 0) {
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

    if (cardCount.value <= 1) {
        return;
    }

    updateMeasurements();
    clearAutoPlayTimer();

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

    const elapsed = Math.max(
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
        Math.abs(
            distance
        ) >
        CLICK_DRAG_THRESHOLD
    ) {
        hasDragged.value = true;
    }

    const maximumDrag =
        dragStep.value *
        0.95;

    dragX.value = Math.max(
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

    const distance = Math.abs(
        dragX.value
    );

    const threshold =
        dragStep.value *
        0.14;

    const velocityThreshold = 0.2;

    const shouldMove =
        distance >= threshold ||
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
        ) >
        5
            ? dragX.value
            : pointerVelocity.value;

    restorePointerState();

    if (directionValue < 0) {
        goNext();
    } else {
        goPrevious();
    }
}

function handlePointerCancel() {
    hasDragged.value = true;

    restoreSlider();
}

function restorePointerState() {
    isDragging.value = false;
    pointerId.value = null;
    pointerVelocity.value = 0;
}

function restoreSlider() {
    restorePointerState();

    dragX.value = 0;

    scheduleAutoPlay();
}

/*
 * Keyboard
 */

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

/*
 * Resize
 */

async function handleResize() {
    updateMeasurements();

    await updateEqualCardHeight();
}

/*
 * Watchers
 */

watch(
    () => props.items,

    async () => {
        clearRepositionFrames();

        repositioningCards.value = [];
        suppressTransitions.value = true;

        initializeVirtualIndex();

        await nextTick();
        await updateEqualCardHeight();

        updateMeasurements();

        window.requestAnimationFrame(
            () => {
                suppressTransitions.value =
                    false;

                scheduleAutoPlay();
            }
        );
    },

    {
        deep: true
    }
);

watch(
    () => props.equalHeight,

    async () => {
        await updateEqualCardHeight();
    }
);

watch(
    [
        () => props.autoPlay,
        () => props.autoPlayDelay,
        () => cardCount.value
    ],

    () => {
        scheduleAutoPlay();
    }
);

/*
 * Lifecycle
 */

onMounted(async () => {
    initializeVirtualIndex();

    await nextTick();

    updateMeasurements();

    await updateEqualCardHeight();

    reducedMotionMediaQuery =
        window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        );

    prefersReducedMotion.value =
        reducedMotionMediaQuery.matches;

    if (
        typeof reducedMotionMediaQuery
            .addEventListener ===
        'function'
    ) {
        reducedMotionMediaQuery
            .addEventListener(
                'change',
                handleReducedMotionChange
            );
    } else {
        reducedMotionMediaQuery
            .addListener?.(
                handleReducedMotionChange
            );
    }

    document.addEventListener(
        'visibilitychange',
        handleVisibilityChange
    );

    window.addEventListener(
        'resize',
        handleResize
    );

    scheduleAutoPlay();
});

onBeforeUnmount(() => {
    clearAutoPlayTimer();
    clearRepositionFrames();

    repositioningCards.value = [];

    restorePointerState();

    dragX.value = 0;

    if (
        typeof reducedMotionMediaQuery
            ?.removeEventListener ===
        'function'
    ) {
        reducedMotionMediaQuery
            .removeEventListener(
                'change',
                handleReducedMotionChange
            );
    } else {
        reducedMotionMediaQuery
            ?.removeListener?.(
                handleReducedMotionChange
            );
    }

    document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
    );

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
            overflow-x-clip
            overflow-y-visible

            lg:overflow-visible
        "
        :aria-label="
            ariaLabel
        "
        @mouseenter="
            handleMouseEnter
        "
        @mouseleave="
            handleMouseLeave
        "
        @focusin="
            handleFocusIn
        "
        @focusout="
            handleFocusOut
        "
    >
        <!-- Slider stage -->
        <div
            ref="
                sliderElement
            "
            tabindex="0"
            class="
                relative
                mx-auto
                w-full
                cursor-grab
                touch-pan-y
                select-none
                overflow-visible
                outline-none
                transition-[height]
                duration-300

                active:cursor-grabbing
            "
            :style="{
                height:
                    sliderHeight
            }"
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
            <template
                v-for="
                    renderedItem in
                    renderedItems
                "
                :key="
                    renderedItem.renderKey
                "
            >
                <div
                    v-if="
                        shouldRenderCard(
                            renderedItem.originalIndex
                        )
                    "
                    data-slider-card
                    class="
                        absolute
                        left-1/2
                        top-0
                        w-[min(72vw,18rem)]
                        min-w-[15rem]
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
                            suppressTransitions,

                        'pointer-events-none':
                            !isCardSelectable(
                                renderedItem.originalIndex
                            ) ||
                            isCardRepositioning(
                                renderedItem.originalIndex
                            ),

                        'cursor-pointer':
                            isCardSelectable(
                                renderedItem.originalIndex
                            ) &&
                            !isCardRepositioning(
                                renderedItem.originalIndex
                            )
                    }"
                    :style="
                        getCardStyle(
                            renderedItem.originalIndex
                        )
                    "
                    :aria-hidden="
                        !isCardVisible(
                            renderedItem.originalIndex
                        ) ||
                        isCardRepositioning(
                            renderedItem.originalIndex
                        )
                    "
                    @click="
                        handleCardClick(
                            $event,
                            renderedItem,
                            renderedItem.originalIndex
                        )
                    "
                >
                    <div
                        data-slider-card-content
                        :style="{
                            height:
                                equalHeight &&
                                equalCardHeight
                                    ? `${equalCardHeight}px`
                                    : 'auto'
                        }"
                    >
                        <Card
                            :item="
                                renderedItem.item
                            "
                            :active="
                                renderedItem.originalIndex ===
                                currentIndex
                            "
                            :equal-height="
                                equalHeight
                            "
                            :background-image="
                                backgroundImage
                            "
                            :background-color="
                                backgroundColor
                            "
                            :image-opacity="
                                imageOpacity
                            "
                            :image-scale="
                                imageScale
                            "
                        >
                            <template
                                #default="
                                    slotProps
                                "
                            >
                                <slot
                                    name="card"
                                    :item="
                                        slotProps.item
                                    "
                                    :index="
                                        renderedItem.originalIndex
                                    "
                                    :active="
                                        slotProps.active
                                    "
                                />
                            </template>
                        </Card>
                    </div>
                </div>
            </template>
        </div>

        <!-- Desktop controls -->
        <div
            v-if="
                cardCount >
                1
            "
            class="
                hidden
                w-full
                items-center
                justify-center

                md:flex
            "
        >
            <div
                class="
                    mx-auto
                    flex
                    items-center
                    justify-center
                    gap-3
                    px-10
                "
            >
                <!-- Previous -->
                <Button
                    type="button"
                    background-image=""
                    background-color=""
                    text-color="#FBF9F3"
                    aria-label="Predchádzajúca karta"
                    class="
                        flex
                        size-11
                        min-h-0
                        min-w-0
                        shrink-0
                        items-center
                        justify-center
                        p-0
                    "
                    @click="
                        goPrevious
                    "
                >
                    <i
                        class="
                            bi
                            bi-arrow-left
                            text-base
                        "
                        aria-hidden="true"
                    />
                </Button>

                <!-- Indicators -->
                <div
                    class="
                        flex
                        min-w-20
                        items-center
                        justify-center
                        gap-2
                    "
                    role="tablist"
                    aria-label="Výber služby"
                >
                    <button
                        v-for="
                            (
                                _,
                                index
                            ) in
                            items
                        "
                        :key="
                            index
                        "
                        type="button"
                        class="
                            h-[2px]
                            cursor-pointer
                            rounded-full
                            bg-baige/50
                            transition-[width,background-color,transform]
                            duration-300
                            ease-[cubic-bezier(0.22,1,0.36,1)]

                            hover:scale-110
                            hover:bg-baige/65

                            focus-visible:outline
                            focus-visible:outline-2
                            focus-visible:outline-offset-4
                            focus-visible:outline-baige/70
                        "
                        :class="
                            index ===
                            currentIndex
                                ? 'w-8 bg-baige'
                                : 'w-1.5'
                        "
                        :aria-label="
                            `Zobraziť kartu ${
                                index +
                                1
                            }`
                        "
                        :aria-selected="
                            index ===
                            currentIndex
                        "
                        role="tab"
                        @click="
                            goTo(
                                index
                            )
                        "
                    />
                </div>

                <!-- Next -->
                <Button
                    type="button"
                    background-image=""
                    background-color=""
                    text-color="#FBF9F3"
                    aria-label="Nasledujúca karta"
                    class="
                        flex
                        size-11
                        min-h-0
                        min-w-0
                        shrink-0
                        items-center
                        justify-center
                        p-0
                    "
                    @click="
                        goNext
                    "
                >
                    <i
                        class="
                            bi
                            bi-arrow-right
                            text-base
                        "
                        aria-hidden="true"
                    />
                </Button>
            </div>
        </div>
    </section>
</template>