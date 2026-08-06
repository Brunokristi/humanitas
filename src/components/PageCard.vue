<script setup>
import {
    computed,
    ref
} from 'vue';

const props = defineProps({
    card: {
        type: Object,
        required: true
    },

    variant: {
        type: String,
        required: true,
        validator(value) {
            return [
                'preview',
                'expanded'
            ].includes(value);
        }
    },

    visual: {
        type: Object,
        default: null
    },

    interactive: {
        type: Boolean,
        default: false
    },

    transitioning: {
        type: Boolean,
        default: false
    },

    shared: {
        type: Boolean,
        default: false
    },

    captureMode: {
        type: String,
        default: null
    },

    captureRect: {
        type: Object,
        default: null
    },

    captureScrollY: {
        type: Number,
        default: 0
    }
});

const emit = defineEmits([
    'activate',
    'minimize',
    'element-change'
]);

const rootElement =
    ref(null);

const isPreview = computed(() => {
    return props.variant ===
        'preview';
});

const isExpanded = computed(() => {
    return props.variant ===
        'expanded';
});

const menuLabel = computed(() => {
    return (
        props.card.menuLabel ??
        props.card.label ??
        props.card.title ??
        props.card.name ??
        ''
    );
});

const displayedControlLabel = computed(() => {
    /*
     * Keep the same label on both sides of the frozen
     * transition. It changes to “Hlavné menu” only after
     * the movement has finished, avoiding a text swap
     * inside the animated surface.
     */
    if (props.transitioning) {
        return menuLabel.value;
    }

    return isPreview.value
        ? menuLabel.value
        : 'Hlavné menu';
});

const controlAriaLabel = computed(() => {
    return isPreview.value
        ? `Otvoriť stránku ${menuLabel.value}`
        : 'Späť do hlavného menu';
});

const rootStyle = computed(() => {
    const sharedStyles = {
        viewTransitionName:
            props.shared
                ? 'humanitas-page-surface'
                : 'none'
    };

    if (isPreview.value) {
        return {
            ...sharedStyles,
            position: 'absolute',
            top: '0',
            left:
                props.visual?.baseLeft ??
                '0px',
            width:
                props.visual?.width ??
                '100%',
            height:
                props.visual?.height ??
                'min(70dvh, 680px)',
            minHeight: '0',
            zIndex:
                props.visual?.zIndex ??
                1,
            opacity: 1,
            visibility: 'visible',
            pointerEvents:
                props.interactive
                    ? 'auto'
                    : 'none',
            borderRadius:
                `${props.visual?.borderRadius ?? 32}px`,
            transform: [
                `translate3d(${props.visual?.x ?? 0}px, ${props.visual?.y ?? 0}px, 0)`,
                `scale(${props.visual?.scale ?? 1})`
            ].join(' '),
            transformOrigin:
                'center top',
            transition:
                (
                    props.visual?.transitionMs ??
                    0
                ) > 0
                    ? [
                        'transform',
                        `${props.visual.transitionMs}ms`,
                        props.visual.transitionEasing
                    ].join(' ')
                    : 'none'
        };
    }

    if (
        props.captureMode &&
        props.captureRect
    ) {
        return {
            ...sharedStyles,
            position: 'fixed',
            top:
                `${props.captureRect.top}px`,
            left:
                `${props.captureRect.left}px`,
            width:
                `${props.captureRect.width}px`,
            height:
                `${props.captureRect.height}px`,
            minHeight:
                `${props.captureRect.height}px`,
            margin: '0',
            zIndex: 100,
            opacity: 1,
            pointerEvents: 'none',
            borderRadius: '40px',
            transform:
                'translate3d(0, 0, 0)',
            transition: 'none'
        };
    }

    return {
        ...sharedStyles,
        position: 'relative',
        width: '100%',
        height: 'auto',
        minHeight:
            'calc(100dvh - var(--app-header-height, 0px))',
        margin: '0',
        zIndex: 1,
        opacity: 1,
        pointerEvents:
            props.interactive
                ? 'auto'
                : 'none',
        borderRadius: '40px',
        transform:
            'translate3d(0, 0, 0)',
        transition: 'none'
    };
});

const contentStyle = computed(() => {
    if (isPreview.value) {
        const surfaceWidth =
            Number(
                props.visual?.surfaceWidth
            ) ||
            1;

        const surfaceHeight =
            Number(
                props.visual?.surfaceHeight
            ) ||
            1;

        const surfaceScale =
            Number(
                props.visual?.surfaceScale
            ) ||
            1;

        const surfaceOffsetX =
            Number(
                props.visual?.surfaceOffsetX
            ) ||
            0;

        const surfaceOffsetY =
            Number(
                props.visual?.surfaceOffsetY
            ) ||
            0;

        return {
            position:
                'absolute',
            top:
                `${surfaceOffsetY}px`,
            left:
                `${surfaceOffsetX}px`,
            width:
                `${surfaceWidth}px`,
            height:
                `${surfaceHeight}px`,
            minHeight:
                `${surfaceHeight}px`,
            transform:
                `translate3d(0, 0, 0) scale(${surfaceScale})`,
            transformOrigin:
                'top left'
        };
    }

    if (
        props.captureMode ===
        'closing'
    ) {
        return {
            position:
                'relative',
            top:
                '0',
            left:
                '0',
            width:
                '100%',
            minHeight:
                'inherit',
            transform:
                `translate3d(0, -${Math.max(0, props.captureScrollY)}px, 0)`,
            transformOrigin:
                'top left'
        };
    }

    return {
        position:
            'relative',
        top:
            '0',
        left:
            '0',
        width:
            '100%',
        minHeight:
            'inherit',
        transform:
            'translate3d(0, 0, 0)',
        transformOrigin:
            'top left'
    };
});

const menuLabelStyle = computed(() => {
    return {
        viewTransitionName:
            props.shared
                ? 'humanitas-page-menu'
                : 'none'
    };
});

function setRootElement(element) {
    rootElement.value =
        element;

    emit(
        'element-change',
        element
    );
}

function shouldIgnoreActivationTarget(
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
                'iframe',
                '[data-no-drag]',
                '[contenteditable="true"]'
            ].join(', ')
        )
    );
}

function activate() {
    if (
        !isPreview.value ||
        !props.interactive
    ) {
        return;
    }

    emit(
        'activate',
        rootElement.value
    );
}

function handleClick(event) {
    if (
        shouldIgnoreActivationTarget(
            event.target
        )
    ) {
        return;
    }

    activate();
}

function handleKeydown(event) {
    if (
        !isPreview.value ||
        !props.interactive
    ) {
        return;
    }

    if (
        event.key === 'Enter' ||
        event.key === ' '
    ) {
        event.preventDefault();
        activate();
    }
}

function handleControlClick() {
    if (isPreview.value) {
        activate();

        return;
    }

    emit('minimize');
}
</script>

<template>
    <article
        :ref="setRootElement"
        class="page-card bg-green text-baige shadow-[var(--shadow-strong)]"
        :class="{
            'page-card--preview':
                isPreview,
            'page-card--expanded':
                isExpanded,
            'page-card--capture':
                Boolean(captureMode)
        }"
        :style="rootStyle"
        :tabindex="
            isPreview &&
            interactive
                ? 0
                : -1
        "
        :role="
            isPreview &&
            interactive
                ? 'button'
                : undefined
        "
        :aria-current="
            isExpanded
                ? 'page'
                : undefined
        "
        @click="handleClick"
        @keydown="handleKeydown"
    >
        <div
            class="page-card__capture-content"
            :style="contentStyle"
        >
            <div
                class="page-card__top-bar"
            >
                <button
                    type="button"
                    data-no-drag
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
                        text-baige/65
                        outline-none
                        transition-[color,transform]
                        duration-150
                        ease-out

                        hover:text-baige
                        active:scale-[0.985]

                        focus-visible:ring-2
                        focus-visible:ring-baige
                        focus-visible:ring-offset-2
                        focus-visible:ring-offset-green
                    "
                    :aria-label="controlAriaLabel"
                    @click.stop="handleControlClick"
                >
                    <span
                        class="
                            text-regular
                            whitespace-nowrap
                            font-bold
                        "
                        :style="menuLabelStyle"
                        aria-hidden="true"
                    >
                        {{ displayedControlLabel }}
                    </span>

                    <span
                        class="page-card-menu__divider"
                        aria-hidden="true"
                    />
                </button>
            </div>

            <div
                class="page-card__page-content"
                :class="{
                    'page-card__page-content--preview':
                        isPreview,
                    'page-card__page-content--expanded':
                        isExpanded
                }"
            >
                <component
                    :is="card.component"
                    :expanded="isExpanded"
                    :transitioning="transitioning"
                />
            </div>
        </div>
    </article>
</template>

<style scoped>
.page-card {
    box-sizing: border-box;
    overflow: hidden;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    transform-origin: top left;
}

.page-card__capture-content {
    position: relative;
    min-height: inherit;
    transition: none;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    will-change: transform;
}

.page-card__top-bar {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 50;
    display: flex;
    width: 100%;
    height: 4.5rem;
    align-items: center;
    justify-content: flex-end;
    padding-right: 1.25rem;
    padding-left: 1.25rem;
    pointer-events: auto;
}

.page-card-menu__divider {
    display: block;
    width: 2px;
    height: 1.1rem;
    margin-left: 0.75rem;
    flex-shrink: 0;
    border-radius: 9999px;
    background: currentColor;
    opacity: 0.75;
}

.page-card__page-content {
    box-sizing: border-box;
    width: 100%;
    min-height: inherit;
    padding-top: 4.5rem;
}

.page-card__page-content--preview {
    height: 100%;
    overflow: hidden;
    pointer-events: none;
    user-select: none;
    contain: paint;
}

.page-card__page-content--expanded {
    height: auto;
    overflow: visible;
    touch-action: pan-y;
}

.page-card--preview {
    cursor: pointer;
    contain: layout paint;
}

.page-card--preview:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 4px;
}

.page-card--expanded {
    overflow: hidden;
}

.page-card--capture {
    contain: paint;
    overflow: hidden;
}

@media (
    prefers-reduced-motion:
    reduce
) {
    .page-card,
    .page-card-menu {
        transition: none !important;
    }
}
</style>


<style>
.page-card--transition-clone,
.page-card--transition-clone * {
    animation-play-state: paused !important;
    transition: none !important;
    caret-color: transparent !important;
}

.page-card--transition-clone iframe,
.page-card--transition-clone object,
.page-card--transition-clone embed,
.page-card--transition-clone video,
.page-card--transition-clone canvas {
    visibility: hidden !important;
    opacity: 0 !important;
}
</style>
