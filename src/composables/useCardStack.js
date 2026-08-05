import {
    computed,
    nextTick,
    onBeforeUnmount,
    reactive,
    ref,
    watch
} from 'vue';

import { useCardNavigation } from './useCardNavigation';

const OVERVIEW_RADIUS = 40;
const EXPANDED_RADIUS = 40;
const OVERVIEW_SNAP_DURATION = 320;
const SHELL_TRANSITION_DURATION = 520;
const OVERVIEW_SNAP_EASING =
    'cubic-bezier(0.22, 1, 0.36, 1)';
const SHELL_TRANSITION_EASING =
    'cubic-bezier(0.22, 1, 0.36, 1)';

const MOBILE_OVERVIEW_TRANSFORMS = [
    {
        x: 0,
        y: 120,
        scale: 1,
        zIndex: 30
    },
    {
        x: 0,
        y: 60,
        scale: 0.95,
        zIndex: 20
    },
    {
        x: 0,
        y: 0,
        scale: 0.90,
        zIndex: 10
    }
];

const DESKTOP_OVERVIEW_TRANSFORMS = [
    {
        x: 0,
        y: 104,
        scale: 1,
        zIndex: 30
    },
    {
        x: 0,
        y: 52,
        scale: 0.972,
        zIndex: 20
    },
    {
        x: 0,
        y: 0,
        scale: 0.944,
        zIndex: 10
    }
];

const INTERACTIVE_SELECTOR = [
    'a',
    'button',
    'input',
    'textarea',
    'select',
    'label',
    'iframe',
    '[contenteditable="true"]',
    '[data-no-drag]'
].join(', ');

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

function normalizeRect(rect) {
    if (!rect) {
        return null;
    }

    return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
    };
}

function createCardStack({
    pages,
    router,
    route
}) {
    const navigation =
        useCardNavigation(
            pages
        );

    const state = reactive({
        mode: 'overview',
        activePageId: null,
        overviewPageId:
            pages[0]?.id ??
            null,
        interactionLocked: false,
        transitionType: null,
        transitionDirection: 1,
        sharedPageId: null,
        captureMode: null,
        captureScrollY: 0,
        captureRect: null
    });

    const cardOrder = ref(
        pages.map((page) => {
            return page.id;
        })
    );

    const viewportWidth = ref(
        window.innerWidth ||
        1280
    );

    const viewportHeight = ref(
        window.innerHeight ||
        800
    );

    const reducedMotionQuery =
        window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        );

    const reducedMotion = ref(
        reducedMotionQuery.matches
    );

    const stageElement = ref(null);
    const overviewDragX = ref(0);
    const overviewDragging = ref(false);

    const overviewCardElements =
        new Map();

    const expandedCardElement =
        ref(null);

    const pageScrollPositions =
        new Map();

    let suppressRouteSync =
        false;

    let suppressOverviewClickUntil =
        0;

    let overviewPointerId =
        null;

    let overviewStartX =
        0;

    let overviewStartY =
        0;

    let overviewLastX =
        0;

    let overviewLastTime =
        0;

    let overviewVelocity =
        0;

    let overviewGestureClaimed =
        false;

    const mode = computed(() => {
        return state.mode ===
            'overview'
            ? 'stacked'
            : 'expanded';
    });

    const isOverview = computed(() => {
        return state.mode ===
            'overview';
    });

    const activePage = computed(() => {
        return pages.find((page) => {
            return (
                page.id ===
                state.activePageId
            );
        }) ?? null;
    });

    function getHeaderHeight() {
        const source =
            stageElement.value ??
            document.documentElement;

        const value =
            window
                .getComputedStyle(
                    source
                )
                .getPropertyValue(
                    '--app-header-height'
                );

        const parsed =
            Number.parseFloat(
                value
            );

        return Number.isFinite(
            parsed
        )
            ? parsed
            : 60;
    }

    function getStageRect() {
        const rect =
            normalizeRect(
                stageElement.value
                    ?.getBoundingClientRect()
            );

        if (rect) {
            return rect;
        }

        return {
            top:
                getHeaderHeight(),
            left: 0,
            width:
                viewportWidth.value,
            height:
                Math.max(
                    1,
                    viewportHeight.value -
                    getHeaderHeight()
                )
        };
    }

    function getExpandedViewportRect() {
        const stageRect =
            getStageRect();

        const headerHeight =
            getHeaderHeight();

        return {
            top:
                headerHeight,
            left:
                stageRect.left,
            width:
                stageRect.width,
            height:
                Math.max(
                    1,
                    viewportHeight.value -
                    headerHeight
                )
        };
    }

    function getOverviewTransforms() {
        return viewportWidth.value <
            768
            ? MOBILE_OVERVIEW_TRANSFORMS
            : DESKTOP_OVERVIEW_TRANSFORMS;
    }

    function getOverviewMetrics() {
        const stageRect =
            getStageRect();

        const isMobile =
            viewportWidth.value <
            768;

        const cardWidth = isMobile
            ? clamp(
                stageRect.width -
                16,
                280,
                430
            )
            : clamp(
                stageRect.width *
                0.74,
                540,
                860
            );

        const cardHeight = isMobile
            ? clamp(
                viewportHeight.value *
                0.70,
                470,
                680
            )
            : clamp(
                viewportHeight.value *
                0.72,
                540,
                720
            );

        const transforms =
            getOverviewTransforms();

        const maximumY =
            Math.max(
                ...transforms.map(
                    (transform) => {
                        return transform.y;
                    }
                )
            );

        return {
            cardWidth,
            cardHeight,
            baseLeft:
                (
                    stageRect.width -
                    cardWidth
                ) /
                2,
            stageHeight:
                cardHeight +
                maximumY +
                8
        };
    }

    const stageMinHeight = computed(() => {
        if (
            state.mode ===
            'overview'
        ) {
            return `${getOverviewMetrics().stageHeight}px`;
        }

        return 'calc(100dvh - var(--app-header-height, 0px))';
    });

    function getPageIndex(pageId) {
        return cardOrder.value.indexOf(
            pageId
        );
    }

    function getOverviewSlot(cardId) {
        const count =
            cardOrder.value.length;

        const activeIndex =
            getPageIndex(
                state.overviewPageId ??
                cardOrder.value[0]
            );

        const cardIndex =
            getPageIndex(
                cardId
            );

        if (
            count <= 0 ||
            activeIndex < 0 ||
            cardIndex < 0
        ) {
            return 0;
        }

        return (
            cardIndex -
            activeIndex +
            count
        ) % count;
    }

    function getOverviewVisual(cardId) {
        const metrics =
            getOverviewMetrics();

        const slot =
            clamp(
                getOverviewSlot(
                    cardId
                ),
                0,
                2
            );

        const transform =
            getOverviewTransforms()[slot];

        const dragStrength =
            slot === 0
                ? 1
                : slot === 1
                    ? 0.62
                    : 0.38;

        return {
            width:
                `${metrics.cardWidth}px`,
            height:
                `${metrics.cardHeight}px`,
            baseLeft:
                `${metrics.baseLeft}px`,
            x:
                transform.x +
                overviewDragX.value *
                dragStrength,
            y:
                transform.y,
            scale:
                transform.scale,
            opacity: 1,
            zIndex:
                transform.zIndex,
            borderRadius:
                OVERVIEW_RADIUS,
            interactive:
                !state.interactionLocked,
            transitionMs:
                state.interactionLocked ||
                    overviewDragging.value ||
                    reducedMotion.value
                    ? 0
                    : OVERVIEW_SNAP_DURATION,
            transitionEasing:
                OVERVIEW_SNAP_EASING
        };
    }

    function cardPath(cardId) {
        return navigation
            .getPathByCardId(
                cardId
            );
    }

    function registerStageElement(element) {
        stageElement.value =
            element ??
            null;
    }

    function registerOverviewCardElement(
        cardId,
        element
    ) {
        if (!cardId) {
            return;
        }

        if (!element) {
            overviewCardElements.delete(
                cardId
            );

            return;
        }

        overviewCardElements.set(
            cardId,
            element
        );
    }

    function registerExpandedCardElement(
        element
    ) {
        expandedCardElement.value =
            element ??
            null;
    }

    function captureScrollPosition(
        cardId
    ) {
        if (!cardId) {
            return;
        }

        pageScrollPositions.set(
            cardId,
            window.scrollY ??
            window.pageYOffset ??
            0
        );
    }

    function restoreScrollPosition(
        cardId
    ) {
        const scrollTop =
            pageScrollPositions.get(
                cardId
            ) ??
            0;

        window.requestAnimationFrame(() => {
            window.scrollTo({
                top:
                    scrollTop,
                left: 0,
                behavior: 'auto'
            });
        });
    }

    async function pushRoute(path) {
        if (
            !path ||
            route.path ===
            path
        ) {
            return;
        }

        suppressRouteSync =
            true;

        try {
            await router.push(
                path
            );
        } finally {
            suppressRouteSync =
                false;
        }
    }

    function waitForFrames(count = 1) {
        return new Promise((resolve) => {
            const next = () => {
                if (count <= 0) {
                    resolve();

                    return;
                }

                count -= 1;
                window.requestAnimationFrame(next);
            };

            next();
        });
    }

    function hideElement(element) {
        if (!element) {
            return;
        }

        element.style.visibility =
            'hidden';
    }

    function showElement(element) {
        if (!element) {
            return;
        }

        element.style.visibility =
            '';
    }

    function createTransitionShell(
        sourceElement,
        {
            rectOverride = null
        } = {}
    ) {
        if (!sourceElement) {
            return null;
        }

        const sourceRect =
            rectOverride ??
            normalizeRect(
                sourceElement
                    .getBoundingClientRect()
            );

        if (!sourceRect) {
            return null;
        }

        const shell =
            sourceElement.cloneNode(
                true
            );

        shell.setAttribute(
            'aria-hidden',
            'true'
        );

        shell.style.position =
            'fixed';
        shell.style.top =
            `${sourceRect.top}px`;
        shell.style.left =
            `${sourceRect.left}px`;
        shell.style.width =
            `${sourceRect.width}px`;
        shell.style.height =
            `${sourceRect.height}px`;
        shell.style.minHeight =
            `${sourceRect.height}px`;
        shell.style.margin =
            '0';
        shell.style.zIndex =
            '120';
        shell.style.pointerEvents =
            'none';
        shell.style.overflow =
            'hidden';
        shell.style.contain =
            'paint';
        shell.style.transformOrigin =
            'top left';

        document.body.appendChild(
            shell
        );

        return {
            element: shell,
            rect: sourceRect
        };
    }

    function getExpandedAnimationRect(
        expandedElement
    ) {
        const expandedRect =
            normalizeRect(
                expandedElement
                    ?.getBoundingClientRect()
            );

        if (!expandedRect) {
            return null;
        }

        const captureContentElement =
            expandedElement.querySelector(
                '.page-card__capture-content'
            );

        const contentHeight =
            captureContentElement instanceof HTMLElement
                ? captureContentElement.scrollHeight
                : expandedElement.scrollHeight;

        const targetHeight =
            Math.max(
                expandedRect.height,
                Math.ceil(
                    contentHeight ||
                    expandedRect.height
                )
            );

        return {
            ...expandedRect,
            height: targetHeight
        };
    }

    async function animateTransitionShell(
        shell,
        {
            previewRect,
            expandedRect,
            opening
        }
    ) {
        if (
            !shell ||
            !previewRect ||
            !expandedRect
        ) {
            return;
        }

        const translateX =
            previewRect.left -
            expandedRect.left;
        const translateY =
            previewRect.top -
            expandedRect.top;
        const scaleX =
            previewRect.width /
            expandedRect.width;
        const scaleY =
            previewRect.height /
            expandedRect.height;
        const radiusScale =
            (scaleX + scaleY) /
            2;

        const fromKeyframe = {
            transform: [
                `translate3d(${translateX}px, ${translateY}px, 0)`,
                `scale(${scaleX}, ${scaleY})`
            ].join(' '),
            borderRadius:
                `${OVERVIEW_RADIUS / Math.max(radiusScale, 0.001)}px`
        };

        const toKeyframe = {
            transform:
                'translate3d(0, 0, 0) scale(1)',
            borderRadius:
                `${EXPANDED_RADIUS}px`
        };

        const animation =
            shell.animate(
                opening
                    ? [
                        fromKeyframe,
                        toKeyframe
                    ]
                    : [
                        toKeyframe,
                        fromKeyframe
                    ],
                {
                    duration:
                        SHELL_TRANSITION_DURATION,
                    easing:
                        SHELL_TRANSITION_EASING,
                    fill: 'both'
                }
            );

        await animation.finished;
    }

    function clearTransitionState() {
        state.interactionLocked =
            false;
        state.sharedPageId =
            null;
        state.captureMode =
            null;
        state.captureScrollY =
            0;
        state.captureRect =
            null;
    }

    async function runImmediateUpdate(
        callback
    ) {
        await callback();
        await nextTick();
    }

    async function openFromOverview(
        cardId,
        {
            updateRoute = true,
            animate = true
        } = {}
    ) {
        if (
            !cardId ||
            state.mode !==
            'overview' ||
            state.interactionLocked
        ) {
            return;
        }

        const targetPath =
            cardPath(
                cardId
            );

        const previewElement =
            overviewCardElements.get(
                cardId
            );

        const previewRect =
            normalizeRect(
                previewElement
                    ?.getBoundingClientRect()
            );

        if (!previewElement || !previewRect) {
            return;
        }

        state.interactionLocked =
            true;
        state.captureMode =
            'opening';
        state.captureScrollY =
            0;
        state.captureRect =
            getExpandedViewportRect();

        state.mode =
            'expanded';
        state.activePageId =
            cardId;
        state.overviewPageId =
            cardId;

        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'auto'
        });

        await nextTick();

        const expandedElement =
            expandedCardElement.value;

        let expandedRect =
            getExpandedAnimationRect(
                expandedElement
            );

        if (!expandedElement || !expandedRect) {
            clearTransitionState();

            return;
        }

        if (
            state.captureRect &&
            expandedRect.height >
            state.captureRect.height
        ) {
            state.captureRect = {
                ...state.captureRect,
                height:
                    expandedRect.height
            };

            await nextTick();

            expandedRect =
                getExpandedAnimationRect(
                    expandedCardElement.value
                ) ??
                expandedRect;
        }

        if (
            !animate ||
            reducedMotion.value
        ) {
            state.captureMode =
                null;
            state.captureRect =
                null;

            await nextTick();

            if (updateRoute) {
                await pushRoute(
                    targetPath
                );
            }

            clearTransitionState();

            return;
        }

        const shellRecord =
            createTransitionShell(
                expandedElement,
                {
                    rectOverride:
                        expandedRect
                }
            );

        hideElement(
            expandedElement
        );

        try {
            await waitForFrames(1);

            await animateTransitionShell(
                shellRecord?.element,
                {
                    previewRect,
                    expandedRect,
                    opening: true
                }
            );
        } finally {
            shellRecord?.element?.remove();
            state.captureMode =
                null;
            state.captureRect =
                null;

            await nextTick();
            showElement(
                expandedCardElement.value
            );
        }

        if (updateRoute) {
            await pushRoute(
                targetPath
            );
        }

        clearTransitionState();
    }

    async function closeToOverview({
        updateRoute = true,
        animate = true
    } = {}) {
        const cardId =
            state.activePageId;

        if (
            !cardId ||
            state.mode !==
            'expanded' ||
            state.interactionLocked
        ) {
            return;
        }

        captureScrollPosition(
            cardId
        );

        state.interactionLocked =
            true;
        state.captureMode =
            'closing';
        state.captureScrollY =
            window.scrollY ??
            0;
        state.captureRect =
            getExpandedViewportRect();
        state.overviewPageId =
            cardId;

        await nextTick();

        const expandedElement =
            expandedCardElement.value;

        const expandedRect =
            normalizeRect(
                expandedElement
                    ?.getBoundingClientRect()
            );

        if (!expandedElement || !expandedRect) {
            clearTransitionState();

            return;
        }

        hideElement(
            expandedElement
        );

        state.mode =
            'overview';
        state.activePageId =
            null;

        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'auto'
        });

        await nextTick();
        await waitForFrames(2);

        const previewElement =
            overviewCardElements.get(
                cardId
            );

        const previewRect =
            normalizeRect(
                previewElement
                    ?.getBoundingClientRect()
            );

        if (!previewElement || !previewRect) {
            if (updateRoute) {
                await pushRoute('/');
            }

            clearTransitionState();

            return;
        }

        if (
            animate &&
            !reducedMotion.value
        ) {
            const shellRecord =
                createTransitionShell(
                    previewElement
                );

            hideElement(
                previewElement
            );

            try {
                const shellElement =
                    shellRecord?.element;

                if (shellElement) {
                    const translateX =
                        previewRect.left -
                        expandedRect.left;

                    const translateY =
                        previewRect.top -
                        expandedRect.top;

                    const scaleX =
                        previewRect.width /
                        expandedRect.width;
                    const scaleY =
                        previewRect.height /
                        expandedRect.height;

                    const inverseScaleX =
                        1 /
                        Math.max(
                            scaleX,
                            0.001
                        );

                    const inverseScaleY =
                        1 /
                        Math.max(
                            scaleY,
                            0.001
                        );

                    const inverseRadiusScale =
                        (inverseScaleX + inverseScaleY) /
                        2;

                    shellElement.style.transform = [
                        `translate3d(${-translateX}px, ${-translateY}px, 0)`,
                        `scale(${inverseScaleX}, ${inverseScaleY})`
                    ].join(' ');

                    shellElement.style.borderRadius =
                        `${EXPANDED_RADIUS / Math.max(inverseRadiusScale, 0.001)}px`;

                    await waitForFrames(1);

                    const animation =
                        shellElement.animate(
                            [
                                {
                                    transform: shellElement.style.transform,
                                    borderRadius: shellElement.style.borderRadius
                                },
                                {
                                    transform: 'translate3d(0, 0, 0) scale(1)',
                                    borderRadius: `${OVERVIEW_RADIUS}px`
                                }
                            ],
                            {
                                duration:
                                    SHELL_TRANSITION_DURATION,
                                easing:
                                    SHELL_TRANSITION_EASING,
                                fill: 'both'
                            }
                        );

                    await animation.finished;
                }
            } finally {
                shellRecord?.element?.remove();
                showElement(
                    previewElement
                );
            }
        }

        if (updateRoute) {
            await pushRoute('/');
        }

        clearTransitionState();

        previewElement.focus?.({
            preventScroll: true
        });
    }

    function getSwitchDirection(
        currentCardId,
        targetCardId
    ) {
        const currentIndex =
            getPageIndex(
                currentCardId
            );

        const targetIndex =
            getPageIndex(
                targetCardId
            );

        return targetIndex >=
            currentIndex
            ? 1
            : -1;
    }

    async function switchExpandedPage(
        targetCardId,
        {
            updateRoute = true,
            animate = true
        } = {}
    ) {
        const currentCardId =
            state.activePageId;

        if (
            !currentCardId ||
            !targetCardId ||
            currentCardId ===
            targetCardId ||
            state.interactionLocked
        ) {
            return;
        }

        captureScrollPosition(
            currentCardId
        );

        state.interactionLocked =
            true;

        state.activePageId =
            targetCardId;
        state.overviewPageId =
            targetCardId;

        const targetScroll =
            pageScrollPositions.get(
                targetCardId
            ) ??
            0;

        window.scrollTo({
            top:
                targetScroll,
            left: 0,
            behavior: 'auto'
        });

        await nextTick();

        if (updateRoute) {
            await pushRoute(
                cardPath(
                    targetCardId
                )
            );
        }

        clearTransitionState();
    }

    function navigateToPage(
        pageId,
        options = {}
    ) {
        if (!pageId) {
            return;
        }

        if (
            state.mode ===
            'overview'
        ) {
            openFromOverview(
                pageId,
                options
            );

            return;
        }

        switchExpandedPage(
            pageId,
            options
        );
    }

    function navigateToPath(
        path,
        options = {}
    ) {
        const page =
            navigation.getCardByPath(
                path
            );

        if (!page) {
            pushRoute(
                path
            );

            return;
        }

        navigateToPage(
            page.id,
            {
                updateRoute: true,
                animate: true,
                ...options
            }
        );
    }

    function minimizeCard(
        options = {}
    ) {
        return closeToOverview(
            options
        );
    }

    function handleCardActivate(
        cardId
    ) {
        if (
            Date.now() <
            suppressOverviewClickUntil
        ) {
            return;
        }

        if (
            state.mode !==
            'overview' ||
            state.interactionLocked
        ) {
            return;
        }

        openFromOverview(
            cardId,
            {
                updateRoute: true,
                animate: true
            }
        );
    }

    function resetOverviewGesture() {
        overviewPointerId =
            null;
        overviewStartX =
            0;
        overviewStartY =
            0;
        overviewLastX =
            0;
        overviewLastTime =
            0;
        overviewVelocity =
            0;
        overviewGestureClaimed =
            false;
        overviewDragging.value =
            false;
    }

    function handleOverviewPointerDown(
        event
    ) {
        if (
            state.mode !==
            'overview' ||
            state.interactionLocked ||
            (
                event.button !==
                undefined &&
                event.button !==
                0
            ) ||
            event.target?.closest?.(
                INTERACTIVE_SELECTOR
            )
        ) {
            return;
        }

        overviewPointerId =
            event.pointerId;
        overviewStartX =
            event.clientX;
        overviewStartY =
            event.clientY;
        overviewLastX =
            event.clientX;
        overviewLastTime =
            event.timeStamp;
        overviewVelocity =
            0;
        overviewGestureClaimed =
            false;
    }

    function handleOverviewPointerMove(
        event
    ) {
        if (
            overviewPointerId ===
            null ||
            event.pointerId !==
            overviewPointerId
        ) {
            return;
        }

        const deltaX =
            event.clientX -
            overviewStartX;

        const deltaY =
            event.clientY -
            overviewStartY;

        if (!overviewGestureClaimed) {
            const passedThreshold =
                Math.abs(deltaX) >
                8 ||
                Math.abs(deltaY) >
                8;

            if (!passedThreshold) {
                return;
            }

            const horizontalIntent =
                Math.abs(deltaX) >
                Math.abs(deltaY) *
                1.2;

            if (!horizontalIntent) {
                resetOverviewGesture();

                return;
            }

            overviewGestureClaimed =
                true;
            overviewDragging.value =
                true;

            try {
                event.currentTarget
                    ?.setPointerCapture?.(
                        overviewPointerId
                    );
            } catch {
                // Pointer capture is optional.
            }
        }

        event.preventDefault();

        const elapsed =
            Math.max(
                1,
                event.timeStamp -
                overviewLastTime
            );

        overviewVelocity =
            (
                event.clientX -
                overviewLastX
            ) /
            elapsed;

        overviewLastX =
            event.clientX;
        overviewLastTime =
            event.timeStamp;

        overviewDragX.value =
            clamp(
                deltaX,
                -120,
                120
            );
    }

    function finishOverviewGesture(
        event
    ) {
        if (
            overviewPointerId ===
            null ||
            event.pointerId !==
            overviewPointerId
        ) {
            return;
        }

        if (
            overviewGestureClaimed
        ) {
            try {
                event.currentTarget
                    ?.releasePointerCapture?.(
                        overviewPointerId
                    );
            } catch {
                // Pointer capture may already be released.
            }
        }

        const distance =
            overviewDragX.value;

        const shouldChange =
            Math.abs(distance) >=
            54 ||
            Math.abs(
                overviewVelocity
            ) >=
            0.38;

        if (
            overviewGestureClaimed &&
            shouldChange
        ) {
            const activeIndex =
                getPageIndex(
                    state.overviewPageId
                );

            const direction =
                distance < 0
                    ? 1
                    : -1;

            const nextIndex =
                (
                    activeIndex +
                    direction +
                    cardOrder.value.length
                ) %
                cardOrder.value.length;

            state.overviewPageId =
                cardOrder.value[
                nextIndex
                ];

            suppressOverviewClickUntil =
                Date.now() +
                360;
        }

        overviewDragX.value =
            0;

        resetOverviewGesture();
    }

    function handleOverviewPointerUp(
        event
    ) {
        finishOverviewGesture(
            event
        );
    }

    function handleOverviewPointerCancel(
        event
    ) {
        if (
            overviewPointerId !==
            null &&
            event.pointerId !==
            overviewPointerId
        ) {
            return;
        }

        overviewDragX.value =
            0;

        resetOverviewGesture();
    }

    function syncFromRoute(path) {
        if (suppressRouteSync) {
            return;
        }

        const page =
            navigation.getCardByPath(
                path
            );

        if (!page) {
            if (
                path === '/' &&
                state.mode ===
                'expanded'
            ) {
                closeToOverview({
                    updateRoute: false,
                    animate: true
                });
            }

            return;
        }

        if (
            state.mode ===
            'overview'
        ) {
            openFromOverview(
                page.id,
                {
                    updateRoute: false,
                    animate: false
                }
            );

            return;
        }

        if (
            state.activePageId !==
            page.id
        ) {
            switchExpandedPage(
                page.id,
                {
                    updateRoute: false,
                    animate: true
                }
            );
        }
    }

    const initialRoutePage =
        navigation.getCardByPath(
            route.path
        );

    if (initialRoutePage) {
        state.mode =
            'expanded';
        state.activePageId =
            initialRoutePage.id;
        state.overviewPageId =
            initialRoutePage.id;
    }

    const stopRouteWatch =
        watch(
            () => route.path,
            syncFromRoute,
            {
                immediate: false
            }
        );

    function handleReducedMotionChange(
        event
    ) {
        reducedMotion.value =
            event.matches;
    }

    function handleResize() {
        viewportWidth.value =
            window.innerWidth ||
            1280;

        viewportHeight.value =
            window.innerHeight ||
            800;
    }

    reducedMotionQuery
        .addEventListener(
            'change',
            handleReducedMotionChange
        );

    window.addEventListener(
        'resize',
        handleResize,
        {
            passive: true
        }
    );

    onBeforeUnmount(() => {
        stopRouteWatch();

        reducedMotionQuery
            .removeEventListener(
                'change',
                handleReducedMotionChange
            );

        window.removeEventListener(
            'resize',
            handleResize
        );
    });

    return {
        state,
        mode,
        isOverview,
        activePage,
        cardOrder,
        reducedMotion,
        overviewDragging,
        stageMinHeight,
        getOverviewVisual,
        registerStageElement,
        registerOverviewCardElement,
        registerExpandedCardElement,
        handleCardActivate,
        handleOverviewPointerDown,
        handleOverviewPointerMove,
        handleOverviewPointerUp,
        handleOverviewPointerCancel,
        navigateToPage,
        navigateToPath,
        minimizeCard,
        restoreScrollPosition,
        expandedRadius:
            EXPANDED_RADIUS
    };
}

export function useCardStack(params) {
    return createCardStack(
        params
    );
}
