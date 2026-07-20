import {
    computed,
    nextTick,
    ref,
    watch
} from 'vue'
import { useCardNavigation } from './useCardNavigation'
import { useSheetDrag } from './useSheetDrag'

let instance

function createCardStack({
    pages,
    router,
    route
}) {
    const navigation = useCardNavigation(pages)
    const defaultOrder = pages.map((page) => page.id)

    const cardOrder = ref([...defaultOrder])
    const phase = ref('stacked')
    const openCardId = ref(null)

    const openingAtTarget = ref(false)
    const isExpandedDragging = ref(false)
    const closingAtTarget = ref(false)
    const openingTopDone = ref(false)
    const openingWidthDone = ref(false)
    const openingHeightDone = ref(false)
    const closingTopDone = ref(false)
    const closingWidthDone = ref(false)
    const closingHeightDone = ref(false)

    const expandedDragY = ref(0)
    const stackScrollOffset = ref(0)
    const stackWheelOffset = ref(0)
    const stackWheelVelocity = ref(0)
    const transitionBox = ref(null)
    const suppressTransition = ref(false)
    const suppressRouteSync = ref(false)
    const previewEffectsReady = ref(true)

    const mode = computed(() => {
        if (
            phase.value === 'stacked' ||
            phase.value === 'preparing-open' ||
            phase.value === 'closing'
        ) {
            return 'stacked'
        }

        return 'expanded'
    })

    const cardElements = new Map()
    const stackedRects = new Map()

    const stackedOffset = 42
    const transitionDuration = 440
    const openingDuration = 560
    const openingSettleDelay = 140
    const minimizeThreshold = 130
    const minimizeVelocityThreshold = 0.55

    let fallbackTimer = null
    let previewEffectsTimer = null
    let pendingRouteOpenId = null
    let wheelInertiaRafId = null

    const reducedMotionQuery = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    )

    const reducedMotion = ref(reducedMotionQuery.matches)

    function handleReducedMotionChange(event) {
        reducedMotion.value = event.matches
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

    function getStackedScale(index) {
        return Math.max(0.9, 1 - index * 0.035)
    }

    function getStackedParallaxY(index) {
        if (phase.value !== 'stacked') {
            return 0
        }

        const depthFactor = Math.max(
            0.06,
            0.26 - index * 0.1
        )
        const combinedOffset =
            stackScrollOffset.value +
            stackWheelOffset.value
        return combinedOffset * depthFactor
    }

    function startWheelInertia() {
        if (wheelInertiaRafId !== null) {
            return
        }

        const tick = () => {
            stackWheelOffset.value = Math.max(
                -220,
                Math.min(
                    260,
                    stackWheelOffset.value +
                    stackWheelVelocity.value
                )
            )

            stackWheelVelocity.value *= 0.84
            stackWheelOffset.value *= 0.92

            const done =
                Math.abs(stackWheelVelocity.value) < 0.2 &&
                Math.abs(stackWheelOffset.value) < 0.2

            if (done) {
                stackWheelVelocity.value = 0
                stackWheelOffset.value = 0
                wheelInertiaRafId = null
                return
            }

            wheelInertiaRafId = requestAnimationFrame(tick)
        }

        wheelInertiaRafId = requestAnimationFrame(tick)
    }

    function getOpeningTransitionMs() {
        return reducedMotion.value
            ? 0
            : openingDuration
    }

    function getIndex(cardId) {
        return cardOrder.value.indexOf(cardId)
    }

    function clearFallbackTimer() {
        if (fallbackTimer === null) {
            return
        }

        window.clearTimeout(fallbackTimer)
        fallbackTimer = null
    }

    function clearPreviewEffectsTimer() {
        if (previewEffectsTimer === null) {
            return
        }

        window.clearTimeout(previewEffectsTimer)
        previewEffectsTimer = null
    }

    function schedulePreviewEffectsEnable(delay = 200) {
        clearPreviewEffectsTimer()

        previewEffectsTimer = window.setTimeout(() => {
            previewEffectsReady.value = true
            previewEffectsTimer = null
        }, delay)
    }

    function moveCardToFront(cardId) {
        const index = cardOrder.value.indexOf(cardId)

        if (index <= 0) {
            return
        }

        const nextOrder = [...cardOrder.value]
        nextOrder.splice(index, 1)
        nextOrder.unshift(cardId)
        cardOrder.value = nextOrder
    }

    function registerCardElement(cardId, element) {
        if (!cardId) {
            return
        }

        if (!element) {
            cardElements.delete(cardId)
            return
        }

        cardElements.set(cardId, element)
    }

    function rememberStackedRect(cardId, element = null) {
        if (
            !cardId ||
            phase.value !== 'stacked'
        ) {
            return
        }

        const targetElement =
            element ||
            cardElements.get(cardId)

        if (!targetElement) {
            return
        }

        stackedRects.set(
            cardId,
            targetElement.getBoundingClientRect()
        )
    }

    function rememberAllStackedRects() {
        if (phase.value !== 'stacked') {
            return
        }

        cardOrder.value.forEach((cardId) => {
            rememberStackedRect(
                cardId,
                cardElements.get(cardId)
            )
        })
    }

    function getStackedRect(cardId) {
        return stackedRects.get(cardId) ?? null
    }

    function createBox(rect) {
        return {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
        }
    }

    function getExpandedTargetBox(
        sourceRect = null,
        sourceElement = null
    ) {
        const viewportWidth = window.innerWidth

        const horizontalMargin = viewportWidth < 640
            ? 16
            : 24

        const maxWidth = 860

        const stageRect = sourceElement
            ?.closest('.card-stage')
            ?.getBoundingClientRect()

        const isMobileViewport = viewportWidth < 640

        const availableWidth = isMobileViewport
            ? (
                stageRect
                    ? stageRect.width
                    : viewportWidth - horizontalMargin * 2
            )
            : viewportWidth - horizontalMargin * 2

        const width = Math.min(
            Math.max(0, availableWidth),
            maxWidth
        )

        const left = isMobileViewport && stageRect
            ? stageRect.left + (stageRect.width - width) / 2
            : Math.min(
                Math.max(
                    horizontalMargin,
                    viewportWidth / 2 - width / 2
                ),
                Math.max(
                    horizontalMargin,
                    viewportWidth - horizontalMargin - width
                )
            )

        const top = stageRect?.top ?? (
            viewportWidth < 640
                ? 96
                : 112
        )

        const minExpandedHeight = viewportWidth <= 768
            ? Math.min(window.innerHeight * 0.76, 740)
            : Math.min(window.innerHeight * 0.74, 760)

        let measuredExpandedHeight = minExpandedHeight

        if (sourceElement) {
            const probe = sourceElement.cloneNode(true)

            probe.style.position = 'fixed'
            probe.style.left = '-100000px'
            probe.style.right = 'auto'
            probe.style.top = '0'
            probe.style.bottom = 'auto'
            probe.style.width = `${width}px`
            probe.style.height = 'auto'
            probe.style.minHeight = `${minExpandedHeight}px`
            probe.style.maxHeight = 'none'
            probe.style.margin = '0'
            probe.style.transform = 'none'
            probe.style.transition = 'none'
            probe.style.visibility = 'hidden'
            probe.style.pointerEvents = 'none'
            probe.style.overflow = 'visible'
            probe.style.opacity = '1'

            document.body.appendChild(probe)
            measuredExpandedHeight =
                probe.getBoundingClientRect().height
            document.body.removeChild(probe)
        }

        const height = Math.max(
            minExpandedHeight,
            measuredExpandedHeight
        )

        return {
            top,
            left,
            width,
            height
        }
    }

    function getStackedTopCardSize() {
        return {
            width: Math.min(window.innerWidth * 0.92, 680),
            height: Math.min(window.innerHeight * 0.54, 520)
        }
    }

    function normalizeClosingTargetBox(rect) {
        if (!rect) {
            return null
        }

        const canonical = getStackedTopCardSize()
        const centerX = rect.left + rect.width / 2
        const bottom = rect.top + rect.height

        return {
            top: bottom - canonical.height,
            left: centerX - canonical.width / 2,
            width: canonical.width,
            height: canonical.height
        }
    }

    function pushRoute(path) {
        if (route.path === path) {
            return
        }

        suppressRouteSync.value = true

        router.push(path)
            .finally(() => {
                suppressRouteSync.value = false
            })
    }

    function resetTransitionState() {
        clearFallbackTimer()
        clearPreviewEffectsTimer()

        phase.value = 'stacked'
        openCardId.value = null
        openingAtTarget.value = false
        isExpandedDragging.value = false
        closingAtTarget.value = false
        openingTopDone.value = false
        openingWidthDone.value = false
        openingHeightDone.value = false
        closingTopDone.value = false
        closingWidthDone.value = false
        closingHeightDone.value = false

        expandedDragY.value = 0
        transitionBox.value = null
        previewEffectsReady.value = true
    }

    async function beginOpening(
        cardId,
        sourceElement,
        shouldUpdateRoute = true
    ) {
        if (
            !cardId ||
            !sourceElement ||
            phase.value !== 'stacked'
        ) {
            return
        }

        clearFallbackTimer()
        clearPreviewEffectsTimer()
        previewEffectsReady.value = false

        const sourceRect =
            sourceElement.getBoundingClientRect()

        stackedRects.set(
            cardId,
            sourceRect
        )

        transitionBox.value = {
            source: createBox(sourceRect),
            target: getExpandedTargetBox(
                sourceRect,
                sourceElement
            ),
            updateRoute: shouldUpdateRoute
        }

        openCardId.value = cardId
        phase.value = 'preparing-open'
        openingAtTarget.value = false
        openingTopDone.value = false
        openingWidthDone.value = false
        openingHeightDone.value = false

        await nextTick()

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (
                    phase.value !== 'preparing-open' ||
                    openCardId.value !== cardId
                ) {
                    return
                }

                phase.value = 'opening'

                requestAnimationFrame(() => {
                    if (
                        phase.value !== 'opening' ||
                        openCardId.value !== cardId
                    ) {
                        return
                    }

                    openingAtTarget.value = true

                    fallbackTimer = window.setTimeout(() => {
                        finishOpening()
                    }, getOpeningTransitionMs() + 80)
                })
            })
        })

        if (shouldUpdateRoute) {
            const path =
                navigation.getPathByCardId(cardId)

            if (path) {
                pushRoute(path)
            }
        }
    }

    function finishOpening() {
        if (phase.value !== 'opening') {
            return
        }

        clearFallbackTimer()

        suppressTransition.value = true
        phase.value = 'expanded'
        openingAtTarget.value = false
        openingTopDone.value = false
        openingWidthDone.value = false
        openingHeightDone.value = false
        transitionBox.value = null
        previewEffectsReady.value = false

        nextTick(() => {
            window.setTimeout(() => {
                requestAnimationFrame(() => {
                    suppressTransition.value = false
                })
            }, openingSettleDelay)
        })
    }

    function openCard(cardId, options = {}) {
        if (!cardId) {
            return
        }

        const {
            updateRoute: shouldUpdateRoute = true,
            sourceElement = null,
            animate = true
        } = options

        const element =
            sourceElement ||
            cardElements.get(cardId)

        if (phase.value !== 'stacked') {
            return
        }

        if (animate && element && !reducedMotion.value) {
            beginOpening(
                cardId,
                element,
                shouldUpdateRoute
            )

            return
        }

        resetTransitionState()

        openCardId.value = cardId
        phase.value = 'expanded'

        nextTick(() => {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'auto'
            })
        })

        if (!shouldUpdateRoute) {
            return
        }

        const path =
            navigation.getPathByCardId(cardId)

        if (path) {
            pushRoute(path)
        }
    }

    function finalizeMinimize(options = {}) {
        const {
            updateRoute: shouldUpdateRoute = true
        } = options

        clearFallbackTimer()
        clearPreviewEffectsTimer()

        suppressTransition.value = true

        phase.value = 'stacked'
        openCardId.value = null
        openingAtTarget.value = false
        isExpandedDragging.value = false
        closingAtTarget.value = false
        closingTopDone.value = false
        closingWidthDone.value = false
        closingHeightDone.value = false

        expandedDragY.value = 0
        transitionBox.value = null
        previewEffectsReady.value = false

        nextTick(() => {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'auto'
            })

            rememberAllStackedRects()

            requestAnimationFrame(() => {
                suppressTransition.value = false
            })

            schedulePreviewEffectsEnable()

            if (
                shouldUpdateRoute &&
                route.path !== '/'
            ) {
                pushRoute('/')
            }
        })
    }

    function beginClosing(options = {}) {
        const {
            updateRoute: shouldUpdateRoute = true
        } = options

        if (
            phase.value !== 'expanded' ||
            !openCardId.value ||
            isExpandedDragging.value
        ) {
            return
        }

        const cardId = openCardId.value
        const element = cardElements.get(cardId)
        const sourceRect =
            element?.getBoundingClientRect() ?? null
        const topCardId = cardOrder.value[0] ?? cardId
        const topSlotRect =
            getStackedRect(topCardId) ||
            getStackedRect(cardId)

        moveCardToFront(cardId)

        const targetRect =
            topSlotRect ||
            getStackedRect(cardId)

        const normalizedTargetBox =
            normalizeClosingTargetBox(targetRect)

        if (
            !element ||
            !sourceRect ||
            !targetRect ||
            !normalizedTargetBox
        ) {
            finalizeMinimize({
                updateRoute: shouldUpdateRoute
            })

            return
        }

        transitionBox.value = {
            source: createBox(sourceRect),
            target: normalizedTargetBox,
            updateRoute: shouldUpdateRoute
        }

        expandedDragY.value = 0
        isExpandedDragging.value = false
        phase.value = 'closing'
        closingAtTarget.value = false
        closingTopDone.value = false
        closingWidthDone.value = false
        closingHeightDone.value = false

        nextTick(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (phase.value !== 'closing') {
                        return
                    }

                    closingAtTarget.value = true

                    fallbackTimer =
                        window.setTimeout(() => {
                            finalizeMinimize({
                                updateRoute:
                                    shouldUpdateRoute
                            })
                        }, getTransitionMs() + 60)
                })
            })
        })
    }

    function minimizeCard(options = {}) {
        if (reducedMotion.value) {
            finalizeMinimize(options)
            return
        }

        beginClosing(options)
    }

    const sheetDrag = useSheetDrag({
        onStart() {
            if (
                phase.value !== 'expanded' ||
                !openCardId.value ||
                !cardElements.get(openCardId.value)
            ) {
                return false
            }

            if (window.scrollY > 8) {
                return false
            }

            clearFallbackTimer()

            isExpandedDragging.value = true
            expandedDragY.value = 0

            return true
        },

        onMove({
            distance
        }) {
            if (!isExpandedDragging.value) {
                return
            }

            expandedDragY.value =
                Math.max(0, distance)
        },

        onEnd({
            distance,
            velocity
        }) {
            if (!isExpandedDragging.value) {
                return
            }

            isExpandedDragging.value = false

            const shouldMinimize =
                distance >= minimizeThreshold ||
                velocity >= minimizeVelocityThreshold

            if (shouldMinimize) {
                beginClosing()
                return
            }

            expandedDragY.value = 0
        },

        onCancel() {
            isExpandedDragging.value = false
            expandedDragY.value = 0
        }
    })

    function handleTransitionEnd(event) {
        if (
            event.target !== event.currentTarget
        ) {
            return
        }

        if (
            event.propertyName !== 'top' &&
            event.propertyName !== 'width' &&
            event.propertyName !== 'height'
        ) {
            return
        }

        if (phase.value === 'opening') {
            if (event.propertyName === 'top') {
                openingTopDone.value = true
            }

            if (event.propertyName === 'width') {
                openingWidthDone.value = true
            }

            if (event.propertyName === 'height') {
                openingHeightDone.value = true
            }

            if (
                !openingTopDone.value ||
                !openingWidthDone.value ||
                !openingHeightDone.value
            ) {
                return
            }

            finishOpening()
            return
        }

        if (phase.value === 'closing') {
            if (event.propertyName === 'top') {
                closingTopDone.value = true
            }

            if (event.propertyName === 'width') {
                closingWidthDone.value = true
            }

            if (event.propertyName === 'height') {
                closingHeightDone.value = true
            }

            if (
                !closingTopDone.value ||
                !closingWidthDone.value ||
                !closingHeightDone.value
            ) {
                return
            }

            const shouldUpdateRoute =
                transitionBox.value?.updateRoute ?? true

            finalizeMinimize({
                updateRoute: shouldUpdateRoute
            })
        }
    }

    function getCardVisual(cardId) {
        const index = getIndex(cardId)
        const cardCount = cardOrder.value.length
        const selected =
            openCardId.value === cardId
        const preparing =
            phase.value === 'preparing-open'

        if (
            phase.value === 'stacked' ||
            preparing
        ) {
            const stackedY =
                index * -stackedOffset +
                getStackedParallaxY(index)

            return {
                isOpen: false,
                isOpening:
                    phase.value === 'opening',
                isMinimizing:
                    phase.value === 'closing',
                isDragging: false,
                interactive:
                    phase.value === 'stacked',
                previewEffectsReady:
                    phase.value === 'stacked' &&
                    previewEffectsReady.value,
                fixedBox: null,
                x: 0,
                y: stackedY,
                scale: getStackedScale(index),
                opacity:
                    preparing && !selected
                        ? 0
                        : 1,
                visibility:
                    preparing && !selected
                        ? 'hidden'
                        : 'visible',
                zIndex:
                    preparing && selected
                        ? 100
                        : cardCount - index,
                shadow: index === 0
                    ? 'var(--shadow-mid)'
                    : 'var(--shadow-soft)',
                borderRadius: 32,
                width: 'min(92vw, 680px)',
                height: 'min(54dvh, 520px)',
                transitionMs:
                    preparing ||
                        suppressTransition.value
                        ? 0
                        : getTransitionMs()
            }
        }

        if (phase.value === 'opening') {
            if (selected && transitionBox.value) {
                const box = openingAtTarget.value
                    ? transitionBox.value.target
                    : transitionBox.value.source

                return {
                    isOpen: true,
                    isOpening: true,
                    isMinimizing: false,
                    isDragging: false,
                    interactive: false,
                    previewEffectsReady: false,
                    fixedBox: box,
                    fixedAnchor: 'center',
                    x: 0,
                    y: 0,
                    scale: 1,
                    opacity: 1,
                    visibility: 'visible',
                    zIndex: 100,
                    shadow: 'var(--shadow-strong)',
                    borderRadius: openingAtTarget.value
                        ? 28
                        : 32,
                    transitionMs:
                        getOpeningTransitionMs(),
                    fixedTimingFunction:
                        'cubic-bezier(0.2, 0.9, 0.24, 1)'
                }
            }

            return {
                isOpen: false,
                isOpening: true,
                isMinimizing: false,
                isDragging: false,
                interactive: false,
                previewEffectsReady: false,
                fixedBox: null,
                x: 0,
                y: index * -stackedOffset,
                scale: 1,
                opacity: 0,
                visibility: 'hidden',
                zIndex: cardCount - index,
                shadow: 'var(--shadow-soft)',
                borderRadius: 32,
                width: 'min(92vw, 680px)',
                height: 'min(54dvh, 520px)',
                transitionMs: 0
            }
        }

        if (phase.value === 'closing') {
            if (selected && transitionBox.value) {
                const box = closingAtTarget.value
                    ? transitionBox.value.target
                    : transitionBox.value.source

                return {
                    isOpen: true,
                    isOpening: false,
                    isMinimizing: true,
                    isDragging: false,
                    interactive: false,
                    previewEffectsReady: false,
                    fixedBox: box,
                    fixedAnchor: 'left',
                    x: 0,
                    y: 0,
                    scale: 1,
                    opacity: 1,
                    visibility: 'visible',
                    zIndex: 100,
                    shadow: closingAtTarget.value
                        ? 'var(--shadow-soft)'
                        : 'var(--shadow-strong)',
                    borderRadius: closingAtTarget.value
                        ? 32
                        : 28,
                    transitionMs: getTransitionMs()
                }
            }

            return {
                isOpen: false,
                isOpening: false,
                isMinimizing: true,
                isDragging: false,
                interactive: false,
                previewEffectsReady: false,
                fixedBox: null,
                x: 0,
                y:
                    index * -stackedOffset +
                    getStackedParallaxY(index),
                scale: getStackedScale(index),
                opacity: 1,
                visibility: 'visible',
                zIndex: cardCount - index,
                shadow: index === 0
                    ? 'var(--shadow-mid)'
                    : 'var(--shadow-soft)',
                borderRadius: 32,
                width: 'min(92vw, 680px)',
                height: 'min(54dvh, 520px)',
                transitionMs: 0
            }
        }

        if (!selected) {
            return {
                isOpen: false,
                isOpening: false,
                isMinimizing: false,
                isDragging: false,
                interactive: false,
                previewEffectsReady: false,
                fixedBox: null,
                x: 0,
                y: index * -stackedOffset,
                scale: 1,
                opacity: 0,
                visibility: 'hidden',
                zIndex: cardCount - index,
                shadow: 'var(--shadow-soft)',
                borderRadius: 32,
                width: 'min(92vw, 680px)',
                height: 'min(54dvh, 520px)',
                transitionMs: 0
            }
        }

        const dragProgress = Math.min(
            1,
            expandedDragY.value / 260
        )

        return {
            isOpen: true,
            isOpening: false,
            isMinimizing: false,
            isDragging: isExpandedDragging.value,
            dragProgress,
            interactive: true,
            previewEffectsReady: false,
            fixedBox: null,
            x: 0,
            y: expandedDragY.value,
            rotateDeg: dragProgress * -1.25,
            scale: 1 - dragProgress * 0.045,
            opacity: 1,
            visibility: 'visible',
            zIndex: 50,
            shadow: dragProgress > 0
                ? '0 36px 78px rgba(31, 55, 43, 0.34), 0 14px 34px rgba(31, 55, 43, 0.24)'
                : 'var(--shadow-strong)',
            borderRadius: 28 + dragProgress * 4,
            width: 'min(100%, 860px)',
            height: 'auto',
            minHeight: 'min(74dvh, 760px)',
            transitionMs:
                suppressTransition.value ||
                    isExpandedDragging.value
                    ? 0
                    : getTransitionMs()
        }
    }

    function handleCardActivate(
        cardId,
        sourceElement = null
    ) {
        if (phase.value !== 'stacked') {
            return
        }

        openCard(cardId, {
            sourceElement
        })
    }

    function syncFromRoute(path) {
        if (suppressRouteSync.value) {
            return
        }

        const card =
            navigation.getCardByPath(path)

        if (!card) {
            if (path === '/') {
                resetTransitionState()
            }

            return
        }

        if (
            phase.value === 'stacked' &&
            !getStackedRect(card.id) &&
            pendingRouteOpenId !== card.id
        ) {
            pendingRouteOpenId = card.id

            requestAnimationFrame(() => {
                pendingRouteOpenId = null

                if (route.path !== path) {
                    return
                }

                rememberAllStackedRects()

                openCard(card.id, {
                    updateRoute: false,
                    animate: false
                })
            })

            return
        }

        openCard(card.id, {
            updateRoute: false,
            animate: false
        })
    }

    function handleResize() {
        if (phase.value === 'stacked') {
            rememberAllStackedRects()
        }
    }

    function handleScroll() {
        if (phase.value !== 'stacked') {
            return
        }

        stackScrollOffset.value = Math.max(
            -140,
            Math.min(220, window.scrollY)
        )
    }

    function handleWheel(event) {
        if (phase.value !== 'stacked') {
            return
        }

        stackWheelVelocity.value = Math.max(
            -22,
            Math.min(
                22,
                stackWheelVelocity.value +
                event.deltaY * 0.06
            )
        )

        startWheelInertia()
    }

    window.addEventListener(
        'resize',
        handleResize
    )

    window.addEventListener(
        'scroll',
        handleScroll,
        { passive: true }
    )

    window.addEventListener(
        'wheel',
        handleWheel,
        { passive: true }
    )

    watch(
        () => route.path,
        syncFromRoute,
        {
            immediate: true
        }
    )

    return {
        phase,
        mode,
        cardOrder,
        openCardId,
        isExpandedDragging,
        expandedDragY,
        reducedMotion,
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

export function useCardStack(params) {
    if (!instance) {
        instance = createCardStack(params)
    }

    return instance
}