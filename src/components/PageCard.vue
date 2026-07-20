<script setup>
import {
    computed,
    onMounted,
    onUnmounted,
    onUpdated,
    ref,
    watch
} from 'vue'

const props = defineProps({
    card: {
        type: Object,
        required: true
    },
    mode: {
        type: String,
        required: true
    },
    visual: {
        type: Object,
        required: true
    },
    reducedMotion: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits([
    'activate',
    'handle-pointer-down',
    'handle-pointer-move',
    'handle-pointer-up',
    'handle-pointer-cancel',
    'minimize',
    'transition-end',
    'card-element-change'
])

const rootElementRef = ref(null)
const isHovered = ref(false)
const isStackDragActive = ref(false)
const stackDragX = ref(0)
const stackDragY = ref(0)
const stackDragRotate = ref(0)
const suppressPreviewActivate = ref(false)

const CARD_SHADOW =
    '0 28px 70px rgba(18, 33, 24, 0.30), 0 10px 28px rgba(18, 33, 24, 0.20)'
    
let stackDragPointerId = null
let stackDragStartX = 0
let stackDragStartY = 0

const isPreviewMode = computed(() => !props.visual.isOpen)

const transitionDuration = computed(() => {
    return props.reducedMotion
        ? 0
        : props.visual.transitionMs ?? 0
})

const usesFixedTransitionBox = computed(() => {
    return Boolean(props.visual.fixedBox)
})

const previewEffectsReady = computed(() => {
    return props.visual.previewEffectsReady ?? true
})

const cardStyle = computed(() => {
    if (usesFixedTransitionBox.value) {
        const box = props.visual.fixedBox
        const fixedAnchor =
            props.visual.fixedAnchor ?? 'left'
        const fixedTimingFunction =
            props.visual.fixedTimingFunction ??
            'cubic-bezier(0.22, 1, 0.36, 1)'

        const usesCenterAnchor =
            fixedAnchor === 'center'

        const fixedLeft = usesCenterAnchor
            ? `${box.left + box.width / 2}px`
            : `${box.left}px`

        const fixedTransform = usesCenterAnchor
            ? 'translate3d(-50%, 0, 0)'
            : 'translate3d(0, 0, 0)'

        return {
            position: 'fixed',
            top: `${box.top}px`,
            left: fixedLeft,
            width: `${box.width}px`,
            height: `${box.height}px`,
            maxWidth: 'none',
            minHeight: '0',
            margin: '0',
            transform: fixedTransform,
            transformOrigin: 'center top',
            opacity: props.visual.opacity,
            visibility: props.visual.visibility ?? 'visible',
            zIndex: props.visual.zIndex,
            boxShadow: CARD_SHADOW,
            borderRadius: `${props.visual.borderRadius}px`,
            overflow: 'hidden',
            transitionProperty: [
                'top',
                'width',
                'height',
                'border-radius'
            ].join(', '),
            transitionDuration: `${transitionDuration.value}ms`,
            transitionTimingFunction: fixedTimingFunction,
            willChange: 'top, width, height'
        }
    }

    if (props.visual.isOpen) {
        return {
            position: 'relative',
            width: props.visual.width,
            height: props.visual.height,
            minHeight: props.visual.minHeight,
            maxWidth: 'none',
            marginInline: 'auto',
            transform: [
                `translate3d(0, ${props.visual.y}px, 0)`,
                `rotate(${props.visual.rotateDeg ?? 0}deg)`,
                `scale(${props.visual.scale})`
            ].join(' '),
            transformOrigin: 'center top',
            opacity: props.visual.opacity,
            visibility: props.visual.visibility ?? 'visible',
            zIndex: props.visual.zIndex,
            boxShadow: CARD_SHADOW,
            borderRadius: `${props.visual.borderRadius}px`,
            overflow: 'visible',
            transitionProperty: [
                'transform',
                'border-radius'
            ].join(', '),
            transitionDuration: `${transitionDuration.value}ms`,
            transitionTimingFunction:
                'cubic-bezier(0.22, 1, 0.36, 1)'
        }
    }

    const hoverTiltDeg =
        isPreviewMode.value &&
        previewEffectsReady.value &&
        isHovered.value
            ? -0.7
            : 0

    const stackPlayX =
        isPreviewMode.value && props.visual.interactive
            ? stackDragX.value
            : 0

    const stackPlayY =
        isPreviewMode.value && props.visual.interactive
            ? stackDragY.value
            : 0

    const stackPlayRotate =
        isPreviewMode.value && props.visual.interactive
            ? stackDragRotate.value
            : 0

    const stackedRotate =
        stackPlayRotate + hoverTiltDeg

    return {
        position: 'absolute',
        bottom: '0',
        left: '50%',
        width: props.visual.width,
        height: props.visual.height,
        transform: [
            'translate3d(-50%, 0, 0)',
            `translate3d(${stackPlayX}px, ${stackPlayY}px, 0)`,
            `translate3d(0, ${props.visual.y}px, 0)`,
            `rotate(${stackedRotate}deg)`,
            `scale(${props.visual.scale ?? 1})`
        ].join(' '),
        transformOrigin: 'center bottom',
        opacity: props.visual.opacity,
        visibility: props.visual.visibility ?? 'visible',
        zIndex: props.visual.zIndex,
        boxShadow: CARD_SHADOW,
        borderRadius: `${props.visual.borderRadius}px`,
        overflow: 'hidden',
        transitionProperty: [
            'transform',
            'opacity',
            'box-shadow',
            'border-radius'
        ].join(', '),
        transitionDuration: `${transitionDuration.value}ms`,
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
    }
})

const cardClass = computed(() => {
    return {
        'pointer-events-none': !props.visual.interactive,
        'is-expanded': props.visual.isOpen,
        'will-change-transform': true,
        'rounded-[2rem]': true,
        'touch-none':
            isPreviewMode.value && props.visual.interactive,
        'cursor-grab':
            (props.visual.isOpen && !props.visual.isDragging) ||
            (isPreviewMode.value && props.visual.interactive),
        'cursor-grabbing':
            props.visual.isDragging ||
            isStackDragActive.value
    }
})

function emitCardElementChange(element) {
    emit('card-element-change', {
        cardId: props.card.id,
        element
    })
}

onMounted(() => {
    emitCardElementChange(rootElementRef.value)
})

onUpdated(() => {
    emitCardElementChange(rootElementRef.value)
})

onUnmounted(() => {
    emitCardElementChange(null)
})

watch(
    () => [
        isPreviewMode.value,
        usesFixedTransitionBox.value,
        previewEffectsReady.value
    ],
    ([isPreview, isFixedTransition, effectsReady]) => {
        // Prevent stale hover tilt from snapping in at minimize handoff.
        if (!isPreview || isFixedTransition || !effectsReady) {
            isHovered.value = false
        }
    }
)

function handleClick() {
    if (suppressPreviewActivate.value) {
        suppressPreviewActivate.value = false
        return
    }

    if (!isPreviewMode.value) {
        return
    }

    emit('activate', rootElementRef.value)
}

function onKeydown(event) {
    if (!isPreviewMode.value) {
        return
    }

    if (
        event.key === 'Enter' ||
        event.key === ' '
    ) {
        event.preventDefault()
        emit('activate', rootElementRef.value)
    }
}

function onHandlePointerDown(event) {
    if (!props.visual.isOpen) {
        return
    }

    emit('handle-pointer-down', event)
}

function shouldIgnoreCardDragStart(target) {
    return Boolean(
        target?.closest?.(
            'button, a, input, textarea, select, label, [data-no-drag]'
        )
    )
}

function beginStackDrag(event) {
    isStackDragActive.value = true
    suppressPreviewActivate.value = false
    stackDragPointerId = event.pointerId
    stackDragStartX = event.clientX
    stackDragStartY = event.clientY

    try {
        event.currentTarget?.setPointerCapture?.(
            event.pointerId
        )
    } catch {
        // Pointer capture is optional.
    }
}

function updateStackDrag(event) {
    if (
        !isStackDragActive.value ||
        event.pointerId !== stackDragPointerId
    ) {
        return
    }

    const rawX = event.clientX - stackDragStartX
    const rawY = event.clientY - stackDragStartY

    const clampedX = Math.max(-34, Math.min(34, rawX))
    const clampedY = Math.max(-24, Math.min(24, rawY))

    stackDragX.value = clampedX
    stackDragY.value = clampedY
    stackDragRotate.value = clampedX * 0.08

    if (
        Math.abs(clampedX) > 4 ||
        Math.abs(clampedY) > 4
    ) {
        suppressPreviewActivate.value = true
    }
}

function endStackDrag(event) {
    if (
        !isStackDragActive.value ||
        event.pointerId !== stackDragPointerId
    ) {
        return
    }

    try {
        event.currentTarget?.releasePointerCapture?.(
            event.pointerId
        )
    } catch {
        // Pointer capture might not exist.
    }

    isStackDragActive.value = false
    stackDragX.value = 0
    stackDragY.value = 0
    stackDragRotate.value = 0
    stackDragPointerId = null
}

function onCardPointerDown(event) {
    if (shouldIgnoreCardDragStart(event.target)) {
        return
    }

    if (
        isPreviewMode.value &&
        props.visual.interactive
    ) {
        beginStackDrag(event)
        return
    }

    if (!props.visual.isOpen) {
        return
    }

    emit('handle-pointer-down', event)
}

function onCardPointerMove(event) {
    if (isStackDragActive.value) {
        updateStackDrag(event)
        return
    }

    if (!props.visual.isOpen) {
        return
    }

    emit('handle-pointer-move', event)
}

function onCardPointerUp(event) {
    if (isStackDragActive.value) {
        endStackDrag(event)
        return
    }

    if (!props.visual.isOpen) {
        return
    }

    emit('handle-pointer-up', event)
}

function onCardPointerCancel(event) {
    if (isStackDragActive.value) {
        endStackDrag(event)
        return
    }

    if (!props.visual.isOpen) {
        return
    }

    emit('handle-pointer-cancel', event)
}

function onHandlePointerMove(event) {
    emit('handle-pointer-move', event)
}

function onHandlePointerUp(event) {
    emit('handle-pointer-up', event)
}

function onHandlePointerCancel(event) {
    emit('handle-pointer-cancel', event)
}

function onTransitionEnd(event) {
    if (event.target !== event.currentTarget) {
        return
    }

    emit('transition-end', event)
}

function onMouseEnter() {
    if (
        !isPreviewMode.value ||
        !previewEffectsReady.value
    ) {
        return
    }

    isHovered.value = true
}

function onMouseLeave() {
    isHovered.value = false
}
</script>

<template>
    <article
        ref="rootElementRef"
        class="
            page-card
            bg-green
            text-baige
        "
        :class="cardClass"
        :style="cardStyle"
        :aria-current="visual.isOpen ? 'page' : undefined"
        :tabindex="isPreviewMode && visual.interactive ? 0 : -1"
        :role="isPreviewMode && visual.interactive ? 'button' : undefined"
        @click="handleClick"
        @keydown="onKeydown"
        @pointerdown="onCardPointerDown"
        @pointermove="onCardPointerMove"
        @pointerup="onCardPointerUp"
        @pointercancel="onCardPointerCancel"
        @mouseenter="onMouseEnter"
        @mouseleave="onMouseLeave"
        @transitionend="onTransitionEnd"
    >
        <div class="flex min-h-[min(74dvh,760px)] flex-col">
            <div
                class="
                    flex
                    w-full
                    justify-center
                    px-6
                    pb-3
                    pt-4
                    sm:px-7
                "
            >
                <button
                    type="button"
                    class="
                        flex
                        min-h-10
                        w-20
                        touch-none
                        items-start
                        justify-center
                        rounded-full
                        transition-opacity
                        duration-200
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-baige/90
                        focus-visible:ring-offset-2
                        focus-visible:ring-offset-green
                    "
                    :class="visual.isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'"
                    aria-label="Potiahnutím nadol minimalizovať stránku"
                    @pointerdown.stop="onHandlePointerDown"
                    @pointermove.stop="onHandlePointerMove"
                    @pointerup.stop="onHandlePointerUp"
                    @pointercancel.stop="onHandlePointerCancel"
                >
                    <span
                        class="
                            mt-2
                            h-1.5
                            w-12
                            rounded-full
                            bg-white/40
                            transition-all
                            duration-150
                        "
                        :style="{
                            transform: `translate3d(0, ${-((visual.dragProgress ?? 0) * 1.6)}px, 0) scaleX(${1 + (visual.dragProgress ?? 0) * 0.18})`,
                            opacity: `${0.4 + (visual.dragProgress ?? 0) * 0.4}`
                        }"
                        role="presentation"
                    />
                </button>
            </div>

            <div
                class="
                    touch-none
                    px-6
                    pb-8
                    pt-2
                    sm:px-7
                "
            >
                <div
                    class="mb-6 flex justify-end transition-opacity duration-200"
                    :class="visual.isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'"
                >
                    <button
                        type="button"
                        class="
                            rounded-full
                            border
                            border-baige/35
                            px-3
                            py-1
                            text-xs
                            font-semibold
                            uppercase
                            tracking-[0.1em]
                            text-baige
                            transition-colors
                            hover:bg-baige/10
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-baige/90
                            focus-visible:ring-offset-2
                            focus-visible:ring-offset-green
                        "
                        aria-label="Minimalizovať kartu"
                        @click.stop="emit('minimize')"
                    >
                        Zavrieť
                    </button>
                </div>

                <component
                    :is="card.component"
                    :expanded="visual.isOpen"
                />
            </div>
        </div>
    </article>
</template>
