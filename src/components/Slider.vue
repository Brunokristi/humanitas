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

const sliderElement =
    ref(null);

const sliderWidth =
    ref(1024);

const cardWidth =
    ref(360);

const equalCardHeight =
    ref(null);

const viewportWidth = ref(
    typeof window !== 'undefined'
        ? window.innerWidth
        : 1024
);

const dragX =
    ref(0);

const isDragging =
    ref(false);

const hasDragged =
    ref(false);

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

/*
 * We render three copies of every card.
 *
 * The active card starts inside the middle
 * copy. This allows cards to move continuously
 * in both directions without visibly jumping
 * from the back to the front.
 */

const virtualIndex =
    ref(0);

const suppressTransitions =
    ref(false);

const CARD_ANGLE_GAP =
    14;

const CLICK_DRAG_THRESHOLD =
    8;

const MIN_CARD_WIDTH =
    240;

const MOBILE_CARD_GAP =
    14;

const TABLET_CARD_GAP =
    20;

const DESKTOP_CARD_GAP =
    18;

const DESKTOP_EDGE_PEEK =
    24;

const TRANSITION_DURATION =
    300;

const cardCount = computed(() => {
    return props.items.length;
});

const renderedItems = computed(() => {
    if (!cardCount.value) {
        return [];
    }

    return props.items.map(
        (
            item,
            originalIndex
        ) => {
            return {
                item,
                originalIndex,
                renderKey:
                    `${
                        item?.id ??
                        item?.slug ??
                        originalIndex
                    }`
            };
        }
    );
});

const currentIndex = computed(() => {
    return circularIndex(
        virtualIndex.value
    );
});

const isMobile = computed(() => {
    return (
        viewportWidth.value <
        768
    );
});

const isDesktop = computed(() => {
    return (
        viewportWidth.value >=
        1024
    );
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

const dragProgress = computed(() => {
    if (!cardWidth.value) {
        return 0;
    }

    return (
        dragX.value /
        cardWidth.value
    );
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

const mobileCardStep = computed(() => {
    const gap =
        viewportWidth.value >= 768
            ? TABLET_CARD_GAP
            : MOBILE_CARD_GAP;

    const measuredWidth =
        Math.max(
            cardWidth.value,
            MIN_CARD_WIDTH
        );

    return Math.max(
        measuredWidth + gap,
        MIN_CARD_WIDTH + gap
    );
});

const mobileAngleGap = computed(() => {
    const radius = Math.max(
        circleRadius.value,
        1
    );

    const ratio = Math.min(
        mobileCardStep.value /
            (radius * 2),
        0.999
    );

    const calculatedAngle =
        2 *
        Math.asin(ratio) *
        (
            180 /
            Math.PI
        );

    return Math.max(
        calculatedAngle,
        CARD_ANGLE_GAP * 0.85
    );
});

/*
 * Desktop spacing.
 *
 * The previous value was 1.08 times the
 * card width. A larger multiplier creates
 * more breathing room between cards.
 */

const desktopCardStep = computed(() => {
    const measuredWidth =
        Math.max(
            cardWidth.value,
            MIN_CARD_WIDTH
        );

    const preferredStep =
        measuredWidth +
        DESKTOP_CARD_GAP;

    const maximumVisibleStep =
        sliderWidth.value /
            4 +
        measuredWidth /
            4 -
        DESKTOP_EDGE_PEEK /
            2;

    return Math.max(
        measuredWidth,
        Math.min(
            preferredStep,
            maximumVisibleStep
        )
    );
});

const sliderHeight = computed(() => {
    if (
        props.equalHeight &&
        equalCardHeight.value
    ) {
        const extraSpace =
            isDesktop.value
                ? 115
                : 85;

        return `${
            equalCardHeight.value +
            extraSpace
        }px`;
    }

    if (
        isDesktop.value
    ) {
        return '32rem';
    }

    return isMobile.value
        ? '25rem'
        : '36rem';
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

function middleCopyIndex(
    originalIndex
) {
    return circularIndex(
        originalIndex
    );
}

function initializeVirtualIndex() {
    if (!cardCount.value) {
        virtualIndex.value =
            0;

        return;
    }

    virtualIndex.value =
        middleCopyIndex(
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

function getCardPosition(
    renderIndex
) {
    const currentOriginalIndex =
        currentIndex.value;

    let delta =
        renderIndex -
        currentOriginalIndex;

    const halfCount =
        cardCount.value / 2;

    if (
        delta >
        halfCount
    ) {
        delta -=
            cardCount.value;
    } else if (
        delta <
        -halfCount
    ) {
        delta +=
            cardCount.value;
    }

    return (
        delta +
        dragProgress.value
    );
}

function isCardSelectable(
    renderIndex
) {
    return (
        Math.abs(
            getCardPosition(
                renderIndex
            )
        ) <=
        visibleSideCount.value
    );
}

function isCardVisible(
    renderIndex
) {
    const distance =
        Math.abs(
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

function shouldRenderCard(
    renderIndex
) {
    if (
        cardCount.value <=
        visibleSideCount.value *
            2 +
            3
    ) {
        return true;
    }

    const distance =
        Math.abs(
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
 * Measurements
 */

function updateMeasurements() {
    if (
        typeof window !==
        'undefined'
    ) {
        viewportWidth.value =
            window.innerWidth;
    }

    if (
        sliderElement.value
            ?.clientWidth
    ) {
        sliderWidth.value =
            sliderElement.value
                .clientWidth;
    }

    const card =
        sliderElement.value
            ?.querySelector(
                '[data-slider-card]'
            );

    if (!card) {
        return;
    }

    const width =
        card.offsetWidth;

    if (width) {
        cardWidth.value =
            width;
    }
}

async function updateEqualCardHeight() {
    if (
        !props.equalHeight
    ) {
        equalCardHeight.value =
            null;

        return;
    }

    equalCardHeight.value =
        null;

    await nextTick();

    const cards =
        sliderElement.value
            ?.querySelectorAll(
                '[data-slider-card-content]'
            );

    if (
        !cards?.length
    ) {
        return;
    }

    const heights =
        Array.from(
            cards
        ).map((card) => {
            return card.scrollHeight;
        });

    equalCardHeight.value =
        Math.max(
            ...heights
        );
}

/*
 * Card positioning
 */

function getDesktopCardStyle(
    renderIndex
) {
    const position =
        getCardPosition(
            renderIndex
        );

    const distance =
        Math.abs(
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

    let opacity =
        1;

    if (
        distance >
        2.05
    ) {
        opacity =
            Math.max(
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
            `translate3d(${x}px, ${y}px, 0)`,
            `rotate(${rotation}deg)`,
            `scale(${scale})`
        ].join(' '),

        opacity,

        zIndex
    };
}

function getMobileCardStyle(
    renderIndex
) {
    const position =
        getCardPosition(
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

    const distance =
        Math.abs(
            position
        );

    let opacity =
        1;

    if (
        distance >
        1.05
    ) {
        opacity =
            Math.max(
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
            `translate3d(${x}px, ${y}px, 0)`,
            `rotate(${rotation}deg)`
        ].join(' '),

        opacity,

        zIndex
    };
}

function getCardStyle(
    renderIndex
) {
    if (
        isDesktop.value
    ) {
        return getDesktopCardStyle(
            renderIndex
        );
    }

    return getMobileCardStyle(
        renderIndex
    );
}

/*
 * Navigation
 */

function moveToVirtualIndex(
    nextVirtualIndex
) {
    if (
        cardCount.value <=
        1
    ) {
        dragX.value =
            0;

        return;
    }

    suppressTransitions.value =
        false;

    virtualIndex.value =
        nextVirtualIndex;

    dragX.value =
        0;
}

function goNext() {
    moveToVirtualIndex(
        virtualIndex.value +
            1
    );
}

function goPrevious() {
    moveToVirtualIndex(
        virtualIndex.value -
            1
    );
}

function goTo(
    originalIndex
) {
    if (
        cardCount.value <=
        1
    ) {
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
        renderedItem.item
    );
}

/*
 * Drag
 */

function handlePointerDown(
    event
) {
    if (
        event.button !==
        0
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

    hasDragged.value =
        false;

    if (
        cardCount.value <=
        1
    ) {
        return;
    }

    updateMeasurements();

    isDragging.value =
        true;

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

    if (
        Math.abs(
            distance
        ) >
        CLICK_DRAG_THRESHOLD
    ) {
        hasDragged.value =
            true;
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

    if (
        !shouldMove
    ) {
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

    if (
        directionValue <
        0
    ) {
        goNext();
    } else {
        goPrevious();
    }
}

function handlePointerCancel() {
    hasDragged.value =
        true;

    restoreSlider();
}

function restorePointerState() {
    isDragging.value =
        false;

    pointerId.value =
        null;

    pointerVelocity.value =
        0;
}

function restoreSlider() {
    restorePointerState();

    dragX.value =
        0;
}

/*
 * Keyboard
 */

function handleKeydown(
    event
) {
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
        suppressTransitions.value =
            true;

        initializeVirtualIndex();

        await nextTick();

        await updateEqualCardHeight();

        updateMeasurements();

        window.requestAnimationFrame(
            () => {
                suppressTransitions.value =
                    false;
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

/*
 * Lifecycle
 */

onMounted(async () => {
    initializeVirtualIndex();

    await nextTick();

    updateMeasurements();

    await updateEqualCardHeight();

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
            overflow-x-clip
            overflow-y-visible

            lg:overflow-visible
        "
        :aria-label="
            ariaLabel
        "
    >
        <!-- Slider stage -->
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
                        ),

                    'cursor-pointer':
                        isCardSelectable(
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
                        :image-scale="
                            imageScale
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
                cardCount > 1
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