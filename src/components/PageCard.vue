<script setup>
import {
    computed,
    ref,
    watch
} from 'vue'

import {
    useScrollMotion
} from '../composables/useScrollMotion'

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

const rootElementRef =
    ref(null)

const {
    motionRoot
} = useScrollMotion({
    axis:
        'y',

    selector:
        '[data-page-card-scroll-motion="true"]',

    includeRoot:
        true,

    /*
     * Stronger vertical movement.
     *
     * No horizontal movement and no
     * resting rotation.
     */
    velocityMultiplier:
        0.14,

    velocityDecay:
        0.83,

    maxVelocity:
        10,

    travelMultiplier:
        3,

    straightenVelocity:
        5
})

const isStackDragActive =
    ref(false)

const stackDragX =
    ref(0)

const stackDragY =
    ref(0)

const stackDragRotate =
    ref(0)

const suppressPreviewActivate =
    ref(false)

const topBarPointerId =
    ref(null)

const topBarPointerStartX =
    ref(0)

const topBarPointerStartY =
    ref(0)

const topBarPointerMoved =
    ref(false)

const CARD_SHADOW =
    'var(--shadow-strong)'

let stackDragPointerId =
    null

let stackDragStartX =
    0

let stackDragStartY =
    0

const isPreviewMode =
    computed(() => {
        return !props.visual.isOpen
    })

const previewEffectsReady =
    computed(() => {
        return (
            props.visual
                .previewEffectsReady ??
            true
        )
    })

const usesScrollMotion =
    computed(() => {
        return Boolean(
            isPreviewMode.value &&
            props.visual.interactive &&
            previewEffectsReady.value &&
            !props.reducedMotion
        )
    })

/*
 * Page cards always rest straight.
 */
const scrollMotionBaseRotation =
    computed(() => {
        return 0
    })

const scrollMotionSeed =
    computed(() => {
        return (
            props.visual
                .motionSeed ??
            0
        )
    })

const isMenuMorphOpen =
    computed(() => {
        return Boolean(
            props.visual.isOpen &&
            props.visual
                .showExpandedControls
        )
    })

const isMenuActionReady =
    computed(() => {
        return isMenuMorphOpen.value
    })

const cardLabel =
    computed(() => {
        return (
            props.card.menuLabel ??
            props.card.label ??
            props.card.title ??
            props.card.name ??
            ''
        )
    })

const transitionDuration =
    computed(() => {
        return props.reducedMotion
            ? 0
            : props.visual
                .transitionMs ??
                0
    })

const usesFixedTransitionBox =
    computed(() => {
        return Boolean(
            props.visual.fixedBox
        )
    })

const contentContainerClass =
    computed(() => {
        return (
            'flex min-h-full flex-col'
        )
    })

const menuControlStyle =
    computed(() => {
        const dragProgress =
            props.visual
                .dragProgress ??
            0

        return {
            transform: [
                `translate3d(0, ${dragProgress * 3}px, 0)`,

                `scale(${1 - dragProgress * 0.025})`
            ].join(' ')
        }
    })

const cardStyle =
    computed(() => {
        /*
         * Fixed opening / closing transition.
         */
        if (
            usesFixedTransitionBox.value
        ) {
            const box =
                props.visual.fixedBox

            const fixedAnchor =
                props.visual
                    .fixedAnchor ??
                'left'

            const fixedTimingFunction =
                props.visual
                    .fixedTimingFunction ??
                'cubic-bezier(0.22, 1, 0.36, 1)'

            const fixedTransitionProperty =
                props.visual
                    .fixedTransitionProperty ??
                [
                    'top',
                    'left',
                    'width',
                    'height',
                    'border-radius',
                    'box-shadow'
                ].join(', ')

            const fixedWillChange =
                props.visual
                    .fixedWillChange ??
                [
                    'top',
                    'left',
                    'width',
                    'height',
                    'border-radius',
                    'box-shadow'
                ].join(', ')

            const fixedTransformOrigin =
                props.visual
                    .fixedTransformOrigin ??
                'center top'

            const usesCenterAnchor =
                fixedAnchor ===
                'center'

            const fixedLeft =
                usesCenterAnchor
                    ? `${box.left + box.width / 2}px`
                    : `${box.left}px`

            const fixedTransform =
                usesCenterAnchor
                    ? 'translate3d(-50%, 0, 0)'
                    : 'translate3d(0, 0, 0)'

            const transform =
                props.visual
                    .fixedTransform ??
                fixedTransform

            return {
                position:
                    'fixed',

                top:
                    `${box.top}px`,

                left:
                    fixedLeft,

                width:
                    `${box.width}px`,

                height:
                    `${box.height}px`,

                maxWidth:
                    'none',

                minHeight:
                    '0',

                margin:
                    '0',

                transform,

                transformOrigin:
                    fixedTransformOrigin,

                opacity:
                    props.visual.opacity,

                visibility:
                    props.visual
                        .visibility ??
                    'visible',

                zIndex:
                    props.visual.zIndex,

                boxShadow:
                    CARD_SHADOW,

                borderRadius:
                    `${props.visual.borderRadius}px`,

                overflow:
                    'hidden',

                transitionProperty:
                    fixedTransitionProperty,

                transitionDuration:
                    `${transitionDuration.value}ms`,

                transitionTimingFunction:
                    fixedTimingFunction,

                willChange:
                    fixedWillChange
            }
        }

        /*
         * Expanded page.
         */
        if (
            props.visual.isOpen
        ) {
            return {
                position:
                    'relative',

                width:
                    props.visual.width,

                height:
                    props.visual.height,

                minHeight:
                    props.visual
                        .minHeight ??
                    props.visual.height,

                maxWidth:
                    'none',

                marginInline:
                    'auto',

                transform: [
                    `translate3d(0, ${props.visual.y}px, 0)`,

                    `rotate(${props.visual.rotateDeg ?? 0}deg)`,

                    `scale(${props.visual.scale})`
                ].join(' '),

                transformOrigin:
                    'center top',

                opacity:
                    props.visual.opacity,

                visibility:
                    props.visual
                        .visibility ??
                    'visible',

                zIndex:
                    props.visual.zIndex,

                boxShadow:
                    CARD_SHADOW,

                borderRadius:
                    `${props.visual.borderRadius}px`,

                overflow:
                    'visible',

                transitionProperty: [
                    'transform',
                    'border-radius',
                    'box-shadow'
                ].join(', '),

                transitionDuration:
                    `${transitionDuration.value}ms`,

                transitionTimingFunction:
                    'cubic-bezier(0.22, 1, 0.36, 1)'
            }
        }

        /*
         * Stack / preview mode.
         */

        const stackPlayX =
            isPreviewMode.value &&
            props.visual.interactive
                ? stackDragX.value
                : 0

        const stackPlayY =
            isPreviewMode.value &&
            props.visual.interactive
                ? stackDragY.value
                : 0

        /*
         * Rotation exists ONLY while the
         * user is physically dragging
         * the card sideways.
         *
         * Resting cards always have 0deg.
         */
        const stackPlayRotate =
            isPreviewMode.value &&
            props.visual.interactive
                ? stackDragRotate.value
                : 0

        return {
            '--scroll-x':
                '0px',

            '--scroll-y':
                '0px',

            '--scroll-rotate':
                '0deg',

            '--scroll-scale':
                '1',

            position:
                'absolute',

            top:
                '0',

            left:
                '50%',

            width:
                props.visual.width,

            height:
                props.visual.height,

            transform: [
                /*
                 * Existing horizontal centering.
                 */
                'translate3d(-50%, 0, 0)',

                /*
                 * Direct user card drag.
                 */
                `translate3d(${stackPlayX}px, ${stackPlayY}px, 0)`,

                /*
                 * Existing stack layout.
                 */
                `translate3d(0, ${props.visual.y}px, 0)`,

                /*
                 * Shared vertical scroll inertia.
                 */
                'translate3d(0, var(--scroll-y, 0px), 0)',

                /*
                 * Only direct pointer drag can
                 * rotate a PageCard.
                 */
                `rotate(${stackPlayRotate}deg)`,

                /*
                 * Existing stack depth scale.
                 */
                `scale(${props.visual.scale ?? 1})`,

                /*
                 * Very subtle physical compression.
                 */
                'scale(var(--scroll-scale, 1))'
            ].join(' '),

            transformOrigin:
                'center top',

            opacity:
                props.visual.opacity,

            visibility:
                props.visual
                    .visibility ??
                'visible',

            zIndex:
                props.visual.zIndex,

            boxShadow:
                CARD_SHADOW,

            borderRadius:
                `${props.visual.borderRadius}px`,

            overflow:
                'hidden',

            transitionProperty: [
                'transform',
                'opacity',
                'box-shadow',
                'border-radius'
            ].join(', '),

            transitionDuration:
                `${transitionDuration.value}ms`,

            transitionTimingFunction:
                'cubic-bezier(0.22, 1, 0.36, 1)'
        }
    })

const cardClass =
    computed(() => {
        return {
            'pointer-events-none':
                !props.visual.interactive,

            'is-expanded':
                props.visual.isOpen,

            'will-change-transform':
                true,

            'rounded-[2rem]':
                true,

            'touch-none':
                isPreviewMode.value &&
                props.visual.interactive,

            'cursor-grab':
                isPreviewMode.value &&
                props.visual.interactive,

            'cursor-grabbing':
                props.visual.isDragging ||
                isStackDragActive.value
        }
    })

function setRootElement(
    element
) {
    rootElementRef.value =
        element

    motionRoot.value =
        element

    emit(
        'card-element-change',
        {
            cardId:
                props.card.id,

            element
        }
    )
}

watch(
    () => [
        isPreviewMode.value,
        usesFixedTransitionBox.value,
        previewEffectsReady.value
    ],

    (
        [
            isPreview,
            isFixedTransition,
            effectsReady
        ]
    ) => {
        if (
            !isPreview ||
            isFixedTransition ||
            !effectsReady
        ) {
            /*
             * If state changes during a
             * manual drag, remove the
             * temporary pointer transform.
             */
            stackDragX.value =
                0

            stackDragY.value =
                0

            stackDragRotate.value =
                0

            isStackDragActive.value =
                false
        }
    }
)

function activateCard() {
    emit(
        'activate',
        rootElementRef.value
    )
}

function handleClick() {
    if (
        suppressPreviewActivate.value
    ) {
        suppressPreviewActivate.value =
            false

        return
    }

    if (
        !isPreviewMode.value
    ) {
        return
    }

    activateCard()
}

function onKeydown(
    event
) {
    if (
        !isPreviewMode.value
    ) {
        return
    }

    if (
        event.key ===
            'Enter' ||
        event.key ===
            ' '
    ) {
        event.preventDefault()

        activateCard()
    }
}

function onMenuControlClick() {
    if (
        topBarPointerMoved.value
    ) {
        topBarPointerMoved.value =
            false

        return
    }

    if (
        isPreviewMode.value
    ) {
        activateCard()

        return
    }

    if (
        isMenuActionReady.value
    ) {
        emit(
            'minimize'
        )
    }
}

function onTopBarPointerDown(
    event
) {
    if (
        !props.visual.isOpen
    ) {
        return
    }

    topBarPointerId.value =
        event.pointerId

    topBarPointerStartX.value =
        event.clientX

    topBarPointerStartY.value =
        event.clientY

    topBarPointerMoved.value =
        false

    try {
        event.currentTarget
            ?.setPointerCapture?.(
                event.pointerId
            )
    } catch {
        //
    }

    emit(
        'handle-pointer-down',
        event
    )
}

function onTopBarPointerMove(
    event
) {
    if (
        !props.visual.isOpen ||
        topBarPointerId.value !==
            event.pointerId
    ) {
        return
    }

    const distanceX =
        event.clientX -
        topBarPointerStartX.value

    const distanceY =
        event.clientY -
        topBarPointerStartY.value

    if (
        Math.abs(
            distanceX
        ) >
            5 ||
        Math.abs(
            distanceY
        ) >
            5
    ) {
        topBarPointerMoved.value =
            true
    }

    emit(
        'handle-pointer-move',
        event
    )
}

function onTopBarPointerUp(
    event
) {
    if (
        !props.visual.isOpen ||
        topBarPointerId.value !==
            event.pointerId
    ) {
        return
    }

    try {
        event.currentTarget
            ?.releasePointerCapture?.(
                event.pointerId
            )
    } catch {
        //
    }

    emit(
        'handle-pointer-up',
        event
    )

    topBarPointerId.value =
        null
}

function onTopBarPointerCancel(
    event
) {
    if (
        !props.visual.isOpen ||
        topBarPointerId.value !==
            event.pointerId
    ) {
        return
    }

    emit(
        'handle-pointer-cancel',
        event
    )

    topBarPointerId.value =
        null

    topBarPointerMoved.value =
        false
}

function shouldIgnoreCardDragStart(
    target
) {
    return Boolean(
        target?.closest?.(
            [
                'button',
                'a',
                'input',
                'textarea',
                'select',
                'label',
                '[data-no-drag]'
            ].join(', ')
        )
    )
}

function beginStackDrag(
    event
) {
    isStackDragActive.value =
        true

    suppressPreviewActivate.value =
        false

    stackDragPointerId =
        event.pointerId

    stackDragStartX =
        event.clientX

    stackDragStartY =
        event.clientY

    try {
        event.currentTarget
            ?.setPointerCapture?.(
                event.pointerId
            )
    } catch {
        //
    }
}

function updateStackDrag(
    event
) {
    if (
        !isStackDragActive.value ||
        event.pointerId !==
            stackDragPointerId
    ) {
        return
    }

    const rawX =
        event.clientX -
        stackDragStartX

    const rawY =
        event.clientY -
        stackDragStartY

    const clampedX =
        Math.max(
            -34,
            Math.min(
                34,
                rawX
            )
        )

    const clampedY =
        Math.max(
            -24,
            Math.min(
                24,
                rawY
            )
        )

    stackDragX.value =
        clampedX

    stackDragY.value =
        clampedY

    /*
     * Rotation only happens while the
     * user directly pulls sideways.
     */
    stackDragRotate.value =
        clampedX *
        0.08

    if (
        Math.abs(
            clampedX
        ) >
            4 ||
        Math.abs(
            clampedY
        ) >
            4
    ) {
        suppressPreviewActivate.value =
            true
    }
}

function endStackDrag(
    event
) {
    if (
        !isStackDragActive.value ||
        event.pointerId !==
            stackDragPointerId
    ) {
        return
    }

    try {
        event.currentTarget
            ?.releasePointerCapture?.(
                event.pointerId
            )
    } catch {
        //
    }

    isStackDragActive.value =
        false

    stackDragX.value =
        0

    stackDragY.value =
        0

    stackDragRotate.value =
        0

    stackDragPointerId =
        null
}

function onCardPointerDown(
    event
) {
    if (
        shouldIgnoreCardDragStart(
            event.target
        )
    ) {
        return
    }

    if (
        isPreviewMode.value &&
        props.visual.interactive
    ) {
        beginStackDrag(
            event
        )
    }
}

function onCardPointerMove(
    event
) {
    if (
        isStackDragActive.value
    ) {
        updateStackDrag(
            event
        )
    }
}

function onCardPointerUp(
    event
) {
    if (
        isStackDragActive.value
    ) {
        endStackDrag(
            event
        )
    }
}

function onCardPointerCancel(
    event
) {
    if (
        isStackDragActive.value
    ) {
        endStackDrag(
            event
        )
    }
}

function onTransitionEnd(
    event
) {
    if (
        event.target !==
        event.currentTarget
    ) {
        return
    }

    emit(
        'transition-end',
        event
    )
}
</script>

<template>
    <article
        :ref="
            setRootElement
        "
        class="
            page-card
            bg-green
            text-baige
        "
        :class="
            cardClass
        "
        :style="
            cardStyle
        "
        :data-page-card-scroll-motion="
            usesScrollMotion
                ? 'true'
                : undefined
        "
        :data-motion-seed="
            usesScrollMotion
                ? scrollMotionSeed
                : undefined
        "
        :data-base-rotation="
            usesScrollMotion
                ? 0
                : undefined
        "
        :data-rotation-mode="
            usesScrollMotion
                ? 'absolute'
                : undefined
        "
        :data-motion-strength="
            usesScrollMotion
                ? 1
                : undefined
        "
        :data-straighten-strength="
            usesScrollMotion
                ? 0
                : undefined
        "
        :data-max-y="
            usesScrollMotion
                ? 36
                : undefined
        "
        :data-max-scale="
            usesScrollMotion
                ? 0.003
                : undefined
        "
        :data-position-response="
            usesScrollMotion
                ? 0.145
                : undefined
        "
        :data-rotation-response="
            usesScrollMotion
                ? 0.145
                : undefined
        "
        :data-scale-response="
            usesScrollMotion
                ? 0.145
                : undefined
        "
        :aria-current="
            visual.isOpen
                ? 'page'
                : undefined
        "
        :tabindex="
            isPreviewMode &&
            visual.interactive
                ? 0
                : -1
        "
        :role="
            isPreviewMode &&
            visual.interactive
                ? 'button'
                : undefined
        "
        @click="
            handleClick
        "
        @keydown="
            onKeydown
        "
        @pointerdown="
            onCardPointerDown
        "
        @pointermove="
            onCardPointerMove
        "
        @pointerup="
            onCardPointerUp
        "
        @pointercancel="
            onCardPointerCancel
        "
        @transitionend="
            onTransitionEnd
        "
    >
        <div
            :class="
                contentContainerClass
            "
        >
            <div
                class="
                    relative
                    z-50
                    flex
                    h-[4.5rem]
                    w-full
                    shrink-0
                    touch-none
                    items-center
                    justify-end
                    px-5
                "
                :class="{
                    'cursor-grab':
                        visual.isOpen &&
                        !visual.isDragging,

                    'cursor-grabbing':
                        visual.isDragging
                }"
                aria-label="Potiahnutím nadol minimalizovať stránku"
                @pointerdown.stop="
                    onTopBarPointerDown
                "
                @pointermove.stop="
                    onTopBarPointerMove
                "
                @pointerup.stop="
                    onTopBarPointerUp
                "
                @pointercancel.stop="
                    onTopBarPointerCancel
                "
            >
                <button
                    type="button"
                    class="
                        page-card-menu
                        relative
                        z-10
                        inline-flex
                        min-h-11
                        max-w-full
                        cursor-pointer
                        items-center
                        justify-end
                        px-4
                        py-2
                        text-right
                        text-baige/50
                        outline-none
                        transition-[transform]
                        duration-300
                        ease-[cubic-bezier(0.16,1,0.3,1)]

                        active:scale-[0.98]

                        focus-visible:ring-2
                        focus-visible:ring-baige
                        focus-visible:ring-offset-2
                        focus-visible:ring-offset-green
                    "
                    :class="{
                        'page-card-menu--open':
                            isMenuMorphOpen,

                        'pointer-events-none opacity-60':
                            visual.isOpen &&
                            !isMenuActionReady
                    }"
                    :style="
                        menuControlStyle
                    "
                    :aria-label="
                        isMenuMorphOpen
                            ? 'Otvoriť hlavné menu'
                            : `Otvoriť stránku ${cardLabel}`
                    "
                    @pointerdown.stop
                    @pointerup.stop
                    @pointercancel.stop
                    @click.stop="
                        onMenuControlClick
                    "
                >
                    <span
                        class="
                            page-card-menu__text-window
                            relative
                            inline-grid
                            h-5
                            min-w-0
                            overflow-hidden
                            text-right
                        "
                        aria-hidden="true"
                    >
                        <span
                            class="
                                page-card-menu__label
                                page-card-menu__label--card
                                text-regular
                                col-start-1
                                row-start-1
                                whitespace-nowrap
                                font-bold
                            "
                        >
                            {{ cardLabel }}
                        </span>

                        <span
                            class="
                                page-card-menu__label
                                page-card-menu__label--menu
                                text-regular
                                col-start-1
                                row-start-1
                                whitespace-nowrap
                                font-bold
                            "
                        >
                            Hlavné menu
                        </span>
                    </span>

                    <span
                        class="
                            page-card-menu__icon
                        "
                        aria-hidden="true"
                    >
                        <span
                            class="
                                page-card-menu__line
                                page-card-menu__line--primary
                            "
                        />

                        <span
                            class="
                                page-card-menu__line
                                page-card-menu__line--secondary
                            "
                        />
                    </span>
                </button>
            </div>

            <component
                :is="
                    card.component
                "
                :expanded="
                    true
                "
            />
        </div>
    </article>
</template>

<style scoped>
.page-card-menu__text-window {
    width:
        max-content;
}

.page-card-menu__label {
    display:
        block;

    min-width:
        max-content;

    text-align:
        right;

    transition:
        transform 620ms
            cubic-bezier(
                0.16,
                1,
                0.3,
                1
            ),
        opacity 320ms ease;

    will-change:
        transform,
        opacity;
}

.page-card-menu__label--card {
    opacity:
        1;

    transform:
        translate3d(
            0,
            0,
            0
        );
}

.page-card-menu__label--menu {
    opacity:
        0;

    transform:
        translate3d(
            8px,
            115%,
            0
        );
}

.page-card-menu--open
.page-card-menu__label--card {
    opacity:
        0;

    transform:
        translate3d(
            -8px,
            -115%,
            0
        );
}

.page-card-menu--open
.page-card-menu__label--menu {
    opacity:
        1;

    transform:
        translate3d(
            0,
            0,
            0
        );
}

.page-card-menu__icon {
    position:
        relative;

    display:
        block;

    width:
        2px;

    height:
        20px;

    margin-left:
        12px;

    flex-shrink:
        0;

    overflow:
        visible;

    transition:
        width 660ms
            cubic-bezier(
                0.16,
                1,
                0.3,
                1
            );

    will-change:
        width;
}

.page-card-menu--open
.page-card-menu__icon {
    width:
        16px;
}

.page-card-menu__line {
    position:
        absolute;

    top:
        50%;

    left:
        50%;

    display:
        block;

    width:
        16px;

    height:
        2px;

    border-radius:
        9999px;

    background:
        currentColor;

    transform-origin:
        center;

    transition:
        transform 660ms
            cubic-bezier(
                0.16,
                1,
                0.3,
                1
            ),
        opacity 300ms ease;

    will-change:
        transform,
        opacity;
}

.page-card-menu__line--primary {
    transform:
        translate3d(
            -50%,
            -50%,
            0
        )
        rotate(90deg)
        scaleX(1);
}

.page-card-menu__line--secondary {
    opacity:
        0;

    transform:
        translate3d(
            -50%,
            -50%,
            0
        )
        rotate(0deg)
        scaleX(0);
}

.page-card-menu--open
.page-card-menu__line--primary {
    transform:
        translate3d(
            -50%,
            -4px,
            0
        )
        rotate(0deg)
        scaleX(1);
}

.page-card-menu--open
.page-card-menu__line--secondary {
    opacity:
        1;

    transform:
        translate3d(
            -50%,
            4px,
            0
        )
        rotate(0deg)
        scaleX(1);
}

@media (
    prefers-reduced-motion:
    reduce
) {
    .page-card-menu,
    .page-card-menu__label,
    .page-card-menu__icon,
    .page-card-menu__line {
        transition-duration:
            0ms !important;
    }
}
</style>