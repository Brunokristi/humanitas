import {
    computed,
    nextTick,
    ref,
    watch
} from 'vue'

import {
    useCardNavigation
} from './useCardNavigation'

import {
    useSheetDrag
} from './useSheetDrag'

let instance

function createCardStack({
    pages,
    router,
    route
}) {
    const navigation =
        useCardNavigation(
            pages
        )

    const defaultOrder =
        pages.map(
            (page) => {
                return page.id
            }
        )

    const cardOrder =
        ref([
            ...defaultOrder
        ])

    const phase =
        ref('stacked')

    const openCardId =
        ref(null)

    const isTransitioning =
        ref(false)

    const isExpandedDragging =
        ref(false)

    const closingAtTarget =
        ref(false)

    const closingTopDone =
        ref(false)

    const closingLeftDone =
        ref(false)

    const closingWidthDone =
        ref(false)

    const closingHeightDone =
        ref(false)

    const expandedDragY =
        ref(0)

    const transitionBox =
        ref(null)

    const suppressTransition =
        ref(false)

    const suppressRouteSync =
        ref(false)

    const previewEffectsReady =
        ref(true)

    const mode = computed(() => {
        if (
            phase.value ===
            'stacked' ||
            phase.value ===
            'closing'
        ) {
            return 'stacked'
        }

        return 'expanded'
    })

    const cardElements =
        new Map()

    const stackedRects =
        new Map()

    const stackedOffset =
        60

    const transitionDuration =
        440

    const minimizeThreshold =
        130

    const minimizeVelocityThreshold =
        0.55

    let fallbackTimer =
        null

    let previewEffectsTimer =
        null

    let pendingRouteOpenId =
        null

    let isScrollLocked =
        false

    let previousHtmlOverflow =
        ''

    let previousBodyOverflow =
        ''

    let openingOverlayElement =
        null

    let openingOverlayAnimation =
        null

    const reducedMotionQuery =
        window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        )

    const reducedMotion =
        ref(
            reducedMotionQuery.matches
        )

    function handleReducedMotionChange(
        event
    ) {
        reducedMotion.value =
            event.matches
    }

    reducedMotionQuery.addEventListener(
        'change',
        handleReducedMotionChange
    )

    function getTransitionMs() {
        return reducedMotion.value
            ? 0
            : transitionDuration
    }

    function getStackedScale(
        index
    ) {
        return Math.max(
            0.9,
            1 -
            index *
            0.035
        )
    }

    /*
     * The reusable motion engine now owns
     * scroll movement.
     *
     * No additional layout compensation is
     * required because the motion is temporary.
     */
    const stackBottomCompensation =
        computed(() => {
            return 0
        })

    function getIndex(
        cardId
    ) {
        return cardOrder.value.indexOf(
            cardId
        )
    }

    function clearFallbackTimer() {
        if (
            fallbackTimer ===
            null
        ) {
            return
        }

        window.clearTimeout(
            fallbackTimer
        )

        fallbackTimer =
            null
    }

    function clearPreviewEffectsTimer() {
        if (
            previewEffectsTimer ===
            null
        ) {
            return
        }

        window.clearTimeout(
            previewEffectsTimer
        )

        previewEffectsTimer =
            null
    }

    function cleanupOpeningOverlay() {
        if (
            openingOverlayAnimation
        ) {
            openingOverlayAnimation.cancel()

            openingOverlayAnimation =
                null
        }

        if (
            openingOverlayElement
        ) {
            openingOverlayElement.remove()

            openingOverlayElement =
                null
        }
    }

    function createOpeningOverlay(
        sourceElement,
        sourceRect
    ) {
        cleanupOpeningOverlay()

        const overlay =
            sourceElement.cloneNode(
                true
            )

        const sourceStyles =
            window.getComputedStyle(
                sourceElement
            )

        const offsetParent =
            sourceElement.offsetParent

        let startTop =
            sourceRect.top

        let startLeft =
            sourceRect.left

        let startWidth =
            sourceRect.width

        let startHeight =
            sourceRect.height

        let startTransform =
            'none'

        let startTransformOrigin =
            'top left'

        if (
            offsetParent instanceof
            HTMLElement
        ) {
            const parentRect =
                offsetParent
                    .getBoundingClientRect()

            startTop =
                parentRect.top +
                offsetParent.clientTop +
                sourceElement.offsetTop -
                offsetParent.scrollTop

            startLeft =
                parentRect.left +
                offsetParent.clientLeft +
                sourceElement.offsetLeft -
                offsetParent.scrollLeft

            startWidth =
                sourceElement.offsetWidth

            startHeight =
                sourceElement.offsetHeight

            startTransform =
                sourceStyles.transform ===
                    'none'
                    ? 'none'
                    : sourceStyles.transform

            startTransformOrigin =
                sourceStyles.transformOrigin
        }

        overlay.setAttribute(
            'aria-hidden',
            'true'
        )

        overlay.removeAttribute(
            'tabindex'
        )

        overlay.classList.add(
            'card-opening-overlay'
        )

        overlay
            .querySelectorAll(
                '[id]'
            )
            .forEach(
                (element) => {
                    element.removeAttribute(
                        'id'
                    )
                }
            )

        overlay
            .querySelectorAll(
                [
                    'button',
                    'a',
                    'input',
                    'textarea',
                    'select',
                    '[tabindex]'
                ].join(', ')
            )
            .forEach(
                (element) => {
                    element.setAttribute(
                        'tabindex',
                        '-1'
                    )
                }
            )

        Object.assign(
            overlay.style,
            {
                position:
                    'fixed',

                top:
                    `${startTop}px`,

                left:
                    `${startLeft}px`,

                width:
                    `${startWidth}px`,

                height:
                    `${startHeight}px`,

                maxWidth:
                    'none',

                minHeight:
                    '0',

                margin:
                    '0',

                transform:
                    startTransform,

                transformOrigin:
                    startTransformOrigin,

                opacity:
                    '1',

                visibility:
                    'visible',

                zIndex:
                    '9999',

                overflow:
                    'hidden',

                pointerEvents:
                    'none',

                transition:
                    'none',

                willChange:
                    [
                        'top',
                        'left',
                        'width',
                        'height',
                        'transform',
                        'border-radius',
                        'box-shadow'
                    ].join(', '),

                borderRadius:
                    sourceStyles.borderRadius,

                boxShadow:
                    sourceStyles.boxShadow
            }
        )

        document.body.appendChild(
            overlay
        )

        openingOverlayElement =
            overlay

        return {
            element:
                overlay,

            startFrame: {
                top:
                    `${startTop}px`,

                left:
                    `${startLeft}px`,

                width:
                    `${startWidth}px`,

                height:
                    `${startHeight}px`,

                transform:
                    startTransform,

                transformOrigin:
                    startTransformOrigin,

                borderRadius:
                    sourceStyles.borderRadius,

                boxShadow:
                    sourceStyles.boxShadow
            }
        }
    }

    function schedulePreviewEffectsEnable(
        delay = 200
    ) {
        clearPreviewEffectsTimer()

        previewEffectsTimer =
            window.setTimeout(
                () => {
                    previewEffectsReady.value =
                        true

                    previewEffectsTimer =
                        null
                },
                delay
            )
    }

    function lockViewportScroll() {
        if (
            isScrollLocked
        ) {
            return
        }

        previousHtmlOverflow =
            document
                .documentElement
                .style
                .overflow

        previousBodyOverflow =
            document
                .body
                .style
                .overflow

        document
            .documentElement
            .style
            .overflow =
            'hidden'

        document
            .body
            .style
            .overflow =
            'hidden'

        isScrollLocked =
            true
    }

    function unlockViewportScroll() {
        if (
            !isScrollLocked
        ) {
            return
        }

        document
            .documentElement
            .style
            .overflow =
            previousHtmlOverflow

        document
            .body
            .style
            .overflow =
            previousBodyOverflow

        isScrollLocked =
            false
    }

    function moveCardToFront(
        cardId
    ) {
        const index =
            cardOrder.value.indexOf(
                cardId
            )

        if (
            index <= 0
        ) {
            return
        }

        const nextOrder = [
            ...cardOrder.value
        ]

        nextOrder.splice(
            index,
            1
        )

        nextOrder.unshift(
            cardId
        )

        cardOrder.value =
            nextOrder
    }

    function registerCardElement(
        cardId,
        element
    ) {
        if (
            !cardId
        ) {
            return
        }

        if (
            !element
        ) {
            cardElements.delete(
                cardId
            )

            return
        }

        cardElements.set(
            cardId,
            element
        )
    }

    function rememberStackedRect(
        cardId,
        element = null
    ) {
        if (
            !cardId ||
            phase.value !==
            'stacked'
        ) {
            return
        }

        const targetElement =
            element ||
            cardElements.get(
                cardId
            )

        if (
            !targetElement
        ) {
            return
        }

        stackedRects.set(
            cardId,
            targetElement
                .getBoundingClientRect()
        )
    }

    function rememberAllStackedRects() {
        if (
            phase.value !==
            'stacked'
        ) {
            return
        }

        cardOrder.value.forEach(
            (cardId) => {
                rememberStackedRect(
                    cardId,
                    cardElements.get(
                        cardId
                    )
                )
            }
        )
    }

    function getStackedRect(
        cardId
    ) {
        return (
            stackedRects.get(
                cardId
            ) ??
            null
        )
    }

    function createBox(
        rect
    ) {
        return {
            top:
                rect.top,

            left:
                rect.left,

            width:
                rect.width,

            height:
                rect.height
        }
    }

    function getStackedCardDimensions() {
        return {
            width:
                '100%',

            height:
                'min(68dvh, 620px)'
        }
    }

    function getStackedTopCardSize(
        referenceRect = null
    ) {
        const isMobileViewport =
            window.innerWidth <
            640

        const width =
            referenceRect?.width ??
            (
                isMobileViewport
                    ? Math.min(
                        window.innerWidth *
                        0.92,
                        680
                    )
                    : Math.max(
                        0,
                        window.innerWidth -
                        48
                    )
            )

        const height =
            Math.min(
                window.innerHeight *
                0.68,
                620
            )

        return {
            width,
            height
        }
    }

    function normalizeClosingTargetBox(
        rect
    ) {
        if (
            !rect
        ) {
            return null
        }

        const canonical =
            getStackedTopCardSize(
                rect
            )

        const centerX =
            rect.left +
            rect.width /
            2

        const bottom =
            rect.top +
            rect.height

        return {
            top:
                bottom -
                canonical.height,

            left:
                centerX -
                canonical.width /
                2,

            width:
                canonical.width,

            height:
                canonical.height
        }
    }

    function pushRoute(
        path
    ) {
        if (
            route.path ===
            path
        ) {
            return
        }

        suppressRouteSync.value =
            true

        router
            .push(
                path
            )
            .finally(
                () => {
                    suppressRouteSync.value =
                        false
                }
            )
    }

    function resetTransitionState() {
        clearFallbackTimer()

        clearPreviewEffectsTimer()

        cleanupOpeningOverlay()

        unlockViewportScroll()

        phase.value =
            'stacked'

        openCardId.value =
            null

        isTransitioning.value =
            false

        isExpandedDragging.value =
            false

        closingAtTarget.value =
            false

        closingTopDone.value =
            false

        closingLeftDone.value =
            false

        closingWidthDone.value =
            false

        closingHeightDone.value =
            false

        expandedDragY.value =
            0

        transitionBox.value =
            null

        previewEffectsReady.value =
            true
    }

    async function beginOpening(
        cardId,
        sourceElement,
        shouldUpdateRoute = true
    ) {
        if (
            !cardId ||
            !sourceElement ||
            phase.value !==
            'stacked' ||
            isTransitioning.value
        ) {
            return
        }

        isTransitioning.value =
            true

        clearFallbackTimer()

        clearPreviewEffectsTimer()

        previewEffectsReady.value =
            false

        const sourceRect =
            sourceElement
                .getBoundingClientRect()

        const openingVisual =
            createOpeningOverlay(
                sourceElement,
                sourceRect
            )

        const overlay =
            openingVisual.element

        openCardId.value =
            cardId

        phase.value =
            'opening'

        suppressTransition.value =
            true

        await nextTick()

        const expandedElement =
            cardElements.get(
                cardId
            )

        if (
            !expandedElement ||
            !overlay
        ) {
            finishOpening(
                cardId,
                shouldUpdateRoute
            )

            return
        }

        const targetRect =
            expandedElement
                .getBoundingClientRect()

        suppressTransition.value =
            false

        if (
            reducedMotion.value
        ) {
            finishOpening(
                cardId,
                shouldUpdateRoute
            )

            return
        }

        openingOverlayAnimation =
            overlay.animate(
                [
                    openingVisual
                        .startFrame,

                    {
                        top:
                            `${targetRect.top}px`,

                        left:
                            `${targetRect.left}px`,

                        width:
                            `${targetRect.width}px`,

                        height:
                            `${targetRect.height}px`,

                        transform:
                            'none',

                        transformOrigin:
                            'top left',

                        borderRadius:
                            '28px',

                        boxShadow:
                            'var(--shadow-strong)'
                    }
                ],
                {
                    duration:
                        getTransitionMs(),

                    easing:
                        'cubic-bezier(0.22, 1, 0.36, 1)',

                    fill:
                        'both'
                }
            )

        fallbackTimer =
            window.setTimeout(
                () => {
                    finishOpening(
                        cardId,
                        shouldUpdateRoute
                    )
                },
                getTransitionMs() +
                100
            )

        try {
            await openingOverlayAnimation
                .finished
        } catch {
            //
        }

        finishOpening(
            cardId,
            shouldUpdateRoute
        )
    }

    function finishOpening(
        cardId =
            openCardId.value,

        shouldUpdateRoute =
            true
    ) {
        if (
            phase.value !==
            'opening' ||
            openCardId.value !==
            cardId
        ) {
            return
        }

        clearFallbackTimer()

        suppressTransition.value =
            true

        phase.value =
            'expanded'

        transitionBox.value =
            null

        previewEffectsReady.value =
            false

        nextTick(
            () => {
                cleanupOpeningOverlay()

                isTransitioning.value =
                    false

                requestAnimationFrame(
                    () => {
                        suppressTransition.value =
                            false
                    }
                )

                if (
                    !shouldUpdateRoute
                ) {
                    return
                }

                const path =
                    navigation
                        .getPathByCardId(
                            cardId
                        )

                if (
                    path
                ) {
                    pushRoute(
                        path
                    )
                }
            }
        )
    }

    function openCard(
        cardId,
        options = {}
    ) {
        if (
            !cardId
        ) {
            return
        }

        const {
            updateRoute:
            shouldUpdateRoute =
            true,

            sourceElement =
            null,

            animate =
            true
        } = options

        const element =
            sourceElement ||
            cardElements.get(
                cardId
            )

        if (
            phase.value !==
            'stacked' ||
            isTransitioning.value
        ) {
            return
        }

        if (
            animate &&
            element &&
            !reducedMotion.value
        ) {
            beginOpening(
                cardId,
                element,
                shouldUpdateRoute
            )

            return
        }

        resetTransitionState()

        openCardId.value =
            cardId

        phase.value =
            'expanded'

        if (
            !shouldUpdateRoute
        ) {
            return
        }

        const path =
            navigation
                .getPathByCardId(
                    cardId
                )

        if (
            path
        ) {
            pushRoute(
                path
            )
        }
    }

    function finalizeMinimize(
        options = {}
    ) {
        const {
            updateRoute:
            shouldUpdateRoute =
            true
        } = options

        clearFallbackTimer()

        clearPreviewEffectsTimer()

        cleanupOpeningOverlay()

        unlockViewportScroll()

        suppressTransition.value =
            true

        isTransitioning.value =
            false

        phase.value =
            'stacked'

        openCardId.value =
            null

        isExpandedDragging.value =
            false

        closingAtTarget.value =
            false

        closingTopDone.value =
            false

        closingLeftDone.value =
            false

        closingWidthDone.value =
            false

        closingHeightDone.value =
            false

        expandedDragY.value =
            0

        transitionBox.value =
            null

        previewEffectsReady.value =
            false

        nextTick(
            () => {
                rememberAllStackedRects()

                requestAnimationFrame(
                    () => {
                        suppressTransition.value =
                            false
                    }
                )

                schedulePreviewEffectsEnable()

                if (
                    shouldUpdateRoute &&
                    route.path !==
                    '/'
                ) {
                    pushRoute(
                        '/'
                    )
                }
            }
        )
    }

    function beginClosing(
        options = {}
    ) {
        const {
            updateRoute:
            shouldUpdateRoute =
            true
        } = options

        if (
            phase.value !==
            'expanded' ||
            !openCardId.value ||
            isExpandedDragging.value ||
            isTransitioning.value
        ) {
            return
        }

        isTransitioning.value =
            true

        lockViewportScroll()

        const cardId =
            openCardId.value

        const element =
            cardElements.get(
                cardId
            )

        const sourceRect =
            element
                ?.getBoundingClientRect() ??
            null

        const topCardId =
            cardOrder.value[
            0
            ] ??
            cardId

        const topSlotRect =
            getStackedRect(
                topCardId
            ) ||
            getStackedRect(
                cardId
            )

        moveCardToFront(
            cardId
        )

        const targetRect =
            topSlotRect ||
            getStackedRect(
                cardId
            )

        if (
            !element ||
            !sourceRect ||
            !targetRect
        ) {
            finalizeMinimize({
                updateRoute:
                    shouldUpdateRoute
            })

            return
        }

        transitionBox.value = {
            source:
                createBox(
                    sourceRect
                ),

            target:
                createBox(
                    targetRect
                ),

            updateRoute:
                shouldUpdateRoute
        }

        expandedDragY.value =
            0

        isExpandedDragging.value =
            false

        phase.value =
            'closing'

        closingAtTarget.value =
            false

        closingTopDone.value =
            Math.abs(
                transitionBox.value
                    .source.top -
                transitionBox.value
                    .target.top
            ) <
            0.5

        closingLeftDone.value =
            Math.abs(
                transitionBox.value
                    .source.left -
                transitionBox.value
                    .target.left
            ) <
            0.5

        closingWidthDone.value =
            Math.abs(
                transitionBox.value
                    .source.width -
                transitionBox.value
                    .target.width
            ) <
            0.5

        closingHeightDone.value =
            Math.abs(
                transitionBox.value
                    .source.height -
                transitionBox.value
                    .target.height
            ) <
            0.5

        nextTick(
            () => {
                requestAnimationFrame(
                    () => {
                        requestAnimationFrame(
                            () => {
                                if (
                                    phase.value !==
                                    'closing'
                                ) {
                                    return
                                }

                                closingAtTarget.value =
                                    true

                                fallbackTimer =
                                    window.setTimeout(
                                        () => {
                                            finalizeMinimize({
                                                updateRoute:
                                                    shouldUpdateRoute
                                            })
                                        },
                                        getTransitionMs() +
                                        60
                                    )
                            }
                        )
                    }
                )
            }
        )
    }

    function minimizeCard(
        options = {}
    ) {
        if (
            reducedMotion.value
        ) {
            if (
                openCardId.value
            ) {
                moveCardToFront(
                    openCardId.value
                )
            }

            finalizeMinimize(
                options
            )

            return
        }

        beginClosing(
            options
        )
    }

    const sheetDrag =
        useSheetDrag({
            onStart() {
                if (
                    phase.value !==
                    'expanded' ||
                    !openCardId.value ||
                    !cardElements.get(
                        openCardId.value
                    )
                ) {
                    return false
                }

                if (
                    window.scrollY >
                    8
                ) {
                    return false
                }

                clearFallbackTimer()

                isExpandedDragging.value =
                    true

                expandedDragY.value =
                    0

                return true
            },

            onMove({
                distance
            }) {
                if (
                    !isExpandedDragging.value
                ) {
                    return
                }

                expandedDragY.value =
                    Math.max(
                        0,
                        distance
                    )
            },

            onEnd({
                distance,
                velocity
            }) {
                if (
                    !isExpandedDragging.value
                ) {
                    return
                }

                isExpandedDragging.value =
                    false

                const shouldMinimize =
                    distance >=
                    minimizeThreshold ||
                    velocity >=
                    minimizeVelocityThreshold

                if (
                    shouldMinimize
                ) {
                    beginClosing()

                    return
                }

                expandedDragY.value =
                    0
            },

            onCancel() {
                isExpandedDragging.value =
                    false

                expandedDragY.value =
                    0
            }
        })

    function handleTransitionEnd(
        event
    ) {
        if (
            event.target !==
            event.currentTarget ||
            phase.value !==
            'closing'
        ) {
            return
        }

        if (
            event.propertyName ===
            'top'
        ) {
            closingTopDone.value =
                true
        }

        if (
            event.propertyName ===
            'left'
        ) {
            closingLeftDone.value =
                true
        }

        if (
            event.propertyName ===
            'width'
        ) {
            closingWidthDone.value =
                true
        }

        if (
            event.propertyName ===
            'height'
        ) {
            closingHeightDone.value =
                true
        }

        if (
            !closingTopDone.value ||
            !closingLeftDone.value ||
            !closingWidthDone.value ||
            !closingHeightDone.value
        ) {
            return
        }

        const shouldUpdateRoute =
            transitionBox.value
                ?.updateRoute ??
            true

        finalizeMinimize({
            updateRoute:
                shouldUpdateRoute
        })
    }

    function getCardVisual(
        cardId
    ) {
        const index =
            getIndex(
                cardId
            )

        const cardCount =
            cardOrder.value.length

        const selected =
            openCardId.value ===
            cardId

        const stackedCardDimensions =
            getStackedCardDimensions()

        const maxStackOffset =
            Math.max(
                0,
                cardCount -
                1
            ) *
            stackedOffset

        const stackedBaseY =
            maxStackOffset -
            index *
            stackedOffset

        if (
            phase.value ===
            'stacked'
        ) {
            return {
                isOpen:
                    false,

                isOpening:
                    false,

                isMinimizing:
                    false,

                isDragging:
                    false,

                interactive:
                    true,

                previewEffectsReady:
                    previewEffectsReady.value,

                showExpandedControls:
                    false,

                fixedBox:
                    null,

                x:
                    0,

                /*
                 * Only the normal stack position.
                 *
                 * No old scroll parallax is added.
                 */
                y:
                    stackedBaseY,

                scale:
                    getStackedScale(
                        index
                    ),

                /*
                 * Every page card is perfectly
                 * straight at rest.
                 */
                motionBaseRotation:
                    0,

                motionSeed:
                    index,

                opacity:
                    1,

                visibility:
                    'visible',

                zIndex:
                    cardCount -
                    index,

                shadow:
                    index ===
                        0
                        ? 'var(--shadow-mid)'
                        : 'var(--shadow-soft)',

                borderRadius:
                    32,

                width:
                    stackedCardDimensions.width,

                height:
                    stackedCardDimensions.height,

                transitionMs:
                    suppressTransition.value
                        ? 0
                        : getTransitionMs()
            }
        }

        if (
            phase.value ===
            'opening'
        ) {
            if (
                selected
            ) {
                return {
                    isOpen:
                        true,

                    isOpening:
                        true,

                    isMinimizing:
                        false,

                    isDragging:
                        false,

                    interactive:
                        false,

                    previewEffectsReady:
                        false,

                    showExpandedControls:
                        false,

                    fixedBox:
                        null,

                    x:
                        0,

                    y:
                        0,

                    rotateDeg:
                        0,

                    scale:
                        1,

                    opacity:
                        1,

                    visibility:
                        'hidden',

                    zIndex:
                        900,

                    shadow:
                        'var(--shadow-strong)',

                    borderRadius:
                        28,

                    width:
                        '100%',

                    height:
                        'auto',

                    minHeight:
                        'min(68dvh, 620px)',

                    transitionMs:
                        0
                }
            }

            return {
                isOpen:
                    false,

                isOpening:
                    true,

                isMinimizing:
                    false,

                isDragging:
                    false,

                interactive:
                    false,

                previewEffectsReady:
                    false,

                showExpandedControls:
                    false,

                fixedBox:
                    null,

                x:
                    0,

                y:
                    stackedBaseY,

                scale:
                    getStackedScale(
                        index
                    ),

                opacity:
                    0,

                visibility:
                    'hidden',

                zIndex:
                    cardCount -
                    index,

                shadow:
                    'var(--shadow-soft)',

                borderRadius:
                    32,

                width:
                    stackedCardDimensions.width,

                height:
                    stackedCardDimensions.height,

                transitionMs:
                    0
            }
        }

        if (
            phase.value ===
            'closing'
        ) {
            if (
                selected &&
                transitionBox.value
            ) {
                const box =
                    closingAtTarget.value
                        ? transitionBox.value
                            .target
                        : transitionBox.value
                            .source

                return {
                    isOpen:
                        true,

                    isOpening:
                        false,

                    isMinimizing:
                        true,

                    isDragging:
                        false,

                    interactive:
                        false,

                    previewEffectsReady:
                        false,

                    showExpandedControls:
                        true,

                    fixedBox:
                        box,

                    fixedAnchor:
                        'left',

                    x:
                        0,

                    y:
                        0,

                    scale:
                        1,

                    opacity:
                        1,

                    visibility:
                        'visible',

                    zIndex:
                        900,

                    shadow:
                        closingAtTarget.value
                            ? 'var(--shadow-soft)'
                            : 'var(--shadow-strong)',

                    borderRadius:
                        closingAtTarget.value
                            ? 32
                            : 28,

                    transitionMs:
                        getTransitionMs()
                }
            }

            return {
                isOpen:
                    false,

                isOpening:
                    false,

                isMinimizing:
                    true,

                isDragging:
                    false,

                interactive:
                    false,

                previewEffectsReady:
                    false,

                showExpandedControls:
                    false,

                fixedBox:
                    null,

                x:
                    0,

                y:
                    stackedBaseY,

                scale:
                    getStackedScale(
                        index
                    ),

                opacity:
                    1,

                visibility:
                    'visible',

                zIndex:
                    cardCount -
                    index,

                shadow:
                    index ===
                        0
                        ? 'var(--shadow-mid)'
                        : 'var(--shadow-soft)',

                borderRadius:
                    32,

                width:
                    stackedCardDimensions.width,

                height:
                    stackedCardDimensions.height,

                transitionMs:
                    0
            }
        }

        if (
            !selected
        ) {
            return {
                isOpen:
                    false,

                isOpening:
                    false,

                isMinimizing:
                    false,

                isDragging:
                    false,

                interactive:
                    false,

                previewEffectsReady:
                    false,

                showExpandedControls:
                    false,

                fixedBox:
                    null,

                x:
                    0,

                y:
                    stackedBaseY,

                scale:
                    1,

                opacity:
                    0,

                visibility:
                    'hidden',

                zIndex:
                    cardCount -
                    index,

                shadow:
                    'var(--shadow-soft)',

                borderRadius:
                    32,

                width:
                    stackedCardDimensions.width,

                height:
                    stackedCardDimensions.height,

                transitionMs:
                    0
            }
        }

        const dragProgress =
            Math.min(
                1,
                expandedDragY.value /
                260
            )

        return {
            isOpen:
                true,

            isOpening:
                false,

            isMinimizing:
                false,

            isDragging:
                isExpandedDragging.value,

            dragProgress,

            interactive:
                true,

            previewEffectsReady:
                false,

            showExpandedControls:
                true,

            fixedBox:
                null,

            x:
                0,

            y:
                expandedDragY.value,

            rotateDeg:
                dragProgress *
                -1.25,

            scale:
                1 -
                dragProgress *
                0.045,

            opacity:
                1,

            visibility:
                'visible',

            zIndex:
                900,

            shadow:
                dragProgress >
                    0
                    ? [
                        '0 36px 78px rgba(31, 55, 43, 0.34)',
                        '0 14px 34px rgba(31, 55, 43, 0.24)'
                    ].join(', ')
                    : 'var(--shadow-strong)',

            borderRadius:
                28 +
                dragProgress *
                4,

            width:
                '100%',

            height:
                'auto',

            minHeight:
                'min(68dvh, 620px)',

            transitionMs:
                suppressTransition.value ||
                    isExpandedDragging.value
                    ? 0
                    : getTransitionMs()
        }
    }

    function handleCardActivate(
        cardId,
        sourceElement =
            null
    ) {
        if (
            phase.value !==
            'stacked' ||
            isTransitioning.value
        ) {
            return
        }

        openCard(
            cardId,
            {
                sourceElement
            }
        )
    }

    function syncFromRoute(
        path
    ) {
        if (
            suppressRouteSync.value
        ) {
            return
        }

        const card =
            navigation.getCardByPath(
                path
            )

        if (
            !card
        ) {
            if (
                path ===
                '/'
            ) {
                resetTransitionState()
            }

            return
        }

        if (
            phase.value ===
            'stacked' &&
            !getStackedRect(
                card.id
            ) &&
            pendingRouteOpenId !==
            card.id
        ) {
            pendingRouteOpenId =
                card.id

            requestAnimationFrame(
                () => {
                    pendingRouteOpenId =
                        null

                    if (
                        route.path !==
                        path
                    ) {
                        return
                    }

                    rememberAllStackedRects()

                    openCard(
                        card.id,
                        {
                            updateRoute:
                                false,

                            animate:
                                false
                        }
                    )
                }
            )

            return
        }

        openCard(
            card.id,
            {
                updateRoute:
                    false,

                animate:
                    false
            }
        )
    }

    function handleResize() {
        if (
            phase.value ===
            'stacked'
        ) {
            rememberAllStackedRects()
        }
    }

    window.addEventListener(
        'resize',
        handleResize
    )

    watch(
        () =>
            route.path,

        syncFromRoute,

        {
            immediate:
                true
        }
    )

    return {
        phase,
        mode,
        cardOrder,
        openCardId,
        isTransitioning,
        isExpandedDragging,
        expandedDragY,
        reducedMotion,
        stackBottomCompensation,

        registerCardElement,
        rememberStackedRect,
        rememberAllStackedRects,

        handleCardActivate,
        getCardVisual,
        openCard,
        minimizeCard,
        handleTransitionEnd,

        handleExpandedHandlePointerDown:
            sheetDrag.handlePointerDown,

        handleExpandedHandlePointerMove:
            sheetDrag.handlePointerMove,

        handleExpandedHandlePointerUp:
            sheetDrag.handlePointerUp,

        handleExpandedHandlePointerCancel:
            sheetDrag.handlePointerCancel
    }
}

export function useCardStack(
    params
) {
    if (
        !instance
    ) {
        instance =
            createCardStack(
                params
            )
    }

    return instance
}