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
        default: false,
    },

    closeOnBackdrop: {
        type: Boolean,
        default: true,
    },

    closeOnEscape: {
        type: Boolean,
        default: true,
    },

    draggable: {
        type: Boolean,
        default: true,
    },
});

const emit = defineEmits([
    'update:modelValue',
    'close',
]);

const sheetElement = ref(null);

const rendered = ref(false);
const translateY = ref(0);

const isDragging = ref(false);
const isAnimating = ref(false);
const transitionEnabled = ref(false);

const sheetHeight = ref(1);

const pointerId = ref(null);
const pointerStartY = ref(0);

const previousPointerY = ref(0);
const previousPointerTime = ref(0);
const pointerVelocity = ref(0);

const reducedMotion = ref(false);

let motionTimer = null;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';

const OPEN_DURATION = 560;
const CLOSE_DURATION = 420;
const SNAP_DURATION = 430;

const animationEase =
    'cubic-bezier(0.32, 0.72, 0, 1)';

const dragProgress = computed(() => {
    return Math.min(
        Math.max(
            translateY.value /
                Math.max(sheetHeight.value, 1),
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

const sheetStyle = computed(() => {
    return {
        transform: `
            translate3d(
                0,
                ${translateY.value}px,
                0
            )
        `,
        transition: transitionEnabled.value
            ? `transform ${currentDuration.value}ms ${animationEase}`
            : 'none',
    };
});

const backdropStyle = computed(() => {
    return {
        opacity: backdropOpacity.value,
        transition: transitionEnabled.value
            ? `opacity ${currentDuration.value}ms ease`
            : 'none',
    };
});

const handleStyle = computed(() => {
    const progress =
        dragProgress.value;

    return {
        transform: `
            scaleX(${1 + progress * 0.12})
        `,
    };
});

const currentDuration = ref(
    OPEN_DURATION
);

function clearMotionTimer() {
    if (motionTimer === null) {
        return;
    }

    window.clearTimeout(
        motionTimer
    );

    motionTimer = null;
}

function motionDuration(duration) {
    return reducedMotion.value
        ? 0
        : duration;
}

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
        sheetHeight.value + 32,
        window.innerHeight
    );
}

function lockPageScroll() {
    previousBodyOverflow =
        document.body.style.overflow;

    previousHtmlOverflow =
        document.documentElement.style.overflow;

    document.body.style.overflow =
        'hidden';

    document.documentElement.style.overflow =
        'hidden';
}

function unlockPageScroll() {
    document.body.style.overflow =
        previousBodyOverflow;

    document.documentElement.style.overflow =
        previousHtmlOverflow;
}

function finishMotion(
    duration,
    callback
) {
    clearMotionTimer();

    if (duration === 0) {
        callback();
        return;
    }

    motionTimer =
        window.setTimeout(() => {
            motionTimer = null;
            callback();
        }, duration + 40);
}

async function openSheet() {
    clearMotionTimer();

    if (!rendered.value) {
        /*
         * Start completely below the screen
         * before Vue renders it.
         */
        translateY.value =
            window.innerHeight;

        transitionEnabled.value = false;
        rendered.value = true;

        lockPageScroll();

        await nextTick();

        measureSheet();

        translateY.value =
            closedPosition();

        await nextTick();

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const duration =
                    motionDuration(
                        OPEN_DURATION
                    );

                currentDuration.value =
                    duration;

                transitionEnabled.value =
                    true;

                isAnimating.value =
                    true;

                translateY.value = 0;

                finishMotion(
                    duration,
                    () => {
                        isAnimating.value =
                            false;

                        transitionEnabled.value =
                            false;

                        translateY.value = 0;
                    }
                );
            });
        });

        return;
    }

    snapOpen();
}

function finishClose(
    shouldEmit
) {
    clearMotionTimer();

    isAnimating.value = false;
    isDragging.value = false;
    transitionEnabled.value = false;

    pointerId.value = null;
    pointerVelocity.value = 0;

    rendered.value = false;

    unlockPageScroll();

    if (!shouldEmit) {
        return;
    }

    emit(
        'update:modelValue',
        false
    );

    emit('close');
}

function animateClose(
    shouldEmit = true
) {
    if (
        !rendered.value ||
        isAnimating.value &&
        translateY.value >
            sheetHeight.value * 0.8
    ) {
        return;
    }

    clearMotionTimer();

    measureSheet();

    isDragging.value = false;
    pointerId.value = null;

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

    /*
     * If the user already dragged the sheet
     * halfway down, closing should finish faster.
     */
    const calculatedDuration =
        Math.max(
            180,
            CLOSE_DURATION * ratio
        );

    const duration =
        motionDuration(
            calculatedDuration
        );

    currentDuration.value =
        duration;

    transitionEnabled.value =
        true;

    isAnimating.value = true;

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
            220,
            SNAP_DURATION * ratio
        );

    const duration =
        motionDuration(
            calculatedDuration
        );

    currentDuration.value =
        duration;

    transitionEnabled.value =
        true;

    isAnimating.value = true;
    isDragging.value = false;

    translateY.value = 0;

    finishMotion(
        duration,
        () => {
            isAnimating.value = false;
            transitionEnabled.value = false;

            translateY.value = 0;
        }
    );
}

function requestClose() {
    animateClose(true);
}

function handleBackdropClick() {
    if (!props.closeOnBackdrop) {
        return;
    }

    requestClose();
}

function rubberBand(distance) {
    if (distance >= 0) {
        return distance;
    }

    /*
     * Small resistance when trying to drag
     * above the fully opened position.
     */
    return -Math.min(
        18,
        Math.sqrt(
            Math.abs(distance)
        ) * 2
    );
}

function handlePointerDown(event) {
    if (
        !props.draggable ||
        isAnimating.value ||
        event.button !== 0
    ) {
        return;
    }

    measureSheet();

    clearMotionTimer();

    transitionEnabled.value = false;

    pointerId.value =
        event.pointerId;

    pointerStartY.value =
        event.clientY -
        translateY.value;

    previousPointerY.value =
        event.clientY;

    previousPointerTime.value =
        performance.now();

    pointerVelocity.value = 0;
    isDragging.value = true;

    event.currentTarget
        .setPointerCapture(
            event.pointerId
        );
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
        event.clientY -
        previousPointerY.value;

    /*
     * Smooth the velocity instead of replacing
     * it every frame. This makes flick gestures
     * much less erratic.
     */
    const instantVelocity =
        movement / elapsed;

    pointerVelocity.value =
        pointerVelocity.value * 0.7 +
        instantVelocity * 0.3;

    previousPointerY.value =
        event.clientY;

    previousPointerTime.value =
        now;

    const distance =
        event.clientY -
        pointerStartY.value;

    translateY.value =
        rubberBand(distance);
}

function handlePointerUp(event) {
    if (
        !isDragging.value ||
        pointerId.value !==
            event.pointerId
    ) {
        return;
    }

    const distance =
        Math.max(
            translateY.value,
            0
        );

    const distanceThreshold =
        Math.min(
            sheetHeight.value * 0.24,
            170
        );

    const velocityThreshold =
        0.5;

    const shouldClose =
        distance >=
            distanceThreshold ||
        pointerVelocity.value >=
            velocityThreshold;

    isDragging.value = false;
    pointerId.value = null;

    if (shouldClose) {
        animateClose(true);
        return;
    }

    pointerVelocity.value = 0;

    snapOpen();
}

function handlePointerCancel() {
    if (!isDragging.value) {
        return;
    }

    isDragging.value = false;
    pointerId.value = null;
    pointerVelocity.value = 0;

    snapOpen();
}

function handleKeydown(event) {
    if (
        event.key !== 'Escape' ||
        !props.closeOnEscape ||
        !rendered.value
    ) {
        return;
    }

    requestClose();
}

function handleResize() {
    if (!rendered.value) {
        return;
    }

    measureSheet();
}

watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen) {
            openSheet();
            return;
        }

        /*
         * External v-model change.
         *
         * Keep the component rendered until
         * its closing animation finishes.
         */
        if (rendered.value) {
            animateClose(false);
        }
    },
    {
        immediate: true,
    }
);

if (
    typeof window !== 'undefined'
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
                bg-green/15
                [will-change:opacity]
            "
            :style="backdropStyle"
            @click="handleBackdropClick"
        />

        <!-- Sheet -->
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
            :style="sheetStyle"
            @click.stop
        >
            <!-- Drag area -->
            <div
                class="
                    relative
                    flex
                    min-h-10
                    shrink-0
                    touch-none
                    select-none
                    items-center
                    justify-center
                    px-5
                    cursor-grab
                    active:cursor-grabbing
                "
                @pointerdown="handlePointerDown"
                @pointermove="handlePointerMove"
                @pointerup="handlePointerUp"
                @pointercancel="handlePointerCancel"
            >
                <!-- Handle -->
                <span
                    class="
                        h-1.5
                        w-12
                        rounded-full
                        transition-[transform]
                        duration-200
                        ease-out
                        [will-change:transform]
                        bg-green/15
                    "
                    aria-hidden="true"
                />

                <!-- Close -->
                <button
                    type="button"
                    class="
                        hidden
                        lg:absolute
                        right-5
                        top-1/2
                        flex
                        size-5
                        -translate-y-1/2
                        items-center
                        justify-center
                        rounded-full
                        text-green/50
                        transition-[background-color,transform]
                        duration-200
                        hover:bg-green/8
                        active:scale-90
                    "
                    aria-label="Zavrieť"
                    @pointerdown.stop
                    @click.stop="requestClose"
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
            </div>

            <!-- Content -->
            <div
                class="
                    min-h-0
                    flex-1
                    overflow-y-auto
                    overscroll-contain
                    px-5
                    pb-[calc(2rem+env(safe-area-inset-bottom))]
                    sm:px-8
                    lg:px-12
                "
            >
                <slot />
            </div>
        </section>
    </Teleport>
</template>