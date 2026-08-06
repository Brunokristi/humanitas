import {
    onBeforeUnmount,
    onMounted,
    ref,
    watch
} from 'vue'

const DEFAULT_VARIANTS = [
    {
        positionResponse: 0.16,
        rotationResponse: 0.13,
        scaleResponse: 0.15
    },
    {
        positionResponse: 0.145,
        rotationResponse: 0.12,
        scaleResponse: 0.14
    },
    {
        positionResponse: 0.17,
        rotationResponse: 0.14,
        scaleResponse: 0.16
    },
    {
        positionResponse: 0.15,
        rotationResponse: 0.125,
        scaleResponse: 0.145
    },
    {
        positionResponse: 0.165,
        rotationResponse: 0.135,
        scaleResponse: 0.155
    }
]

function clamp(
    value,
    minimum,
    maximum
) {
    return Math.max(
        minimum,
        Math.min(
            maximum,
            value
        )
    )
}

function readNumber(
    value,
    fallback
) {
    const parsed =
        Number.parseFloat(
            value
        )

    return Number.isFinite(
        parsed
    )
        ? parsed
        : fallback
}

export function useScrollMotion(
    options = {}
) {
    const motionRoot =
        ref(null)

    /*
     * y = vertical movement
     * x = horizontal movement
     */
    const axis =
        options.axis === 'x'
            ? 'x'
            : 'y'

    /*
     * When this is null we listen
     * to the window.
     *
     * When provided, every matching
     * descendant becomes its own
     * independent scroll source.
     */
    const sourceSelector =
        options.sourceSelector ??
        null

    const selector =
        options.selector ??
        '[data-scroll-motion]'

    /*
     * Allows the root element itself
     * to participate.
     */
    const includeRoot =
        options.includeRoot ??
        false

    const velocityMultiplier =
        options.velocityMultiplier ??
        0.115

    const velocityDecay =
        options.velocityDecay ??
        0.82

    const maxVelocity =
        options.maxVelocity ??
        8

    const travelMultiplier =
        options.travelMultiplier ??
        1.75

    const straightenVelocity =
        options.straightenVelocity ??
        5

    const variants =
        options.variants ??
        DEFAULT_VARIANTS

    const enabledOption =
        options.enabled ??
        true

    const disableOnCoarsePointer =
        options.disableOnCoarsePointer ??
        false

    let motionFrame =
        null

    let reducedMotionQuery =
        null

    let coarsePointerQuery =
        null

    let started =
        false

    const sourceStates =
        new Map()

    const elementStates =
        new Map()

    function readEnabledOption() {
        if (
            typeof enabledOption ===
            'function'
        ) {
            return Boolean(
                enabledOption()
            )
        }

        if (
            enabledOption &&
            typeof enabledOption ===
            'object' &&
            'value' in enabledOption
        ) {
            return Boolean(
                enabledOption.value
            )
        }

        return Boolean(
            enabledOption
        )
    }

    function shouldRun() {
        if (!readEnabledOption()) {
            return false
        }

        if (
            disableOnCoarsePointer &&
            coarsePointerQuery?.matches
        ) {
            return false
        }

        return true
    }

    function motionStyle(
        baseRotation = 0
    ) {
        return {
            '--scroll-x':
                '0px',

            '--scroll-y':
                '0px',

            '--scroll-rotate':
                `${baseRotation}deg`,

            '--scroll-scale':
                '1'
        }
    }

    function prefersReducedMotion() {
        return Boolean(
            reducedMotionQuery
                ?.matches
        )
    }

    function getPosition(
        source
    ) {
        if (
            source ===
            window
        ) {
            return axis === 'x'
                ? window.scrollX
                : window.scrollY
        }

        return axis === 'x'
            ? source.scrollLeft
            : source.scrollTop
    }

    function getSourceState(
        source
    ) {
        if (
            sourceStates.has(
                source
            )
        ) {
            return sourceStates.get(
                source
            )
        }

        const state = {
            velocity: 0,

            lastPosition:
                getPosition(
                    source
                )
        }

        sourceStates.set(
            source,
            state
        )

        return state
    }

    function getRootElements() {
        const root =
            motionRoot.value

        if (!root) {
            return []
        }

        const elements =
            []

        if (
            includeRoot &&
            root.matches?.(
                selector
            )
        ) {
            elements.push(
                root
            )
        }

        elements.push(
            ...root.querySelectorAll(
                selector
            )
        )

        return elements
    }

    function getElementsForSource(
        source
    ) {
        /*
         * Window scroll:
         * use everything inside this
         * composable root.
         */
        if (
            source ===
            window
        ) {
            return getRootElements()
        }

        /*
         * Container scroll:
         * animate only descendants
         * belonging to this source.
         */
        return Array.from(
            source.querySelectorAll(
                selector
            )
        ).filter(
            (element) => {
                if (
                    !sourceSelector
                ) {
                    return true
                }

                return (
                    element.closest(
                        sourceSelector
                    ) ===
                    source
                )
            }
        )
    }

    function getRestRotation(
        state
    ) {
        if (
            state.rotationMode ===
            'offset'
        ) {
            return 0
        }

        return state.baseRotation
    }

    function getMotionState(
        element,
        index
    ) {
        if (
            elementStates.has(
                element
            )
        ) {
            return elementStates.get(
                element
            )
        }

        const seed =
            Number.parseInt(
                element.dataset.motionSeed ??
                `${index}`,
                10
            )

        const normalizedSeed =
            Number.isFinite(
                seed
            )
                ? Math.abs(seed)
                : index

        const variant =
            variants[
            normalizedSeed %
            variants.length
            ]

        const baseRotation =
            readNumber(
                element.dataset.baseRotation,
                0
            )

        const rotationMode =
            element.dataset.rotationMode ??
            'absolute'

        const restingRotation =
            rotationMode ===
                'offset'
                ? 0
                : baseRotation

        const maxDistance =
            axis === 'x'
                ? readNumber(
                    element.dataset.maxX,
                    readNumber(
                        element.dataset.maxDistance,
                        14
                    )
                )
                : readNumber(
                    element.dataset.maxY,
                    readNumber(
                        element.dataset.maxDistance,
                        14
                    )
                )

        const state = {
            position: 0,
            targetPosition: 0,

            rotate:
                restingRotation,

            targetRotate:
                restingRotation,

            scale: 1,
            targetScale: 1,

            baseRotation,
            rotationMode,
            maxDistance,

            motionStrength:
                readNumber(
                    element.dataset.motionStrength,
                    1
                ),

            straightenStrength:
                readNumber(
                    element.dataset.straightenStrength,
                    0.92
                ),

            maxScale:
                readNumber(
                    element.dataset.maxScale,
                    0.006
                ),

            positionResponse:
                readNumber(
                    element.dataset.positionResponse,
                    variant.positionResponse
                ),

            rotationResponse:
                readNumber(
                    element.dataset.rotationResponse,
                    variant.rotationResponse
                ),

            scaleResponse:
                readNumber(
                    element.dataset.scaleResponse,
                    variant.scaleResponse
                )
        }

        elementStates.set(
            element,
            state
        )

        return state
    }

    function refreshMotionState(
        element,
        state
    ) {
        state.baseRotation =
            readNumber(
                element.dataset.baseRotation,
                state.baseRotation
            )

        state.rotationMode =
            element.dataset.rotationMode ??
            state.rotationMode

        state.motionStrength =
            readNumber(
                element.dataset.motionStrength,
                state.motionStrength
            )

        state.straightenStrength =
            readNumber(
                element.dataset.straightenStrength,
                state.straightenStrength
            )

        state.maxScale =
            readNumber(
                element.dataset.maxScale,
                state.maxScale
            )

        state.positionResponse =
            readNumber(
                element.dataset.positionResponse,
                state.positionResponse
            )

        state.rotationResponse =
            readNumber(
                element.dataset.rotationResponse,
                state.rotationResponse
            )

        state.scaleResponse =
            readNumber(
                element.dataset.scaleResponse,
                state.scaleResponse
            )

        if (
            axis ===
            'x'
        ) {
            state.maxDistance =
                readNumber(
                    element.dataset.maxX,
                    state.maxDistance
                )
        } else {
            state.maxDistance =
                readNumber(
                    element.dataset.maxY,
                    state.maxDistance
                )
        }
    }

    function applyTransform(
        element,
        state
    ) {
        if (
            axis ===
            'x'
        ) {
            element.style.setProperty(
                '--scroll-x',
                `${state.position}px`
            )

            element.style.setProperty(
                '--scroll-y',
                '0px'
            )
        } else {
            element.style.setProperty(
                '--scroll-x',
                '0px'
            )

            element.style.setProperty(
                '--scroll-y',
                `${state.position}px`
            )
        }

        element.style.setProperty(
            '--scroll-rotate',
            `${state.rotate}deg`
        )

        element.style.setProperty(
            '--scroll-scale',
            `${state.scale}`
        )
    }

    function resetElement(
        element,
        state
    ) {
        const restingRotation =
            getRestRotation(
                state
            )

        state.position =
            0

        state.targetPosition =
            0

        state.rotate =
            restingRotation

        state.targetRotate =
            restingRotation

        state.scale =
            1

        state.targetScale =
            1

        element.style.setProperty(
            '--scroll-x',
            '0px'
        )

        element.style.setProperty(
            '--scroll-y',
            '0px'
        )

        element.style.setProperty(
            '--scroll-rotate',
            `${restingRotation}deg`
        )

        element.style.setProperty(
            '--scroll-scale',
            '1'
        )

        element.style.setProperty(
            'will-change',
            'auto'
        )

        element.classList.remove(
            'is-motion-active'
        )
    }

    function resetSourceElements(
        source
    ) {
        getElementsForSource(
            source
        ).forEach(
            (
                element,
                index
            ) => {
                const state =
                    getMotionState(
                        element,
                        index
                    )

                refreshMotionState(
                    element,
                    state
                )

                resetElement(
                    element,
                    state
                )
            }
        )
    }

    function resetAllElements() {
        if (
            sourceSelector
        ) {
            sourceStates.forEach(
                (
                    _,
                    source
                ) => {
                    resetSourceElements(
                        source
                    )
                }
            )

            return
        }

        resetSourceElements(
            window
        )
    }

    function applyScrollMotion(
        source,
        scrollDelta
    ) {
        if (
            prefersReducedMotion()
        ) {
            return
        }

        const sourceState =
            getSourceState(
                source
            )

        sourceState.velocity +=
            scrollDelta *
            velocityMultiplier

        sourceState.velocity =
            clamp(
                sourceState.velocity,
                -maxVelocity,
                maxVelocity
            )

        startMotionLoop()
    }

    function updateSourceMotion(
        source,
        sourceState
    ) {
        if (
            source !==
            window &&
            !source.isConnected
        ) {
            sourceStates.delete(
                source
            )

            return false
        }

        let sourceStillMoving =
            false

        /*
         * Shared velocity loses energy.
         */
        sourceState.velocity *=
            velocityDecay

        /*
         * Convert velocity to 0 → 1.
         */
        const velocityAmount =
            Math.min(
                1,
                Math.abs(
                    sourceState.velocity
                ) /
                straightenVelocity
            )

        const elements =
            getElementsForSource(
                source
            )

        elements.forEach(
            (
                element,
                index
            ) => {
                const state =
                    getMotionState(
                        element,
                        index
                    )

                refreshMotionState(
                    element,
                    state
                )

                /*
                 * Every element receives
                 * the SAME underlying
                 * source velocity.
                 */
                state.targetPosition =
                    clamp(
                        sourceState.velocity *
                        travelMultiplier *
                        state.motionStrength,
                        -state.maxDistance,
                        state.maxDistance
                    )

                /*
                 * Engine owns the complete
                 * resting angle.
                 */
                if (
                    state.rotationMode ===
                    'absolute'
                ) {
                    state.targetRotate =
                        state.baseRotation *
                        (
                            1 -
                            velocityAmount *
                            state.straightenStrength
                        )
                }

                /*
                 * The parent already owns
                 * the resting angle.
                 *
                 * Apply the opposite angle
                 * while moving.
                 */
                if (
                    state.rotationMode ===
                    'offset'
                ) {
                    state.targetRotate =
                        -state.baseRotation *
                        velocityAmount *
                        state.straightenStrength
                }

                state.targetScale =
                    1 -
                    state.maxScale *
                    velocityAmount

                state.position +=
                    (
                        state.targetPosition -
                        state.position
                    ) *
                    state.positionResponse

                state.rotate +=
                    (
                        state.targetRotate -
                        state.rotate
                    ) *
                    state.rotationResponse

                state.scale +=
                    (
                        state.targetScale -
                        state.scale
                    ) *
                    state.scaleResponse

                applyTransform(
                    element,
                    state
                )

                const restingRotation =
                    getRestRotation(
                        state
                    )

                const moving =
                    Math.abs(
                        sourceState.velocity
                    ) >
                    0.008 ||
                    Math.abs(
                        state.position
                    ) >
                    0.01 ||
                    Math.abs(
                        state.rotate -
                        restingRotation
                    ) >
                    0.004 ||
                    Math.abs(
                        state.scale -
                        1
                    ) >
                    0.0001

                if (moving) {
                    sourceStillMoving =
                        true

                    element.style.setProperty(
                        'will-change',
                        'transform'
                    )

                    element.classList.add(
                        'is-motion-active'
                    )

                    return
                }

                resetElement(
                    element,
                    state
                )
            }
        )

        if (
            !sourceStillMoving
        ) {
            sourceState.velocity =
                0
        }

        return sourceStillMoving
    }

    function updateMotion() {
        if (
            prefersReducedMotion()
        ) {
            sourceStates.forEach(
                (state) => {
                    state.velocity =
                        0
                }
            )

            resetAllElements()

            motionFrame =
                null

            return
        }

        let stillMoving =
            false

        sourceStates.forEach(
            (
                sourceState,
                source
            ) => {
                const sourceMoving =
                    updateSourceMotion(
                        source,
                        sourceState
                    )

                if (
                    sourceMoving
                ) {
                    stillMoving =
                        true
                }
            }
        )

        if (
            stillMoving
        ) {
            motionFrame =
                window.requestAnimationFrame(
                    updateMotion
                )

            return
        }

        motionFrame =
            null
    }

    function startMotionLoop() {
        if (
            motionFrame !==
            null
        ) {
            return
        }

        motionFrame =
            window.requestAnimationFrame(
                updateMotion
            )
    }

    function handleWindowScroll() {
        const sourceState =
            getSourceState(
                window
            )

        const currentPosition =
            getPosition(
                window
            )

        const scrollDelta =
            currentPosition -
            sourceState.lastPosition

        sourceState.lastPosition =
            currentPosition

        if (
            Math.abs(
                scrollDelta
            ) >
            0.1
        ) {
            applyScrollMotion(
                window,
                scrollDelta
            )
        }
    }

    function handleSourceScroll(
        event
    ) {
        const source =
            event.target

        if (
            !source ||
            !(source instanceof Element)
        ) {
            return
        }

        if (
            !source.matches(
                sourceSelector
            )
        ) {
            return
        }

        const currentPosition =
            getPosition(
                source
            )

        let sourceState =
            sourceStates.get(
                source
            )

        if (!sourceState) {
            sourceState = {
                velocity: 0,

                lastPosition:
                    currentPosition
            }

            sourceStates.set(
                source,
                sourceState
            )

            return
        }

        const scrollDelta =
            currentPosition -
            sourceState.lastPosition

        sourceState.lastPosition =
            currentPosition

        if (
            Math.abs(
                scrollDelta
            ) >
            0.1
        ) {
            applyScrollMotion(
                source,
                scrollDelta
            )
        }
    }

    function initialiseSources() {
        if (
            !sourceSelector ||
            !motionRoot.value
        ) {
            return
        }

        motionRoot.value
            .querySelectorAll(
                sourceSelector
            )
            .forEach(
                (source) => {
                    if (
                        sourceStates.has(
                            source
                        )
                    ) {
                        return
                    }

                    sourceStates.set(
                        source,
                        {
                            velocity: 0,

                            lastPosition:
                                getPosition(
                                    source
                                )
                        }
                    )
                }
            )
    }

    function handleReducedMotionChange() {
        if (
            !prefersReducedMotion()
        ) {
            return
        }

        sourceStates.forEach(
            (state) => {
                state.velocity =
                    0
            }
        )

        if (
            motionFrame !==
            null
        ) {
            window.cancelAnimationFrame(
                motionFrame
            )

            motionFrame =
                null
        }

        resetAllElements()
    }

    function start() {
        if (
            typeof window ===
            'undefined' ||
            started ||
            !shouldRun()
        ) {
            return
        }

        started =
            true

        reducedMotionQuery =
            window.matchMedia(
                '(prefers-reduced-motion: reduce)'
            )

        reducedMotionQuery
            .addEventListener?.(
                'change',
                handleReducedMotionChange
            )

        /*
         * Individual scroll-container mode.
         */
        if (
            sourceSelector
        ) {
            initialiseSources()

            motionRoot.value
                ?.addEventListener(
                    'scroll',
                    handleSourceScroll,
                    {
                        capture: true,
                        passive: true
                    }
                )

            resetAllElements()

            return
        }

        /*
         * Window mode.
         */
        sourceStates.set(
            window,
            {
                velocity: 0,

                lastPosition:
                    getPosition(
                        window
                    )
            }
        )

        window.addEventListener(
            'scroll',
            handleWindowScroll,
            {
                passive: true
            }
        )

        resetAllElements()
    }

    function stop() {
        if (
            typeof window ===
            'undefined'
        ) {
            return
        }

        if (started) {
            resetAllElements()
        }

        window.removeEventListener(
            'scroll',
            handleWindowScroll
        )

        motionRoot.value
            ?.removeEventListener(
                'scroll',
                handleSourceScroll,
                true
            )

        reducedMotionQuery
            ?.removeEventListener?.(
                'change',
                handleReducedMotionChange
            )

        if (
            motionFrame !==
            null
        ) {
            window.cancelAnimationFrame(
                motionFrame
            )

            motionFrame =
                null
        }

        sourceStates.clear()
        elementStates.clear()

        reducedMotionQuery =
            null

        started =
            false
    }

    function syncRunningState() {
        if (
            typeof window ===
            'undefined'
        ) {
            return
        }

        if (shouldRun()) {
            start()

            return
        }

        stop()
    }

    function handleCoarsePointerChange() {
        syncRunningState()
    }

    const stopEnabledWatch =
        watch(
            () => readEnabledOption(),
            () => {
                syncRunningState()
            }
        )

    onMounted(() => {
        coarsePointerQuery =
            window.matchMedia(
                '(max-width: 767px), (pointer: coarse)'
            )

        coarsePointerQuery
            .addEventListener?.(
                'change',
                handleCoarsePointerChange
            )

        syncRunningState()
    })

    onBeforeUnmount(() => {
        stopEnabledWatch()

        coarsePointerQuery
            ?.removeEventListener?.(
                'change',
                handleCoarsePointerChange
            )

        coarsePointerQuery =
            null

        stop()
    })

    return {
        motionRoot,
        motionStyle,
        start,
        stop,
        resetAllElements,
        initialiseSources
    }
}