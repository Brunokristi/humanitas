<script setup>
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
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
        default: 'Posuvník'
    },

    mode: {
        type: String,
        default: 'circular',

        validator(value) {
            return [
                'circular',
                'linear'
            ].includes(
                value
            );
        }
    },

    infinite: {
        type: Boolean,
        default: true
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

    scrollMotion: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits([
    'select'
]);

/*
|--------------------------------------------------------------------------
| Motion
|--------------------------------------------------------------------------
*/

const scrollMotionEnabled =
    computed(() => {
        return props.scrollMotion;
    });

const {
    motionRoot
} = useScrollMotion({
    enabled:
        scrollMotionEnabled,

    disableOnCoarsePointer:
        false
});

/*
|--------------------------------------------------------------------------
| Settings
|--------------------------------------------------------------------------
*/

const SLIDER_SETTINGS =
    Object.freeze({
        mobile: {
            spacing:
                1,

            radiusUnder480:
                1150,

            radiusUnder768:
                1350,

            wheelOffsetUnder480:
                28,

            wheelOffsetUnder768:
                34,

            minimumAngle:
                0
        },

        tablet: {
            gap:
                4,

            radius:
                1750,

            wheelOffset:
                42
        },

        desktop: {
            gap:
                18,

            edgePeek:
                24
        },

        linear: {
            mobileGap:
                12,

            desktopGap:
                28
        }
    });

const CLICK_DRAG_THRESHOLD =
    8;

const MIN_CARD_WIDTH =
    240;

const COPY_COUNT =
    9;

const MIDDLE_COPY_INDEX =
    Math.floor(
        COPY_COUNT / 2
    );

const SETTLE_DURATION_MS =
    700;

/*
|--------------------------------------------------------------------------
| Elements
|--------------------------------------------------------------------------
*/

const sliderElement =
    ref(null);

const sliderWidth =
    ref(1024);

const cardWidth =
    ref(360);

const equalCardHeight =
    ref(null);

const viewportWidth =
    ref(
        typeof window !==
            'undefined'
            ? window.innerWidth
            : 1024
    );

let resizeFrame =
    null;

let settleTimer =
    null;

let lastViewportWidth =
    typeof window !==
        'undefined'
        ? window.innerWidth
        : 1024;

/*
|--------------------------------------------------------------------------
| Drag
|--------------------------------------------------------------------------
*/

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

let suppressClickUntil =
    0;

/*
|--------------------------------------------------------------------------
| Position
|--------------------------------------------------------------------------
*/

const virtualIndex =
    ref(0);

const suppressTransitions =
    ref(true);

const cardCount = computed(() => {
    return props.items.length;
});

const isInfinite = computed(() => {
    return (
        props.infinite &&
        cardCount.value > 1
    );
});

const isLinear = computed(() => {
    return (
        props.mode ===
        'linear'
    );
});

const renderedItems = computed(() => {
    if (!cardCount.value) {
        return [];
    }

    /*
     * Finite mode:
     * render exactly one copy.
     */
    if (!isInfinite.value) {
        return props.items.map(
            (
                item,
                originalIndex
            ) => {
                return {
                    item,
                    originalIndex,

                    copyIndex:
                        0,

                    renderedIndex:
                        originalIndex,

                    renderKey:
                        `finite-${
                            item?.id ??
                            item?.slug ??
                            item?.name ??
                            originalIndex
                        }`
                };
            }
        );
    }

    /*
     * Infinite mode:
     * permanent repeated copies.
     */
    const result =
        [];

    for (
        let copyIndex = 0;
        copyIndex < COPY_COUNT;
        copyIndex += 1
    ) {
        props.items.forEach(
            (
                item,
                originalIndex
            ) => {
                const renderedIndex =
                    copyIndex *
                        cardCount.value +
                    originalIndex;

                result.push({
                    item,
                    originalIndex,
                    copyIndex,
                    renderedIndex,

                    renderKey:
                        `${copyIndex}-${
                            item?.id ??
                            item?.slug ??
                            item?.name ??
                            originalIndex
                        }`
                });
            }
        );
    }

    return result;
});

const totalRenderedCardCount =
    computed(() => {
        return renderedItems.value.length;
    });

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

function clampIndex(index) {
    return Math.min(
        Math.max(
            index,
            0
        ),
        Math.max(
            cardCount.value -
                1,
            0
        )
    );
}

const currentIndex = computed(() => {
    if (isInfinite.value) {
        return circularIndex(
            virtualIndex.value
        );
    }

    return clampIndex(
        virtualIndex.value
    );
});

const canGoPrevious =
    computed(() => {
        if (
            cardCount.value <=
            1
        ) {
            return false;
        }

        if (isInfinite.value) {
            return true;
        }

        return (
            currentIndex.value >
            0
        );
    });

const canGoNext =
    computed(() => {
        if (
            cardCount.value <=
            1
        ) {
            return false;
        }

        if (isInfinite.value) {
            return true;
        }

        return (
            currentIndex.value <
            cardCount.value -
                1
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

const visibleSideCount =
    computed(() => {
        return isDesktop.value
            ? 2
            : 1;
    });

function initializeVirtualIndex() {
    if (!cardCount.value) {
        virtualIndex.value =
            0;

        return;
    }

    const initialIndex =
        clampIndex(
            props.initialIndex
        );

    if (!isInfinite.value) {
        virtualIndex.value =
            initialIndex;

        return;
    }

    virtualIndex.value =
        MIDDLE_COPY_INDEX *
            cardCount.value +
        initialIndex;
}

/*
|--------------------------------------------------------------------------
| Circular geometry
|--------------------------------------------------------------------------
*/

const circleRadius = computed(() => {
    if (
        viewportWidth.value <
        480
    ) {
        return (
            SLIDER_SETTINGS.mobile
                .radiusUnder480
        );
    }

    if (
        viewportWidth.value <
        768
    ) {
        return (
            SLIDER_SETTINGS.mobile
                .radiusUnder768
        );
    }

    return (
        SLIDER_SETTINGS.tablet
            .radius
    );
});

const wheelOffsetY = computed(() => {
    if (
        viewportWidth.value <
        480
    ) {
        return (
            SLIDER_SETTINGS.mobile
                .wheelOffsetUnder480
        );
    }

    if (
        viewportWidth.value <
        768
    ) {
        return (
            SLIDER_SETTINGS.mobile
                .wheelOffsetUnder768
        );
    }

    return (
        SLIDER_SETTINGS.tablet
            .wheelOffset
    );
});

const mobileCardStep =
    computed(() => {
        const measuredWidth =
            Math.max(
                cardWidth.value,
                MIN_CARD_WIDTH
            );

        if (isMobile.value) {
            return (
                measuredWidth *
                SLIDER_SETTINGS.mobile
                    .spacing
            );
        }

        return (
            measuredWidth +
            SLIDER_SETTINGS.tablet
                .gap
        );
    });

const mobileAngleGap =
    computed(() => {
        const radius =
            Math.max(
                circleRadius.value,
                1
            );

        const ratio =
            Math.min(
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
            SLIDER_SETTINGS.mobile
                .minimumAngle
        );
    });

const desktopCardStep =
    computed(() => {
        const measuredWidth =
            Math.max(
                cardWidth.value,
                MIN_CARD_WIDTH
            );

        const preferredStep =
            measuredWidth +
            SLIDER_SETTINGS.desktop
                .gap;

        const maximumVisibleStep =
            sliderWidth.value /
                4 +
            measuredWidth /
                4 -
            SLIDER_SETTINGS.desktop
                .edgePeek /
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
|--------------------------------------------------------------------------
| Linear geometry
|--------------------------------------------------------------------------
*/

const linearCardStep =
    computed(() => {
        const measuredWidth =
            Math.max(
                cardWidth.value,
                MIN_CARD_WIDTH
            );

        const gap =
            isDesktop.value
                ? SLIDER_SETTINGS.linear
                    .desktopGap
                : SLIDER_SETTINGS.linear
                    .mobileGap;

        return (
            measuredWidth +
            gap
        );
    });

const dragStep = computed(() => {
    if (isLinear.value) {
        return (
            linearCardStep.value
        );
    }

    return isDesktop.value
        ? desktopCardStep.value
        : mobileCardStep.value;
});

const dragProgress =
    computed(() => {
        if (!dragStep.value) {
            return 0;
        }

        return (
            dragX.value /
            dragStep.value
        );
    });

/*
|--------------------------------------------------------------------------
| Height
|--------------------------------------------------------------------------
*/

const sliderHeight = computed(() => {
    if (
        props.equalHeight &&
        equalCardHeight.value
    ) {
        const extraSpace =
            isLinear.value
                ? 50
                : isDesktop.value
                    ? 90
                    : 85;

        return `${
            equalCardHeight.value +
            extraSpace
        }px`;
    }

    if (
        viewportWidth.value >=
        768
    ) {
        return isLinear.value
            ? '25rem'
            : '28rem';
    }

    return '25rem';
});

/*
|--------------------------------------------------------------------------
| Card position
|--------------------------------------------------------------------------
*/

function getCardPosition(
    renderedIndex
) {
    return (
        renderedIndex -
        virtualIndex.value +
        dragProgress.value
    );
}

function isCardSelectable(
    renderedIndex
) {
    const position =
        getCardPosition(
            renderedIndex
        );

    if (isLinear.value) {
        return (
            position >=
                -0.25 &&
            position <=
                visibleSideCount.value +
                    1
        );
    }

    return (
        Math.abs(
            position
        ) <=
        visibleSideCount.value
    );
}

function isCardVisible(
    renderedIndex
) {
    const position =
        getCardPosition(
            renderedIndex
        );

    if (isLinear.value) {
        return (
            position >
                -1.5 &&
            position <
                visibleSideCount.value +
                    2.5
        );
    }

    return (
        Math.abs(
            position
        ) <
        visibleSideCount.value +
            1.5
    );
}

/*
|--------------------------------------------------------------------------
| Circular desktop
|--------------------------------------------------------------------------
*/

function getDesktopCircularCardStyle(
    renderedIndex
) {
    const position =
        getCardPosition(
            renderedIndex
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
            Math.min(
                distance,
                4
            ),
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
            3
        ) *
            0.025;

    let opacity =
        1;

    if (
        distance >
        2.25
    ) {
        opacity =
            Math.max(
                0,
                Math.min(
                    1,
                    (
                        3.75 -
                        distance
                    ) /
                        1.5
                )
            );
    }

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

        zIndex:
            1000 -
            Math.round(
                distance *
                100
            ),

        pointerEvents:
            opacity <= 0
                ? 'none'
                : undefined
    };
}

/*
|--------------------------------------------------------------------------
| Circular mobile
|--------------------------------------------------------------------------
*/

function getMobileCircularCardStyle(
    renderedIndex
) {
    const position =
        getCardPosition(
            renderedIndex
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
        1
    ) {
        opacity =
            Math.max(
                0,
                Math.min(
                    1,
                    2 -
                        distance
                )
            );
    }

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

        zIndex:
            1000 -
            Math.round(
                distance *
                100
            ),

        pointerEvents:
            opacity <= 0
                ? 'none'
                : undefined
    };
}

/*
|--------------------------------------------------------------------------
| Linear
|--------------------------------------------------------------------------
*/

function getLinearCardStyle(
    renderedIndex
) {
    const position =
        getCardPosition(
            renderedIndex
        );

    const x =
        linearCardStep.value *
        position;

    /*
     * Cards behind the left edge fade quickly.
     * Cards approaching from the right remain
     * visible naturally.
     */
    let opacity =
        1;

    if (
        position <
        -0.15
    ) {
        opacity =
            Math.max(
                0,
                1 +
                    position
            );
    }

    const rightFadeStart =
        visibleSideCount.value +
        1.4;

    const rightFadeEnd =
        visibleSideCount.value +
        2.25;

    if (
        position >
        rightFadeStart
    ) {
        opacity =
            Math.min(
                opacity,

                Math.max(
                    0,
                    (
                        rightFadeEnd -
                        position
                    ) /
                        (
                            rightFadeEnd -
                            rightFadeStart
                        )
                )
            );
    }

    return {
        transform:
            `translate3d(
                ${x}px,
                0,
                0
            )`,

        opacity,

        zIndex:
            1000,

        pointerEvents:
            opacity <= 0
                ? 'none'
                : undefined
    };
}

function getCardStyle(
    renderedIndex
) {
    if (isLinear.value) {
        return getLinearCardStyle(
            renderedIndex
        );
    }

    if (isDesktop.value) {
        return getDesktopCircularCardStyle(
            renderedIndex
        );
    }

    return getMobileCircularCardStyle(
        renderedIndex
    );
}

/*
|--------------------------------------------------------------------------
| Measurements
|--------------------------------------------------------------------------
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
    if (!props.equalHeight) {
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

    if (!cards?.length) {
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
|--------------------------------------------------------------------------
| Infinite recenter
|--------------------------------------------------------------------------
*/

function clearSettleTimer() {
    if (
        settleTimer ===
        null
    ) {
        return;
    }

    window.clearTimeout(
        settleTimer
    );

    settleTimer =
        null;
}

function isVirtualIndexNearEdge() {
    if (
        !isInfinite.value ||
        !cardCount.value
    ) {
        return false;
    }

    const minimumSafeIndex =
        cardCount.value *
        2;

    const maximumSafeIndex =
        totalRenderedCardCount.value -
        cardCount.value *
            2 -
        1;

    return (
        virtualIndex.value <
            minimumSafeIndex ||
        virtualIndex.value >
            maximumSafeIndex
    );
}

async function recenterVirtualIndex() {
    if (
        !isVirtualIndexNearEdge()
    ) {
        return;
    }

    const centeredIndex =
        MIDDLE_COPY_INDEX *
            cardCount.value +
        currentIndex.value;

    suppressTransitions.value =
        true;

    virtualIndex.value =
        centeredIndex;

    await nextTick();

    window.requestAnimationFrame(
        () => {
            window.requestAnimationFrame(
                () => {
                    suppressTransitions.value =
                        false;
                }
            );
        }
    );
}

function scheduleRecentering() {
    clearSettleTimer();

    if (
        !isVirtualIndexNearEdge()
    ) {
        return;
    }

    settleTimer =
        window.setTimeout(
            async () => {
                settleTimer =
                    null;

                await recenterVirtualIndex();
            },
            SETTLE_DURATION_MS +
                40
        );
}

/*
|--------------------------------------------------------------------------
| Navigation
|--------------------------------------------------------------------------
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

    const resolvedIndex =
        isInfinite.value
            ? nextVirtualIndex
            : clampIndex(
                nextVirtualIndex
            );

    suppressTransitions.value =
        false;

    virtualIndex.value =
        resolvedIndex;

    dragX.value =
        0;

    scheduleRecentering();
}

function goNext() {
    if (!canGoNext.value) {
        return;
    }

    moveToVirtualIndex(
        virtualIndex.value +
            1
    );
}

function goPrevious() {
    if (!canGoPrevious.value) {
        return;
    }

    moveToVirtualIndex(
        virtualIndex.value -
            1
    );
}

function goTo(originalIndex) {
    if (
        cardCount.value <=
        1
    ) {
        return;
    }

    const targetIndex =
        clampIndex(
            originalIndex
        );

    if (!isInfinite.value) {
        moveToVirtualIndex(
            targetIndex
        );

        return;
    }

    const normalizedTarget =
        circularIndex(
            targetIndex
        );

    const forwardDistance =
        (
            normalizedTarget -
            currentIndex.value +
            cardCount.value
        ) %
        cardCount.value;

    const backwardDistance =
        (
            currentIndex.value -
            normalizedTarget +
            cardCount.value
        ) %
        cardCount.value;

    if (
        forwardDistance <=
        backwardDistance
    ) {
        moveToVirtualIndex(
            virtualIndex.value +
                forwardDistance
        );

        return;
    }

    moveToVirtualIndex(
        virtualIndex.value -
            backwardDistance
    );
}

/*
|--------------------------------------------------------------------------
| Selection
|--------------------------------------------------------------------------
*/

function handleCardClick(
    event,
    renderedItem
) {
    if (
        !isCardSelectable(
            renderedItem.renderedIndex
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
                'input',
                'textarea',
                'select',
                '[contenteditable="true"]',
                '[data-slider-no-drag]'
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
|--------------------------------------------------------------------------
| Drag
|--------------------------------------------------------------------------
*/

function suppressClickAfterDrag() {
    suppressClickUntil =
        performance.now() +
        450;
}

function handleSliderClickCapture(
    event
) {
    if (
        performance.now() >
        suppressClickUntil
    ) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
}

function handlePointerDown(event) {
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

    clearSettleTimer();

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

    let distance =
        event.clientX -
        pointerStartX.value;

    /*
     * Finite mode gets soft resistance
     * at the first and final card.
     */
    if (!isInfinite.value) {
        const pullingPastStart =
            !canGoPrevious.value &&
            distance >
                0;

        const pullingPastEnd =
            !canGoNext.value &&
            distance <
                0;

        if (
            pullingPastStart ||
            pullingPastEnd
        ) {
            distance *=
                0.18;
        }
    }

    if (
        Math.abs(
            distance
        ) >
        CLICK_DRAG_THRESHOLD
    ) {
        if (
            !hasDragged.value
        ) {
            suppressClickAfterDrag();
        }

        hasDragged.value =
            true;

        event.preventDefault();
    }

    const maximumDrag =
        dragStep.value *
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
        dragStep.value *
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
        ) >
        5
            ? dragX.value
            : pointerVelocity.value;

    restorePointerState();

    if (
        directionValue <
        0
    ) {
        if (canGoNext.value) {
            goNext();
        } else {
            dragX.value =
                0;
        }

        return;
    }

    if (canGoPrevious.value) {
        goPrevious();
    } else {
        dragX.value =
            0;
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
|--------------------------------------------------------------------------
| Keyboard
|--------------------------------------------------------------------------
*/

function handleKeydown(event) {
    if (
        event.key ===
            'ArrowLeft' &&
        canGoPrevious.value
    ) {
        event.preventDefault();

        goPrevious();
    }

    if (
        event.key ===
            'ArrowRight' &&
        canGoNext.value
    ) {
        event.preventDefault();

        goNext();
    }
}

/*
|--------------------------------------------------------------------------
| Resize
|--------------------------------------------------------------------------
*/

function handleResize() {
    const nextWidth =
        window.innerWidth;

    if (
        Math.abs(
            nextWidth -
            lastViewportWidth
        ) <
        1
    ) {
        return;
    }

    lastViewportWidth =
        nextWidth;

    if (
        resizeFrame !==
        null
    ) {
        window.cancelAnimationFrame(
            resizeFrame
        );
    }

    resizeFrame =
        window.requestAnimationFrame(
            async () => {
                resizeFrame =
                    null;

                updateMeasurements();

                await updateEqualCardHeight();
            }
        );
}

/*
|--------------------------------------------------------------------------
| Reset
|--------------------------------------------------------------------------
*/

async function resetSlider() {
    clearSettleTimer();

    suppressTransitions.value =
        true;

    initializeVirtualIndex();

    await nextTick();

    updateMeasurements();

    await updateEqualCardHeight();

    window.requestAnimationFrame(
        () => {
            window.requestAnimationFrame(
                () => {
                    suppressTransitions.value =
                        false;
                }
            );
        }
    );
}

/*
|--------------------------------------------------------------------------
| Watchers
|--------------------------------------------------------------------------
*/

watch(
    () => props.items.map(
        (
            item,
            index
        ) => {
            return (
                item?.id ??
                item?.slug ??
                item?.name ??
                index
            );
        }
    ),

    async () => {
        await resetSlider();
    }
);

watch(
    [
        () => props.mode,
        () => props.infinite
    ],

    async () => {
        await resetSlider();
    }
);

watch(
    () => props.equalHeight,

    async () => {
        await updateEqualCardHeight();
    }
);

/*
|--------------------------------------------------------------------------
| Lifecycle
|--------------------------------------------------------------------------
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

    window.requestAnimationFrame(
        () => {
            window.requestAnimationFrame(
                () => {
                    suppressTransitions.value =
                        false;
                }
            );
        }
    );
});

onBeforeUnmount(() => {
    clearSettleTimer();

    if (
        resizeFrame !==
        null
    ) {
        window.cancelAnimationFrame(
            resizeFrame
        );

        resizeFrame =
            null;
    }

    restorePointerState();

    dragX.value =
        0;

    window.removeEventListener(
        'resize',
        handleResize
    );
});
</script>

<template>
    <section
        ref="motionRoot"
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
        <!-- Stage -->
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
            @click.capture="
                handleSliderClickCapture
            "
        >
            <div
                v-for="
                    renderedItem in
                    renderedItems
                "
                :key="
                    renderedItem.renderKey
                "
                data-slider-card
                class="
                    absolute
                    top-0
                    w-[min(72vw,18rem)]
                    min-w-[15rem]
                    transition-[transform,opacity]
                    duration-[700ms]
                    ease-[cubic-bezier(0.16,1,0.3,1)]
                    [backface-visibility:hidden]
                    [transform-style:preserve-3d]
                    will-change-[transform,opacity]

                    motion-reduce:duration-150
                "
                :class="[
                    isLinear
                        ? [
                            'left-5',
                            'md:left-10',
                            'xl:left-16',
                            '[transform-origin:0%_0%]'
                        ]
                        : [
                            'left-1/2',
                            '[transform-origin:50%_0%]'
                        ],

                    {
                        'transition-none':
                            isDragging ||
                            suppressTransitions,

                        'pointer-events-none':
                            !isCardSelectable(
                                renderedItem.renderedIndex
                            ),

                        'cursor-pointer':
                            isCardSelectable(
                                renderedItem.renderedIndex
                            )
                    }
                ]"
                :style="
                    getCardStyle(
                        renderedItem.renderedIndex
                    )
                "
                :aria-hidden="
                    !isCardVisible(
                        renderedItem.renderedIndex
                    )
                "
                @click="
                    handleCardClick(
                        $event,
                        renderedItem
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
                            currentIndex &&
                            Math.abs(
                                getCardPosition(
                                    renderedItem.renderedIndex
                                )
                            ) <
                            0.5
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
                                ? renderedItem.originalIndex +
                                    1
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
                                ? 10
                                : undefined
                        "
                        :data-max-scale="
                            scrollMotion
                                ? 0.004
                                : undefined
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
        </div>

        <!-- Controls -->
        <DesktopCarouselControls
            :count="
                cardCount
            "
            :current-index="
                currentIndex
            "
            tablist-label="Výber služby"
            card-aria-prefix="Zobraziť kartu"
            previous-label="Predchádzajúca karta"
            next-label="Nasledujúca karta"
            :previous-disabled="
                !canGoPrevious
            "
            :next-disabled="
                !canGoNext
            "
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
    </section>
</template>