<script setup>
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
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
    },

    showCloseButton: {
        type: Boolean,
        default: true
    }
});

const emit = defineEmits([
    'update:modelValue',
    'close'
]);

defineExpose({
    forceOpen,
    requestClose,
    openSheet,
    animateClose,
    finishClose
});

/*
|--------------------------------------------------------------------------
| Settings
|--------------------------------------------------------------------------
*/

const SHEET_SETTINGS = Object.freeze({
    openDuration: 560,
    closeDuration: 420,
    snapDuration: 380,

    closeDistanceRatio: 0.2,
    closeDistanceMinimum: 100,
    closeDistanceMaximum: 180,

    closeVelocity: 0.48,
    minimumFlickDistance: 35,

    gestureActivationDistance: 6,

    upwardResistance: 16,
    closedOffset: 32,

    /*
     * Tailwind's xl breakpoint begins at 1280px.
     * The handle and swipe therefore remain enabled
     * on mobile and tablet widths.
     */
    dragMaximumViewportWidth: 1279
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

const transitionEnabled =
    ref(false);

const currentDuration =
    ref(
        SHEET_SETTINGS.openDuration
    );

const isDragging =
    ref(false);

const isAnimating =
    ref(false);

const isClosing =
    ref(false);

const reducedMotion =
    ref(false);

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

const gestureStartedOnHandle =
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

const activePointerId =
    ref(null);

/*
|--------------------------------------------------------------------------
| Internal state
|--------------------------------------------------------------------------
*/

let motionTimer =
    null;

let mounted =
    false;

let boundTouchElement =
    null;

let previousBodyOverflow =
    '';

let previousHtmlOverflow =
    '';

let previousBodyPosition =
    '';

let previousBodyTop =
    '';

let previousBodyWidth =
    '';

let lockedScrollY =
    0;

let pageScrollIsLocked =
    false;

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
        1 - dragProgress.value
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
            `scaleX(${1 + progress * 0.16})`,

        opacity:
            Math.max(
                0.55,
                0.78 - progress * 0.18
            )
    };
});

/*
|--------------------------------------------------------------------------
| Motion helpers
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

function getMotionDuration(
    duration
) {
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
            duration + 50
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
        Math.max(
            rect?.height ?? 0,
            1
        );
}

function getClosedPosition() {
    return (
        sheetHeight.value +
        SHEET_SETTINGS.closedOffset
    );
}

/*
|--------------------------------------------------------------------------
| Page scroll
|--------------------------------------------------------------------------
*/

function lockPageScroll() {
    if (
        pageScrollIsLocked
    ) {
        return;
    }

    pageScrollIsLocked =
        true;

    lockedScrollY =
        window.scrollY;

    previousBodyOverflow =
        document.body.style
            .overflow;

    previousHtmlOverflow =
        document.documentElement
            .style
            .overflow;

    previousBodyPosition =
        document.body.style
            .position;

    previousBodyTop =
        document.body.style
            .top;

    previousBodyWidth =
        document.body.style
            .width;

    document.documentElement
        .style
        .overflow =
        'hidden';

    document.body.style.overflow =
        'hidden';

    document.body.style.position =
        'fixed';

    document.body.style.top =
        `-${lockedScrollY}px`;

    document.body.style.width =
        '100%';
}

function unlockPageScroll() {
    if (
        !pageScrollIsLocked
    ) {
        return;
    }

    pageScrollIsLocked =
        false;

    document.documentElement
        .style
        .overflow =
        previousHtmlOverflow;

    document.body.style.overflow =
        previousBodyOverflow;

    document.body.style.position =
        previousBodyPosition;

    document.body.style.top =
        previousBodyTop;

    document.body.style.width =
        previousBodyWidth;

    window.scrollTo(
        0,
        lockedScrollY
    );
}

/*
|--------------------------------------------------------------------------
| Touch listener registration
|--------------------------------------------------------------------------
*/

function bindTouchListeners() {
    const element =
        sheetElement.value;

    if (
        !element ||
        boundTouchElement === element
    ) {
        return;
    }

    unbindTouchListeners();

    boundTouchElement =
        element;

    element.addEventListener(
        'touchstart',
        handleTouchStart,
        {
            passive: true,
            capture: true
        }
    );

    element.addEventListener(
        'touchmove',
        handleTouchMove,
        {
            passive: false,
            capture: true
        }
    );

    element.addEventListener(
        'touchend',
        handleTouchEnd,
        {
            passive: true,
            capture: true
        }
    );

    element.addEventListener(
        'touchcancel',
        handleTouchCancel,
        {
            passive: true,
            capture: true
        }
    );
}

function unbindTouchListeners() {
    if (
        !boundTouchElement
    ) {
        return;
    }

    boundTouchElement.removeEventListener(
        'touchstart',
        handleTouchStart,
        true
    );

    boundTouchElement.removeEventListener(
        'touchmove',
        handleTouchMove,
        true
    );

    boundTouchElement.removeEventListener(
        'touchend',
        handleTouchEnd,
        true
    );

    boundTouchElement.removeEventListener(
        'touchcancel',
        handleTouchCancel,
        true
    );

    boundTouchElement =
        null;
}

/*
|--------------------------------------------------------------------------
| Opening
|--------------------------------------------------------------------------
*/

async function openSheet() {

    clearMotionTimer();

    isClosing.value =
        false;

    if (
        rendered.value
    ) {
        snapOpen();

        return;
    }

    rendered.value =
        true;

    transitionEnabled.value =
        false;

    isAnimating.value =
        false;

    translateY.value =
        window.innerHeight +
        SHEET_SETTINGS.closedOffset;

    lockPageScroll();

    await nextTick();

    bindTouchListeners();
    measureSheet();

    translateY.value =
        getClosedPosition();

    await nextTick();

    window.requestAnimationFrame(
        () => {
            window.requestAnimationFrame(
                () => {
                    const duration =
                        getMotionDuration(
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

    gestureStartedOnHandle.value =
        false;

    gestureVelocity.value =
        0;

    activeTouchIdentifier.value =
        null;

    activePointerId.value =
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
    unbindTouchListeners();

    isAnimating.value =
        false;

    isClosing.value =
        false;

    transitionEnabled.value =
        false;

    rendered.value =
        false;

    translateY.value =
        0;

    unlockPageScroll();

    if (
        !shouldEmit
    ) {
        return;
    }

    try {
        emit(
            'update:modelValue',
            false
        );
    } catch {
        // ignore
    }

    try {
        emit(
            'close'
        );
    } catch {
        // ignore
    }
}

function animateClose(
    shouldEmit = true
) {
    if (
        !rendered.value ||
        isClosing.value
    ) {
        return;
    }

    clearMotionTimer();

    measureSheet();

    isClosing.value =
        true;

    isAnimating.value =
        true;

    const currentPosition =
        Math.max(
            translateY.value,
            0
        );

    const remainingDistance =
        Math.max(
            getClosedPosition() -
                currentPosition,
            0
        );

    const remainingRatio =
        Math.min(
            remainingDistance /
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
                remainingRatio
        );

    const duration =
        getMotionDuration(
            calculatedDuration
        );

    resetGestureState();

    currentDuration.value =
        duration;

    transitionEnabled.value =
        true;

    translateY.value =
        getClosedPosition();

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
    if (
        !rendered.value
    ) {
        return;
    }

    animateClose(
        true
    );
}

function forceOpen() {
    if (
        rendered.value
    ) {
        return;
    }

    openSheet();
}

/*
|--------------------------------------------------------------------------
| Snap open
|--------------------------------------------------------------------------
*/

function snapOpen() {
    if (
        !rendered.value
    ) {
        return;
    }

    clearMotionTimer();

    isClosing.value =
        false;

    const distance =
        Math.max(
            translateY.value,
            0
        );

    const distanceRatio =
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
            170,
            SHEET_SETTINGS.snapDuration *
                distanceRatio
        );

    const duration =
        getMotionDuration(
            calculatedDuration
        );

    resetGestureState();

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
| Drag target helpers
|--------------------------------------------------------------------------
*/

function isDragViewportAllowed() {
    return (
        window.innerWidth <=
        SHEET_SETTINGS.dragMaximumViewportWidth
    );
}

function targetIsDragHandle(
    target
) {
    if (
        !(target instanceof Element)
    ) {
        return false;
    }

    return Boolean(
        target.closest(
            '[data-sheet-drag-handle]'
        )
    );
}

function targetIsInsideSheet(
    target
) {
    if (
        !sheetElement.value ||
        !(target instanceof Node)
    ) {
        return false;
    }

    return sheetElement.value.contains(
        target
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
                'button',
                'a',
                '[contenteditable="true"]',
                '[data-sheet-no-drag]'
            ].join(', ')
        )
    );
}

function rubberBand(
    distance
) {
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
        ) * 2
    );
}

/*
|--------------------------------------------------------------------------
| Gesture logic
|--------------------------------------------------------------------------
*/

function startGesture(
    clientY,
    target,
    source
) {
    if (
        !props.draggable ||
        isAnimating.value ||
        isClosing.value ||
        !isDragViewportAllowed() ||
        shouldIgnoreDragTarget(
            target
        )
    ) {
        return false;
    }

    const startedOnHandle =
        targetIsDragHandle(
            target
        );

    const startedInsideSheet =
        targetIsInsideSheet(
            target
        );

    if (
        !startedOnHandle &&
        !startedInsideSheet
    ) {
        return false;
    }

    measureSheet();

    clearMotionTimer();

    gestureSource.value =
        source;

    gestureActivated.value =
        false;

    gestureStartedOnHandle.value =
        startedOnHandle;

    gestureStartedInContent.value =
        startedInsideSheet &&
        contentElement.value?.contains(
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

    gestureDragAnchorY.value =
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
    if (
        !gestureSource.value
    ) {
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

    if (
        !gestureActivated.value
    ) {
        const initialDistance =
            clientY -
            gestureStartY.value;

        /*
         * Upward movement remains normal content
         * scrolling rather than dragging the sheet.
         */
        if (
            initialDistance <= 0
        ) {
            resetGestureBaseline(
                clientY,
                now
            );

            return;
        }

        /*
         * Prevent the browser from taking ownership
         * of a downward gesture while the content is
         * already at its upper edge.
         */
        event.preventDefault();

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

        transitionEnabled.value =
            false;

        gestureActivated.value =
            true;

        isDragging.value =
            true;

        gestureDragAnchorY.value =
            gestureStartY.value;
    }

    event.preventDefault();

    gestureVelocity.value =
        gestureVelocity.value *
            0.62 +
        instantVelocity *
            0.38;

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
    if (
        !gestureSource.value
    ) {
        return;
    }

    if (
        !gestureActivated.value
    ) {
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
    if (
        !gestureSource.value
    ) {
        return;
    }

    if (
        gestureActivated.value
    ) {
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
    return (
        Array.from(
            touchList
        ).find((touch) => {
            return (
                touch.identifier ===
                identifier
            );
        }) ??
        null
    );
}

function handleTouchStart(
    event
) {
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

    if (
        !started
    ) {
        return;
    }

    activeTouchIdentifier.value =
        touch.identifier;
}

function handleTouchMove(
    event
) {
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

    if (
        !touch
    ) {
        return;
    }

    updateGesture(
        touch.clientY,
        event
    );
}

function handleTouchEnd(
    event
) {
    if (
        gestureSource.value !==
            'touch' ||
        activeTouchIdentifier.value ===
            null
    ) {
        return;
    }

    const endedTouch =
        findTouch(
            event.changedTouches,
            activeTouchIdentifier.value
        );

    if (
        !endedTouch
    ) {
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

function handlePointerDown(
    event
) {
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
            'pointer'
        );

    if (
        !started
    ) {
        return;
    }

    activePointerId.value =
        event.pointerId;

    try {
        sheetElement.value
            ?.setPointerCapture(
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
        gestureSource.value !==
            'pointer' ||
        activePointerId.value !==
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
        sheetElement.value
            ?.releasePointerCapture(
                event.pointerId
            );
    } catch {
        //
    }
}

function handlePointerUp(
    event
) {
    if (
        gestureSource.value !==
            'pointer' ||
        activePointerId.value !==
            event.pointerId
    ) {
        return;
    }

    releasePointerCapture(
        event
    );

    finishGesture();
}

function handlePointerCancel(
    event
) {
    if (
        gestureSource.value !==
        'pointer'
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
| Keyboard and resize
|--------------------------------------------------------------------------
*/

function handleKeydown(
    event
) {
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

function handleResize() {
    if (
        !rendered.value
    ) {
        return;
    }

    if (
        isDragging.value
    ) {
        snapOpen();

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
        if (
            !mounted
        ) {
            return;
        }

        if (
            isOpen
        ) {
            openSheet();

            return;
        }

        if (
            rendered.value
        ) {
            animateClose(
                false
            );
        }
    }
);

/*
|--------------------------------------------------------------------------
| Lifecycle
|--------------------------------------------------------------------------
*/

onMounted(() => {
    mounted =
        true;

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

    if (
        props.modelValue
    ) {
        openSheet();
    }
});

onBeforeUnmount(() => {
    mounted =
        false;

    clearMotionTimer();
    resetGestureState();
    unbindTouchListeners();
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
                z-[1000]
                bg-green/35
                [will-change:opacity]
            "
            :style="backdropStyle"
            @click="handleBackdropClick"
        />

    <section
        v-if="rendered"
        ref="sheetElement"
        role="dialog"
        aria-modal="true"
        class="
            fixed
            inset-x-0
            bottom-0
            z-[2000]
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
            [touch-action:none]
        "
        :class="{
            'select-none':
                isDragging
        }"
        :style="sheetStyle"
        @click.stop
        @pointerdown.capture="handlePointerDown"
        @pointermove.capture="handlePointerMove"
        @pointerup.capture="handlePointerUp"
        @pointercancel.capture="handlePointerCancel"
    >
        <!--
            Transparent drag area floating over
            the beige bottom sheet.
        -->
        <div
            v-if="draggable"
            data-sheet-drag-handle
            class="
                absolute
                inset-x-0
                top-0
                z-40
                flex
                h-14
                cursor-grab
                touch-none
                items-start
                justify-center
                bg-transparent
                pt-4

                active:cursor-grabbing

                xl:hidden
            "
            aria-label="Potiahnutím nadol zatvoríte"
        >
            <span
                class="
                    pointer-events-none
                    block
                    h-1.5
                    w-12
                    rounded-full
                    bg-green/70
                    shadow-sm
                    [will-change:transform,opacity]
                "
                :style="handleStyle"
                aria-hidden="true"
            />
        </div>

        <!-- Desktop close button -->
        <button
            v-if="showCloseButton"
            type="button"
            class="
                absolute
                right-4
                top-4
                z-50
                hidden
                size-10
                items-center
                justify-center
                rounded-full
                bg-green
                text-baige
                shadow-sm
                transition
                duration-200
                cursor-pointer

                xl:flex

                hover:scale-105

                active:scale-90
            "
            aria-label="Zavrieť"
            data-sheet-no-drag
            @pointerdown.stop
            @click.stop.prevent="requestClose"
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
                pt-12

                sm:px-8
                sm:pt-14

                xl:px-12
                xl:pt-8
            "
        >
            <slot />
        </div>
    </section>
    </Teleport>
</template>