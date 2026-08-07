<script setup>
import {
    computed,
    onBeforeUnmount,
    ref,
    watch
} from 'vue';

import {
    useScrollMotion
} from '../composables/useScrollMotion';

import DesktopCarouselControls from './DesktopCarouselControls.vue';

const emit = defineEmits([
    'select'
]);

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
        default: 'Náš tím'
    },

    previousLabel: {
        type: String,
        default: 'Predchádzajúci zamestnanec'
    },

    nextLabel: {
        type: String,
        default: 'Nasledujúci zamestnanec'
    },

    scrollMotion: {
        type: Boolean,
        default: false
    }
});

const scrollMotionEnabled = computed(() => {
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

const stageElement =
    ref(null);

const dragX =
    ref(0);

const cardWidth =
    ref(1);

const isDragging =
    ref(false);

const lastDirection =
    ref(1);

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

const pointerMoved =
    ref(false);

const exitingCards =
    ref({});

const exitTimers =
    new Map();

const cardCount = computed(() => {
    return props.items.length;
});

const dragProgress = computed(() => {
    return Math.min(
        Math.abs(
            dragX.value
        ) /
            Math.max(
                cardWidth.value,
                1
            ),
        1
    );
});

const deckDirection = computed(() => {
    if (
        Math.abs(
            dragX.value
        ) >
        2
    ) {
        return dragX.value < 0
            ? 1
            : -1;
    }

    return lastDirection.value;
});

const currentNumber = computed(() => {
    if (!cardCount.value) {
        return '00';
    }

    return String(
        currentIndex.value + 1
    ).padStart(
        2,
        '0'
    );
});

const totalNumber = computed(() => {
    return String(
        cardCount.value
    ).padStart(
        2,
        '0'
    );
});

/*
 * Original employee layout.
 *
 * These values remain unchanged.
 */
const stackPositions = [
    {
        x: -25,
        y: -150,
        scale: 0.99,
        rotate: -2
    },

    {
        x: 12,
        y: -200,
        scale: 0.98,
        rotate: 2.4
    },

    {
        x: -8,
        y: -138,
        scale: 0.97,
        rotate: -1.8
    },

    {
        x: 10,
        y: -184,
        scale: 0.96,
        rotate: 2
    },

    {
        x: -6,
        y: -230,
        scale: 0.95,
        rotate: -1.4
    },

    {
        x: 8,
        y: -276,
        scale: 0.94,
        rotate: 1.6
    },

    {
        x: 0,
        y: -322,
        scale: 0.93,
        rotate: 0
    }
];

function clamp(
    value,
    minimum,
    maximum
) {
    return Math.min(
        maximum,
        Math.max(
            minimum,
            value
        )
    );
}

function circularIndex(index) {
    if (!cardCount.value) {
        return 0;
    }

    return (
        index %
            cardCount.value +
        cardCount.value
    ) %
        cardCount.value;
}

function buildPublicAssetUrl(
    path
) {
    if (!path) {
        return null;
    }

    if (
        path.startsWith(
            'http://'
        ) ||
        path.startsWith(
            'https://'
        )
    ) {
        return path;
    }

    const apiBaseUrl =
        import.meta.env
            .VITE_CLINVIA_API_URL ??
        'https://clinvia.studiokristian.com';

    const normalizedPath =
        path.startsWith('/')
            ? path
            : `/${path}`;

    return `${apiBaseUrl}${normalizedPath}`;
}

function employeePhotoUrl(
    employee
) {
    return buildPublicAssetUrl(
        employee?.photoUrl ??
        employee?.photoPath ??
        employee?.photo_url ??
        employee?.photo_path
    );
}

function employeeName(employee) {
    return [
        employee?.titleBefore,
        employee?.firstName,
        employee?.lastName,
        employee?.titleAfter
    ]
        .filter(Boolean)
        .join(' ');
}

function employeeInitials(
    employee
) {
    return [
        employee?.firstName
            ?.charAt(0),

        employee?.lastName
            ?.charAt(0)
    ]
        .filter(Boolean)
        .join('');
}

function updateCardWidth() {
    const cardElement =
        stageElement.value
            ?.querySelector(
                '[data-employee-card]'
            );

    const rect =
        cardElement
            ?.getBoundingClientRect();

    cardWidth.value =
        rect?.width ||
        1;
}

function getDeckDepth(index) {
    if (!cardCount.value) {
        return 0;
    }

    if (
        index ===
        currentIndex.value
    ) {
        return 0;
    }

    if (
        deckDirection.value >
        0
    ) {
        return (
            index -
            currentIndex.value +
            cardCount.value
        ) %
            cardCount.value;
    }

    return (
        currentIndex.value -
        index +
        cardCount.value
    ) %
        cardCount.value;
}

function getStackTransform(depth) {
    const positionIndex =
        Math.min(
            Math.max(
                depth - 1,
                0
            ),
            stackPositions.length -
                1
        );

    return stackPositions[
        positionIndex
    ];
}

function isCardExiting(index) {
    return Boolean(
        exitingCards.value[
            index
        ]
    );
}

function isCardActive(index) {
    return (
        index ===
            currentIndex.value &&
        !isCardExiting(
            index
        )
    );
}

function getCardWrapperClasses(
    index
) {
    const active =
        isCardActive(
            index
        );

    return [
        active
            ? 'pointer-events-auto'
            : 'pointer-events-none',

        active &&
        isDragging.value
            ? 'transition-none'
            : [
                'transition-transform',
                'duration-[280ms]',
                'ease-[cubic-bezier(0.2,0.85,0.25,1)]'
            ].join(' '),

        isCardExiting(
            index
        )
            ? 'pointer-events-none'
            : ''
    ];
}

function getCardWrapperStyle(
    index
) {
    const exitState =
        exitingCards.value[
            index
        ];

    if (exitState) {
        return {
            transform: [
                `translate3d(${exitState.x}px, ${exitState.y}px, 0)`,
                `rotate(${exitState.rotate}deg)`,
                `scale(${exitState.scale})`
            ].join(' '),

            zIndex:
                60
        };
    }

    const active =
        index ===
        currentIndex.value;

    if (active) {
        const normalizedDrag =
            dragX.value /
            Math.max(
                cardWidth.value,
                1
            );

        const absoluteProgress =
            Math.abs(
                normalizedDrag
            );

        const verticalMovement =
            absoluteProgress *
            7;

        const rotation =
            normalizedDrag *
            5;

        const scale =
            1 -
            absoluteProgress *
                0.012;

        return {
            transform: [
                `translate3d(${dragX.value}px, ${verticalMovement}px, 0)`,
                `rotate(${rotation}deg)`,
                `scale(${scale})`
            ].join(' '),

            zIndex:
                40
        };
    }

    const depth =
        getDeckDepth(
            index
        );

    const stack =
        getStackTransform(
            depth
        );

    const revealProgress =
        depth === 1
            ? dragProgress.value
            : 0;

    const x =
        stack.x *
        (
            1 -
            revealProgress
        );

    const y =
        stack.y *
        (
            1 -
            revealProgress
        );

    const scale =
        stack.scale +
        (
            1 -
            stack.scale
        ) *
            revealProgress;

    const rotation =
        stack.rotate *
        (
            1 -
            revealProgress
        );

    return {
        transform: [
            `translate3d(${x}px, ${y}px, 0)`,
            `rotate(${rotation}deg)`,
            `scale(${scale})`
        ].join(' '),

        zIndex:
            Math.max(
                1,
                40 - depth
            )
    };
}

/*
 * Current rotation owned by the
 * employee-card wrapper.
 */
function getCardBaseRotation(
    index
) {
    const exitState =
        exitingCards.value[
            index
        ];

    if (exitState) {
        return (
            exitState.rotate ??
            0
        );
    }

    const active =
        index ===
        currentIndex.value;

    if (active) {
        const normalizedDrag =
            dragX.value /
            Math.max(
                cardWidth.value,
                1
            );

        return (
            normalizedDrag *
            5
        );
    }

    const depth =
        getDeckDepth(
            index
        );

    const stack =
        getStackTransform(
            depth
        );

    const revealProgress =
        depth === 1
            ? dragProgress.value
            : 0;

    return (
        stack.rotate *
        (
            1 -
            revealProgress
        )
    );
}

function clearExitState(index) {
    const timer =
        exitTimers.get(
            index
        );

    if (timer) {
        window.clearTimeout(
            timer
        );

        exitTimers.delete(
            index
        );
    }

    if (
        !exitingCards.value[
            index
        ]
    ) {
        return;
    }

    const nextStates = {
        ...exitingCards.value
    };

    delete nextStates[
        index
    ];

    exitingCards.value =
        nextStates;
}

function scheduleExitRemoval(
    index
) {
    const existingTimer =
        exitTimers.get(
            index
        );

    if (existingTimer) {
        window.clearTimeout(
            existingTimer
        );
    }

    const timer =
        window.setTimeout(
            () => {
                clearExitState(
                    index
                );
            },
            300
        );

    exitTimers.set(
        index,
        timer
    );
}

function resetDragState() {
    isDragging.value =
        false;

    pointerId.value =
        null;

    pointerVelocity.value =
        0;

    dragX.value =
        0;
}

function commitMovement(
    direction,
    targetIndex = null
) {
    if (
        cardCount.value <= 1
    ) {
        resetDragState();

        return;
    }

    updateCardWidth();

    const outgoingIndex =
        currentIndex.value;

    const incomingIndex =
        targetIndex === null
            ? circularIndex(
                currentIndex.value +
                    direction
            )
            : circularIndex(
                targetIndex
            );

    if (
        incomingIndex ===
        outgoingIndex
    ) {
        resetDragState();

        return;
    }

    clearExitState(
        incomingIndex
    );

    clearExitState(
        outgoingIndex
    );

    lastDirection.value =
        direction;

    const targetX =
        direction > 0
            ? -cardWidth.value *
                0.72
            : cardWidth.value *
                0.72;

    exitingCards.value = {
        ...exitingCards.value,

        [outgoingIndex]: {
            x:
                targetX,

            y:
                18,

            rotate:
                direction > 0
                    ? -8
                    : 8,

            scale:
                0.97
        }
    };

    currentIndex.value =
        incomingIndex;

    resetDragState();

    scheduleExitRemoval(
        outgoingIndex
    );
}

function goNext() {
    commitMovement(
        1
    );
}

function goPrevious() {
    commitMovement(
        -1
    );
}

function goTo(index) {
    if (
        index ===
            currentIndex.value ||
        cardCount.value <= 1
    ) {
        return;
    }

    const forwardDistance =
        (
            index -
            currentIndex.value +
            cardCount.value
        ) %
        cardCount.value;

    const backwardDistance =
        (
            currentIndex.value -
            index +
            cardCount.value
        ) %
        cardCount.value;

    const direction =
        forwardDistance <=
        backwardDistance
            ? 1
            : -1;

    commitMovement(
        direction,
        index
    );
}

function shouldIgnorePointerStart(
    target
) {
    return Boolean(
        target?.closest?.(
            [
                'a',
                'button',
                'input',
                'textarea',
                'select',
                'label',
                '[data-no-drag]'
            ].join(', ')
        )
    );
}

function handlePointerDown(
    event
) {
    if (
        shouldIgnorePointerStart(
            event.target
        )
    ) {
        return;
    }

    if (
        cardCount.value <= 1 ||
        event.button !== 0 ||
        isDragging.value
    ) {
        return;
    }

    updateCardWidth();

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

    dragX.value =
        0;

    pointerMoved.value =
        false;

    isDragging.value =
        true;

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
        6
    ) {
        pointerMoved.value =
            true;
    }

    const maximumDrag =
        cardWidth.value *
        0.72;

    dragX.value =
        clamp(
            distance,
            -maximumDrag,
            maximumDrag
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

    const distanceThreshold =
        cardWidth.value *
        0.11;

    const velocityThreshold =
        0.28;

    const shouldChange =
        distance >=
            distanceThreshold ||
        Math.abs(
            pointerVelocity.value
        ) >=
            velocityThreshold;

    if (!shouldChange) {
        const wasClick =
            !pointerMoved.value;

        resetDragState();

        if (wasClick) {
            selectCurrent();
        }

        return;
    }

    const movementValue =
        Math.abs(
            dragX.value
        ) >
        2
            ? dragX.value
            : pointerVelocity.value;

    const direction =
        movementValue < 0
            ? 1
            : -1;

    commitMovement(
        direction
    );
}

function handlePointerCancel() {
    if (!isDragging.value) {
        return;
    }

    resetDragState();
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

    if (
        event.key ===
            'Enter' ||
        event.key ===
            ' '
    ) {
        event.preventDefault();

        selectCurrent();
    }
}

function selectCurrent() {
    const employee =
        props.items[
            currentIndex.value
        ];

    if (!employee) {
        return;
    }

    emit(
        'select',
        employee
    );
}

function selectEmployee(index) {
    if (
        index === undefined ||
        index === null ||
        index < 0 ||
        index >= props.items.length
    ) {
        return;
    }

    currentIndex.value =
        index;

    const employee =
        props.items[index];

    if (!employee) {
        return;
    }

    emit(
        'select',
        employee
    );
}

watch(
    () =>
        props.items.length,

    (length) => {
        if (!length) {
            currentIndex.value =
                0;

            resetDragState();

            return;
        }

        if (
            currentIndex.value >
            length - 1
        ) {
            currentIndex.value =
                length - 1;
        }
    }
);

onBeforeUnmount(() => {
    exitTimers.forEach(
        (timer) => {
            window.clearTimeout(
                timer
            );
        }
    );

    exitTimers.clear();
});
</script>

<template>
    <section
        ref="motionRoot"
        class="
            w-full
            overflow-visible
        "
        :aria-label="
            ariaLabel
        "
    >
        <div
            class="
                mx-auto
                w-full
                px-2
                pb-8
                pt-36

                sm:pt-40

                md:max-w-[42rem]
                md:px-8
                md:pt-44

                lg:max-w-[48rem]
            "
        >
            <div
                ref="stageElement"
                tabindex="0"
                class="
                    relative
                    isolate
                    grid
                    w-full
                    place-items-center
                    overflow-visible
                    cursor-grab
                    touch-pan-y
                    select-none
                    outline-none
                    active:cursor-grabbing
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
                        (
                            item,
                            index
                        ) in
                        items
                    "
                    :key="
                        item.id ??
                        index
                    "
                    data-employee-card
                    class="
                        relative
                        col-start-1
                        row-start-1
                        w-[56vw]
                        max-w-[13.5rem]
                        justify-self-center
                        origin-[50%_92%]
                        [backface-visibility:hidden]

                        sm:w-[14rem]

                        md:w-[15rem]
                    "
                    :class="[
                        getCardWrapperClasses(
                            index
                        ),
                        {
                            '[will-change:transform]':
                                isDragging
                        }
                    ]"
                    :style="
                        getCardWrapperStyle(
                            index
                        )
                    "
                    :aria-hidden="
                        !isCardActive(
                            index
                        )
                    "
                >
                    <!--
                        Wrapper owns carousel position
                        and original rotation.

                        Article owns only additional
                        scroll-motion response.
                    -->
                    <article
                        class="
                            relative
                            aspect-[3/4.2]
                            w-full
                            cursor-pointer
                            rounded-[2.1rem]
                            bg-baige
                            shadow-[var(--shadow-mid)]
                        "
                        @click.stop="selectEmployee(index)"
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
                                ? index + 1
                                : undefined
                        "
                        :data-base-rotation="
                            scrollMotion
                                ? getCardBaseRotation(
                                    index
                                )
                                : undefined
                        "
                        :data-rotation-mode="
                            scrollMotion
                                ? 'offset'
                                : undefined
                        "
                        :data-motion-strength="
                            scrollMotion
                                ? 1
                                : undefined
                        "
                        :data-straighten-strength="
                            scrollMotion
                                ? 0.97
                                : undefined
                        "
                        :data-max-y="
                            scrollMotion
                                ? 14
                                : undefined
                        "
                        :data-max-scale="
                            scrollMotion
                                ? 0.005
                                : undefined
                        "
                    >
                        <div
                            class="
                                relative
                                h-full
                                w-full
                                overflow-hidden
                                rounded-[2.1rem]
                            "
                        >
                        <!-- Employee photo -->
                        <img
                            v-if="
                                employeePhotoUrl(
                                    item
                                )
                            "
                            :src="
                                employeePhotoUrl(
                                    item
                                )
                            "
                            :alt="
                                employeeName(
                                    item
                                )
                            "
                            :loading="
                                isCardActive(
                                    index
                                )
                                    ? 'eager'
                                    : 'lazy'
                            "
                            decoding="async"
                            draggable="false"
                            class="
                                absolute
                                inset-0
                                h-full
                                w-full
                                select-none
                                object-cover
                                object-center
                            "
                        >

                        <!-- Photo fallback -->
                        <div
                            v-else
                            class="
                                absolute
                                inset-0
                                flex
                                items-center
                                justify-center
                                bg-baige
                            "
                        >
                            <span
                                class="
                                    font-heading
                                    text-5xl
                                    font-bold
                                    text-green/25
                                "
                            >
                                {{
                                    employeeInitials(
                                        item
                                    )
                                }}
                            </span>
                        </div>

                        <!-- Gradient -->
                        <div
                            class="
                                pointer-events-none
                                absolute
                                inset-x-0
                                bottom-0
                                h-[45%]
                                bg-gradient-to-t
                                from-black/70
                                via-black/20
                                to-transparent
                            "
                        />

                        <!-- Content -->
                        <div
                            class="
                                absolute
                                inset-x-0
                                bottom-0
                                p-5
                            "
                        >
                            <h3
                                class="
                                    text-regular
                                    text-base
                                    font-bold
                                    leading-tight
                                    text-white
                                "
                            >
                                {{
                                    employeeName(
                                        item
                                    )
                                }}
                            </h3>

                            <p
                                v-if="
                                    item.position
                                "
                                class="
                                    text-regular
                                    mt-1
                                    line-clamp-2
                                    text-sm
                                    leading-snug
                                    text-white/80
                                "
                            >
                                {{
                                    item.position
                                }}
                            </p>
                        </div>
                        </div>
                    </article>
                </div>
            </div>
        </div>

        <!-- Desktop controls -->
        <DesktopCarouselControls
            :count="
                cardCount
            "
            :current-index="
                currentIndex
            "
            :previous-label="
                previousLabel
            "
            :next-label="
                nextLabel
            "
            tablist-label="Výber karty"
            card-aria-prefix="Zobraziť kartu"
            variant="stacked"
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

        <p
            class="
                sr-only
            "
            aria-live="polite"
        >
            Zamestnanec
            {{ currentNumber }}
            z
            {{ totalNumber }}
        </p>
    </section>
</template>