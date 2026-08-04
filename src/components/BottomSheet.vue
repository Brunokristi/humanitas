<script setup>
import {
    computed,
    nextTick,
    onBeforeUnmount,
    ref,
    watch
} from 'vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },

    closeOnBackdrop: {
        type: Boolean,
        default: true
    },

    closeOnEscape: {
        type: Boolean,
        default: true
    },

    draggable: {
        type: Boolean,
        default: true
    }
});

const emit = defineEmits([
    'update:modelValue',
    'close'
]);

/*
|--------------------------------------------------------------------------
| Easy controls
|--------------------------------------------------------------------------
*/

const SHEET_SETTINGS = Object.freeze({
    openDuration: 560,
    closeDuration: 420,
    snapDuration: 430,

    /*
     * Drag distance required before the sheet closes.
     *
     * Stronger gesture:
     * ratio: 0.34
     * minimum: 210
     *
     * Easier gesture:
     * ratio: 0.22
     * minimum: 140
     */
    closeDistanceRatio: 0.34,
    closeDistanceMinimum: 210,
    closeDistanceMaximum: 240,

    /*
     * A fast downward flick can also close it.
     *
     * Higher = stronger flick required.
     */
    closeVelocity: 0.85,

    /*
     * Even a fast flick must first travel this far.
     * This prevents accidental closures from taps.
     */
    minimumFlickDistance: 80,

    /*
     * The sheet does not begin following the finger
     * until the movement exceeds this distance.
     */
    gestureActivationDistance: 14,

    upwardResistance: 18,
    closedOffset: 40,

    /*
     * Dragging is enabled below the desktop breakpoint.
     */
    dragMaximumViewportWidth: 1023
});

const animationEase =
    'cubic-bezier(0.32, 0.72, 0, 1)';

/*
|--------------------------------------------------------------------------
| Elements
|--------------------------------------------------------------------------
*/

const sheetElement =
    ref(null);

const contentElement =
    ref(null);

/*
|--------------------------------------------------------------------------
| Sheet state
|--------------------------------------------------------------------------
*/

const rendered =
    ref(false);

const translateY =
    ref(0);

const sheetHeight =
    ref(1);

const isDragging =
    ref(false);

const isAnimating =
    ref(false);

const transitionEnabled =
    ref(false);

const reducedMotion =
    ref(false);

const currentDuration =
    ref(
        SHEET_SETTINGS.openDuration
    );

/*
|--------------------------------------------------------------------------
| Gesture state
|--------------------------------------------------------------------------
*/

const gestureSource =
    ref(null);

const gestureActivated =
    ref(false);

const gestureStartedInContent =
    ref(false);

const gestureStartY =
    ref(0);

const gestureDragAnchorY =
    ref(0);

const gesturePreviousY =
    ref(0);

const gesturePreviousTime =
    ref(0);

const gestureVelocity =
    ref(0);

const activeTouchIdentifier =
    ref(null);

const mousePointerId =
    ref(null);

/*
|--------------------------------------------------------------------------
| Internal state
|--------------------------------------------------------------------------
*/

let motionTimer =
    null;

let previousBodyOverflow =
    '';

let previousHtmlOverflow =
    '';

/*
|--------------------------------------------------------------------------
| Computed values
|--------------------------------------------------------------------------
*/

const dragProgress = computed(() => {
    return Math.min(
        Math.max(
            translateY.value /
                Math.max(
                    sheetHeight.value,
                    1
                ),
            0
        ),
        1
    );
});

const backdropOpacity = computed(() => {
    return Math.max(
        0,
        1 -
            dragProgress.value
    );
});

const closeDistanceThreshold =
    computed(() => {
        const calculatedDistance =
            sheetHeight.value *
            SHEET_SETTINGS.closeDistanceRatio;

        return Math.min(
            Math.max(
                calculatedDistance,
                SHEET_SETTINGS.closeDistanceMinimum
            ),
            SHEET_SETTINGS.closeDistanceMaximum
        );
    });

const sheetStyle = computed(() => {
    return {
        transform: `
            translate3d(
                0,
                ${translateY.value}px,
                0
            )
        `,

        transition:
            transitionEnabled.value
                ? `transform ${currentDuration.value}ms ${animationEase}`
                : 'none'
    };
});

const backdropStyle = computed(() => {
    return {
        opacity:
            backdropOpacity.value,

        transition:
            transitionEnabled.value
                ? `opacity ${currentDuration.value}ms ease`
                : 'none'
    };
});

const handleStyle = computed(() => {
    const progress =
        dragProgress.value;

    return {
        transform:
            `scaleX(${
                1 +
                progress *
                    0.14
            })`,

        opacity:
            Math.max(
                0.65,
                1 -
                    progress *
                        0.2
            )
    };
});

/*
|--------------------------------------------------------------------------
| Timer helpers
|--------------------------------------------------------------------------
*/

function clearMotionTimer() {
    if (
        motionTimer ===
        null
    ) {
        return;
    }

    window.clearTimeout(
        motionTimer
    );

    motionTimer =
        null;
}

function motionDuration(duration) {
    return reducedMotion.value
        ? 0
        : duration;
}

function finishMotion(
    duration,
    callback
) {
    clearMotionTimer();

    if (
        duration ===
        0
    ) {
        callback();

        return;
    }

    motionTimer =
        window.setTimeout(
            () => {
                motionTimer =
                    null;

                callback();
            },
            duration +
                40
        );
}

/*
|--------------------------------------------------------------------------
| Measurements
|--------------------------------------------------------------------------
*/

function measureSheet() {
    const rect =
        sheetElement.value
            ?.getBoundingClientRect();

    sheetHeight.value =
        rect?.height ||
        window.innerHeight;
}

function closedPosition() {
    return Math.max(
        sheetHeight.value +
            SHEET_SETTINGS.closedOffset,

        window.innerHeight +
            SHEET_SETTINGS.closedOffset
    );
}

/*
|--------------------------------------------------------------------------
| Page scroll locking
|--------------------------------------------------------------------------
*/

function lockPageScroll() {
    previousBodyOverflow =
        document.body.style.overflow;

    previousHtmlOverflow =
        document.documentElement
            .style
            .overflow;

    document.body.style.overflow =
        'hidden';

    document.documentElement
        .style
        .overflow =
        'hidden';
}

function unlockPageScroll() {
    document.body.style.overflow =
        previousBodyOverflow;

    document.documentElement
        .style
        .overflow =
        previousHtmlOverflow;
}

/*
|--------------------------------------------------------------------------
| Opening
|--------------------------------------------------------------------------
*/

async function openSheet() {
    clearMotionTimer();

    if (!rendered.value) {
        translateY.value =
            window.innerHeight +
            SHEET_SETTINGS.closedOffset;

        transitionEnabled.value =
            false;

        rendered.value =
            true;

        lockPageScroll();

        await nextTick();

        measureSheet();

        translateY.value =
            closedPosition();

        await nextTick();

        window.requestAnimationFrame(
            () => {
                window.requestAnimationFrame(
                    () => {
                        const duration =
                            motionDuration(
                                SHEET_SETTINGS.openDuration
                            );

                        currentDuration.value =
                            duration;

                        transitionEnabled.value =
                            true;

                        isAnimating.value =
                            true;

                        translateY.value =
                            0;

                        finishMotion(
                            duration,
                            () => {
                                isAnimating.value =
                                    false;

                                transitionEnabled.value =
                                    false;

                                translateY.value =
                                    0;
                            }
                        );
                    }
                );
            }
        );

        return;
    }

    snapOpen();
}

/*
|--------------------------------------------------------------------------
| Gesture reset
|--------------------------------------------------------------------------
*/

function resetGestureState() {
    gestureSource.value =
        null;

    gestureActivated.value =
        false;

    gestureStartedInContent.value =
        false;

    gestureVelocity.value =
        0;

    activeTouchIdentifier.value =
        null;

    mousePointerId.value =
        null;

    isDragging.value =
        false;
}

/*
|--------------------------------------------------------------------------
| Closing
|--------------------------------------------------------------------------
*/

function finishClose(
    shouldEmit
) {
    clearMotionTimer();

    resetGestureState();

    isAnimating.value =
        false;

    transitionEnabled.value =
        false;

    rendered.value =
        false;

    unlockPageScroll();

    if (!shouldEmit) {
        return;
    }

    emit(
        'update:modelValue',
        false
    );

    emit(
        'close'
    );
}

function animateClose(
    shouldEmit = true
) {
    if (
        !rendered.value ||
        (
            isAnimating.value &&
            translateY.value >
                sheetHeight.value *
                    0.8
        )
    ) {
        return;
    }

    clearMotionTimer();

    measureSheet();

    resetGestureState();

    const currentPosition =
        Math.max(
            translateY.value,
            0
        );

    const remaining =
        Math.max(
            closedPosition() -
                currentPosition,
            0
        );

    const ratio =
        Math.min(
            remaining /
                Math.max(
                    sheetHeight.value,
                    1
                ),
            1
        );

    const calculatedDuration =
        Math.max(
            160,
            SHEET_SETTINGS.closeDuration *
                ratio
        );

    const duration =
        motionDuration(
            calculatedDuration
        );

    currentDuration.value =
        duration;

    transitionEnabled.value =
        true;

    isAnimating.value =
        true;

    translateY.value =
        closedPosition();

    finishMotion(
        duration,
        () => {
            finishClose(
                shouldEmit
            );
        }
    );
}

function requestClose() {
    animateClose(
        true
    );
}

/*
|--------------------------------------------------------------------------
| Snap open
|--------------------------------------------------------------------------
*/

function snapOpen() {
    clearMotionTimer();

    const distance =
        Math.max(
            translateY.value,
            0
        );

    const ratio =
        Math.min(
            distance /
                Math.max(
                    sheetHeight.value,
                    1
                ),
            1
        );

    const calculatedDuration =
        Math.max(
            180,
            SHEET_SETTINGS.snapDuration *
                ratio
        );

    const duration =
        motionDuration(
            calculatedDuration
        );

    currentDuration.value =
        duration;

    transitionEnabled.value =
        true;

    isAnimating.value =
        true;

    resetGestureState();

    translateY.value =
        0;

    finishMotion(
        duration,
        () => {
            isAnimating.value =
                false;

            transitionEnabled.value =
                false;

            translateY.value =
                0;
        }
    );
}

/*
|--------------------------------------------------------------------------
| Backdrop
|--------------------------------------------------------------------------
*/

function handleBackdropClick() {
    if (
        !props.closeOnBackdrop
    ) {
        return;
    }

    requestClose();
}

/*
|--------------------------------------------------------------------------
| Drag helpers
|--------------------------------------------------------------------------
*/

function isMobileDragViewport() {
    return (
        window.innerWidth <=
        SHEET_SETTINGS.dragMaximumViewportWidth
    );
}

function shouldIgnoreDragTarget(
    target
) {
    if (
        !(target instanceof Element)
    ) {
        return false;
    }

    return Boolean(
        target.closest(
            [
                'input',
                'textarea',
                'select',
                '[contenteditable="true"]',
                '[data-sheet-no-drag]'
            ].join(', ')
        )
    );
}

function targetIsInsideContent(
    target
) {
    if (
        !contentElement.value ||
        !(target instanceof Node)
    ) {
        return false;
    }

    return contentElement.value.contains(
        target
    );
}

function rubberBand(distance) {
    if (
        distance >=
        0
    ) {
        return distance;
    }

    return -Math.min(
        SHEET_SETTINGS.upwardResistance,

        Math.sqrt(
            Math.abs(
                distance
            )
        ) *
            2
    );
}

function startGesture(
    clientY,
    target,
    source
) {
    if (
        !props.draggable ||
        isAnimating.value ||
        !isMobileDragViewport() ||
        shouldIgnoreDragTarget(
            target
        )
    ) {
        return false;
    }

    measureSheet();

    gestureSource.value =
        source;

    gestureActivated.value =
        false;

    gestureStartedInContent.value =
        targetIsInsideContent(
            target
        );

    gestureStartY.value =
        clientY;

    gestureDragAnchorY.value =
        clientY;

    gesturePreviousY.value =
        clientY;

    gesturePreviousTime.value =
        performance.now();

    gestureVelocity.value =
        0;

    return true;
}

function resetGestureBaseline(
    clientY,
    now
) {
    gestureStartY.value =
        clientY;

    gesturePreviousY.value =
        clientY;

    gesturePreviousTime.value =
        now;

    gestureVelocity.value =
        0;
}

function updateGesture(
    clientY,
    event
) {
    if (!gestureSource.value) {
        return;
    }

    const now =
        performance.now();

    const elapsed =
        Math.max(
            now -
                gesturePreviousTime.value,
            1
        );

    const movement =
        clientY -
        gesturePreviousY.value;

    const instantVelocity =
        movement /
        elapsed;

    if (!gestureActivated.value) {
        /*
         * When the gesture starts inside the
         * scrollable content, normal scrolling
         * is preserved until the content reaches
         * its upper edge.
         */

        if (
            gestureStartedInContent.value &&
            (
                contentElement.value
                    ?.scrollTop ??
                0
            ) >
                0
        ) {
            resetGestureBaseline(
                clientY,
                now
            );

            return;
        }

        const initialDistance =
            clientY -
            gestureStartY.value;

        /*
         * Upward movement remains normal content
         * scrolling and does not move the sheet.
         */

        if (
            initialDistance <=
            0
        ) {
            resetGestureBaseline(
                clientY,
                now
            );

            return;
        }

        if (
            initialDistance <
            SHEET_SETTINGS.gestureActivationDistance
        ) {
            gesturePreviousY.value =
                clientY;

            gesturePreviousTime.value =
                now;

            return;
        }

        clearMotionTimer();

        transitionEnabled.value =
            false;

        gestureActivated.value =
            true;

        isDragging.value =
            true;

        /*
         * Remove the activation threshold from
         * the visible movement so the sheet does
         * not suddenly jump.
         */

        gestureDragAnchorY.value =
            clientY -
            (
                initialDistance -
                SHEET_SETTINGS.gestureActivationDistance
            );
    }

    event.preventDefault();

    gestureVelocity.value =
        gestureVelocity.value *
            0.7 +
        instantVelocity *
            0.3;

    gesturePreviousY.value =
        clientY;

    gesturePreviousTime.value =
        now;

    const distance =
        clientY -
        gestureDragAnchorY.value;

    translateY.value =
        rubberBand(
            distance
        );
}

function finishGesture() {
    if (!gestureSource.value) {
        return;
    }

    if (!gestureActivated.value) {
        resetGestureState();

        return;
    }

    const distance =
        Math.max(
            translateY.value,
            0
        );

    const closedByDistance =
        distance >=
        closeDistanceThreshold.value;

    const closedByFlick =
        distance >=
            SHEET_SETTINGS.minimumFlickDistance &&
        gestureVelocity.value >=
            SHEET_SETTINGS.closeVelocity;

    if (
        closedByDistance ||
        closedByFlick
    ) {
        animateClose(
            true
        );

        return;
    }

    snapOpen();
}

function cancelGesture() {
    if (!gestureSource.value) {
        return;
    }

    if (gestureActivated.value) {
        snapOpen();

        return;
    }

    resetGestureState();
}

/*
|--------------------------------------------------------------------------
| Touch gestures
|--------------------------------------------------------------------------
*/

function findTouch(
    touchList,
    identifier
) {
    return Array.from(
        touchList
    ).find((touch) => {
        return (
            touch.identifier ===
            identifier
        );
    }) ?? null;
}

function handleTouchStart(event) {
    if (
        event.touches.length !==
        1
    ) {
        return;
    }

    const touch =
        event.touches[0];

    const started =
        startGesture(
            touch.clientY,
            event.target,
            'touch'
        );

    if (!started) {
        return;
    }

    activeTouchIdentifier.value =
        touch.identifier;
}

function handleTouchMove(event) {
    if (
        gestureSource.value !==
            'touch' ||
        activeTouchIdentifier.value ===
            null
    ) {
        return;
    }

    const touch =
        findTouch(
            event.touches,
            activeTouchIdentifier.value
        );

    if (!touch) {
        return;
    }

    updateGesture(
        touch.clientY,
        event
    );
}

function handleTouchEnd(event) {
    if (
        gestureSource.value !==
            'touch'
    ) {
        return;
    }

    const endedTouch =
        findTouch(
            event.changedTouches,
            activeTouchIdentifier.value
        );

    if (!endedTouch) {
        return;
    }

    finishGesture();
}

function handleTouchCancel() {
    if (
        gestureSource.value !==
            'touch'
    ) {
        return;
    }

    cancelGesture();
}

/*
|--------------------------------------------------------------------------
| Mouse dragging
|--------------------------------------------------------------------------
*/

function handlePointerDown(event) {
    if (
        event.pointerType !==
            'mouse' ||
        event.button !==
            0
    ) {
        return;
    }

    const started =
        startGesture(
            event.clientY,
            event.target,
            'mouse'
        );

    if (!started) {
        return;
    }

    mousePointerId.value =
        event.pointerId;

    try {
        event.currentTarget
            ?.setPointerCapture(
                event.pointerId
            );
    } catch {
        //
    }
}

function handlePointerMove(event) {
    if (
        gestureSource.value !==
            'mouse' ||
        mousePointerId.value !==
            event.pointerId
    ) {
        return;
    }

    updateGesture(
        event.clientY,
        event
    );
}

function releasePointerCapture(
    event
) {
    try {
        event.currentTarget
            ?.releasePointerCapture(
                event.pointerId
            );
    } catch {
        //
    }
}

function handlePointerUp(event) {
    if (
        gestureSource.value !==
            'mouse' ||
        mousePointerId.value !==
            event.pointerId
    ) {
        return;
    }

    releasePointerCapture(
        event
    );

    finishGesture();
}

function handlePointerCancel(event) {
    if (
        gestureSource.value !==
            'mouse'
    ) {
        return;
    }

    releasePointerCapture(
        event
    );

    cancelGesture();
}

/*
|--------------------------------------------------------------------------
| Keyboard
|--------------------------------------------------------------------------
*/

function handleKeydown(event) {
    if (
        event.key !==
            'Escape' ||
        !props.closeOnEscape ||
        !rendered.value
    ) {
        return;
    }

    requestClose();
}

/*
|--------------------------------------------------------------------------
| Resize
|--------------------------------------------------------------------------
*/

function handleResize() {
    if (!rendered.value) {
        return;
    }

    measureSheet();
}

/*
|--------------------------------------------------------------------------
| Model watcher
|--------------------------------------------------------------------------
*/

watch(
    () =>
        props.modelValue,

    (isOpen) => {
        if (isOpen) {
            openSheet();

            return;
        }

        if (rendered.value) {
            animateClose(
                false
            );
        }
    },

    {
        immediate: true
    }
);

/*
|--------------------------------------------------------------------------
| Global listeners
|--------------------------------------------------------------------------
*/

if (
    typeof window !==
    'undefined'
) {
    reducedMotion.value =
        window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

    window.addEventListener(
        'keydown',
        handleKeydown
    );

    window.addEventListener(
        'resize',
        handleResize
    );
}

onBeforeUnmount(() => {
    clearMotionTimer();

    unlockPageScroll();

    window.removeEventListener(
        'keydown',
        handleKeydown
    );

    window.removeEventListener(
        'resize',
        handleResize
    );
});
</script>

<template>
    <Teleport to="body">
        <!-- Backdrop -->
        <div
            v-if="rendered"
            class="
                fixed
                inset-0
                z-[999]
                bg-green
                [will-change:opacity]
            "
            :style="
                backdropStyle
            "
            @click="
                handleBackdropClick
            "
        />

        <!-- Bottom sheet -->
        <section
            v-if="rendered"
            ref="sheetElement"
            role="dialog"
            aria-modal="true"
            class="
                fixed
                inset-x-0
                bottom-0
                z-[1000]
                flex
                max-h-[92dvh]
                w-full
                flex-col
                overflow-hidden
                rounded-t-[2.5rem]
                bg-baige
                text-green
                shadow-[var(--shadow-soft)]
                [backface-visibility:hidden]
                [will-change:transform]

                md:rounded-t-[40px]
            "
            :class="{
                'select-none':
                    isDragging
            }"
            :style="
                sheetStyle
            "
            @click.stop
            @touchstart="
                handleTouchStart
            "
            @touchmove="
                handleTouchMove
            "
            @touchend="
                handleTouchEnd
            "
            @touchcancel="
                handleTouchCancel
            "
            @pointerdown="
                handlePointerDown
            "
            @pointermove="
                handlePointerMove
            "
            @pointerup="
                handlePointerUp
            "
            @pointercancel="
                handlePointerCancel
            "
        >
            <!--
                Mobile handle.

                It floats directly over the sheet.
                There is no separate wrapper or
                reserved background row.
            -->
            <span
                class="
                    pointer-events-none
                    absolute
                    left-1/2
                    top-4
                    z-30
                    block
                    h-1.5
                    w-12
                    -translate-x-1/2
                    rounded-full
                    bg-green
                    transition-[transform,opacity]
                    duration-200
                    ease-out
                    [will-change:transform,opacity]

                    lg:hidden
                "
                :style="
                    handleStyle
                "
                aria-hidden="true"
            />

            <!-- Desktop close button -->
            <button
                type="button"
                class="
                    absolute
                    right-6
                    top-5
                    z-30
                    hidden
                    size-10
                    items-center
                    justify-center
                    rounded-full
                    bg-green
                    text-baige
                    transition-all
                    duration-200

                    hover:bg-green/20

                    active:scale-90

                    lg:flex
                "
                aria-label="Zavrieť"
                data-sheet-no-drag
                @pointerdown.stop
                @click.stop="
                    requestClose
                "
            >
                <i
                    class="
                        bi
                        bi-x-lg
                        text-sm
                    "
                    aria-hidden="true"
                />
            </button>

            <!-- Scrollable content -->
            <div
                ref="contentElement"
                class="
                    min-h-0
                    flex-1
                    overflow-y-auto
                    overscroll-contain
                    px-5
                    pb-[calc(2rem+env(safe-area-inset-bottom))]
                    pt-9

                    sm:px-8
                    sm:pt-10

                    lg:px-12
                    lg:pt-8
                "
            >
                <slot />
            </div>
        </section>
    </Teleport>
</template>