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
const OPENING_BOTTOM_RADIUS = 0;
const OVERVIEW_SNAP_DURATION = 320;
const SHELL_TRANSITION_DURATION = 520;
const HANDOFF_TRANSITION_DURATION = 110;
const OVERVIEW_SNAP_EASING =
    'cubic-bezier(0.22, 1, 0.36, 1)';
const SHELL_TRANSITION_EASING =
    'cubic-bezier(0.22, 1, 0.36, 1)';
const HANDOFF_TRANSITION_EASING =
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

        const expandedRect =
            getExpandedViewportRect();

        const isMobile =
            viewportWidth.value <
            768;

        /*
         * Keep the original card geometry. The visible page
         * preview is rendered at the final expanded dimensions
         * and uniformly scaled to cover this independent card
         * rectangle. Any excess is clipped by the card shell.
         */
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

        const widthScale =
            cardWidth /
            Math.max(
                expandedRect.width,
                1
            );

        const heightScale =
            cardHeight /
            Math.max(
                expandedRect.height,
                1
            );

        const surfaceScale =
            Math.max(
                widthScale,
                heightScale
            );

        const renderedSurfaceWidth =
            expandedRect.width *
            surfaceScale;

        const renderedSurfaceHeight =
            expandedRect.height *
            surfaceScale;

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
            surfaceWidth:
                expandedRect.width,
            surfaceHeight:
                expandedRect.height,
            surfaceScale,
            surfaceOffsetX:
                (
                    cardWidth -
                    renderedSurfaceWidth
                ) /
                2,
            surfaceOffsetY:
                (
                    cardHeight -
                    renderedSurfaceHeight
                ) /
                2,
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
            surfaceWidth:
                metrics.surfaceWidth,
            surfaceHeight:
                metrics.surfaceHeight,
            surfaceScale:
                metrics.surfaceScale,
            surfaceOffsetX:
                metrics.surfaceOffsetX,
            surfaceOffsetY:
                metrics.surfaceOffsetY,
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

    function prepareElementForHandoff(
        element
    ) {
        if (!element) {
            return;
        }

        /*
         * The real destination must already be fully opaque
         * underneath the frozen transition shell.
         *
         * Never fade both surfaces at the same time. Two
         * half-transparent layers do not equal one opaque
         * layer; the background stack becomes visible through
         * them, especially in Safari.
         */
        element.style.visibility =
            'visible';
        element.style.opacity =
            '1';
        element.style.backgroundColor =
            '#335940';
        element.style.backfaceVisibility =
            'hidden';
        element.style.webkitBackfaceVisibility =
            'hidden';
    }

    function finishElementHandoff(
        element
    ) {
        if (!element) {
            return;
        }

        element.style.visibility =
            'visible';
        element.style.opacity =
            '1';
        element.style.removeProperty(
            'will-change'
        );
    }

    async function crossfadeTransitionHandoff({
        fromElement,
        toElement,
        roundOpeningBottom = false
    }) {
        if (
            !fromElement ||
            !toElement
        ) {
            finishElementHandoff(
                toElement
            );

            return;
        }

        prepareElementForHandoff(
            toElement
        );

        /*
         * Paint the fully opaque destination below the shell
         * before the shell starts disappearing. Because the
         * destination never changes opacity, there is always
         * one completely opaque green page surface covering
         * the background cards.
         */
        toElement.getBoundingClientRect();
        window.getComputedStyle(
            toElement
        ).opacity;

        await waitForFrames(2);

        const fromStart = {
            opacity: 1
        };

        const fromEnd = {
            opacity: 0
        };

        if (roundOpeningBottom) {
            fromStart.borderBottomLeftRadius =
                `${OPENING_BOTTOM_RADIUS}px`;
            fromStart.borderBottomRightRadius =
                `${OPENING_BOTTOM_RADIUS}px`;
            fromEnd.borderBottomLeftRadius =
                `${EXPANDED_RADIUS}px`;
            fromEnd.borderBottomRightRadius =
                `${EXPANDED_RADIUS}px`;
        }

        const fromAnimation =
            fromElement.animate(
                [
                    fromStart,
                    fromEnd
                ],
                {
                    duration:
                        HANDOFF_TRANSITION_DURATION,
                    easing:
                        HANDOFF_TRANSITION_EASING,
                    fill:
                        'both'
                }
            );

        /*
         * Fade only the temporary shell. The destination below
         * remains at opacity 1 for the entire handoff, so the
         * card underneath can never show through.
         */
        await Promise.allSettled([
            fromAnimation.finished
        ]);

        finishElementHandoff(
            toElement
        );
    }

    function createOpeningPreparationCover(
        previewElement,
        previewRect
    ) {
        if (
            !previewElement ||
            !previewRect
        ) {
            return null;
        }

        const cover =
            previewElement.cloneNode(
                true
            );

        stabilizeTransitionClone(
            cover
        );

        const layoutWidth =
            Math.max(
                previewElement.offsetWidth,
                1
            );

        const layoutHeight =
            Math.max(
                previewElement.offsetHeight,
                1
            );

        const scaleX =
            previewRect.width /
            layoutWidth;

        const scaleY =
            previewRect.height /
            layoutHeight;

        Object.assign(
            cover.style,
            {
                position:
                    'fixed',
                top:
                    `${previewRect.top}px`,
                left:
                    `${previewRect.left}px`,
                width:
                    `${layoutWidth}px`,
                height:
                    `${layoutHeight}px`,
                minHeight:
                    `${layoutHeight}px`,
                margin:
                    '0',
                zIndex:
                    '2147483001',
                pointerEvents:
                    'none',
                overflow:
                    'hidden',
                transformOrigin:
                    'top left',
                transform:
                    `translate3d(0, 0, 0) scale(${scaleX}, ${scaleY})`,
                transition:
                    'none',
                visibility:
                    'visible',
                opacity:
                    '1',
                backgroundColor:
                    '#335940',
                backfaceVisibility:
                    'hidden',
                WebkitBackfaceVisibility:
                    'hidden',
                contain:
                    'layout paint style'
            }
        );

        document.body.appendChild(
            cover
        );

        cover.getBoundingClientRect();

        return cover;
    }

    function waitWithTimeout(
        promise,
        timeout = 180
    ) {
        return Promise.race([
            Promise.resolve(
                promise
            ).catch(
                () => undefined
            ),

            new Promise((resolve) => {
                window.setTimeout(
                    resolve,
                    timeout
                );
            })
        ]);
    }

    async function decodeTransitionImages(
        rootElement
    ) {
        if (!rootElement) {
            return;
        }

        const images = [
            ...rootElement.querySelectorAll(
                'img'
            )
        ];

        await Promise.allSettled(
            images.map((image) => {
                if (
                    image.complete &&
                    image.naturalWidth > 0
                ) {
                    return Promise.resolve();
                }

                if (
                    typeof image.decode ===
                    'function'
                ) {
                    return waitWithTimeout(
                        image.decode(),
                        220
                    );
                }

                return waitWithTimeout(
                    new Promise((resolve) => {
                        image.addEventListener(
                            'load',
                            resolve,
                            {
                                once: true
                            }
                        );

                        image.addEventListener(
                            'error',
                            resolve,
                            {
                                once: true
                            }
                        );
                    }),
                    220
                );
            })
        );
    }

    function transitionLayoutSignature(
        rootElement
    ) {
        const elements = [
            rootElement,
            ...rootElement.querySelectorAll(
                '[data-transition-stable]'
            )
        ];

        return elements
            .map((element) => {
                const rect =
                    element.getBoundingClientRect();

                return [
                    rect.left,
                    rect.top,
                    rect.width,
                    rect.height,
                    element.scrollWidth,
                    element.scrollHeight
                ]
                    .map((value) => {
                        return Math.round(
                            value *
                            10
                        ) /
                            10;
                    })
                    .join(':');
            })
            .join('|');
    }

    async function waitForTransitionContentStable(
        rootElement
    ) {
        if (!rootElement) {
            return;
        }

        if (document.fonts?.ready) {
            await waitWithTimeout(
                document.fonts.ready,
                180
            );
        }

        await decodeTransitionImages(
            rootElement
        );

        let previousSignature =
            null;

        let stableFrameCount =
            0;

        for (
            let frame = 0;
            frame < 8;
            frame += 1
        ) {
            await waitForFrames(
                1
            );

            const signature =
                transitionLayoutSignature(
                    rootElement
                );

            if (
                signature ===
                previousSignature
            ) {
                stableFrameCount +=
                    1;
            } else {
                stableFrameCount =
                    0;
            }

            if (
                stableFrameCount >=
                2
            ) {
                return;
            }

            previousSignature =
                signature;
        }
    }

    function removeDuplicateIds(
        element
    ) {
        element
            .querySelectorAll?.(
                '[id]'
            )
            .forEach((child) => {
                child.removeAttribute(
                    'id'
                );
            });

        element.removeAttribute?.(
            'id'
        );
    }

    function stabilizeTransitionClone(
        element
    ) {
        removeDuplicateIds(
            element
        );

        element.classList.add(
            'page-card--transition-clone'
        );

        element.setAttribute(
            'aria-hidden',
            'true'
        );

        element.removeAttribute(
            'tabindex'
        );

        element.removeAttribute(
            'role'
        );

        /*
         * Embedded documents cannot be cloned as stable
         * compositor content. Hiding them prevents Safari
         * from showing a white reload frame inside the card.
         */
        element
            .querySelectorAll(
                [
                    'iframe',
                    'object',
                    'embed',
                    'video',
                    'canvas'
                ].join(', ')
            )
            .forEach((media) => {
                media.style.visibility =
                    'hidden';
                media.style.opacity =
                    '0';
            });
    }

    function createTransitionShell(
        expandedElement,
        expandedRect
    ) {
        if (
            !expandedElement ||
            !expandedRect
        ) {
            return null;
        }

        const shell =
            expandedElement.cloneNode(
                true
            );

        stabilizeTransitionClone(
            shell
        );

        Object.assign(
            shell.style,
            {
                position:
                    'fixed',
                top:
                    `${expandedRect.top}px`,
                left:
                    `${expandedRect.left}px`,
                width:
                    `${expandedRect.width}px`,
                height:
                    `${expandedRect.height}px`,
                minHeight:
                    `${expandedRect.height}px`,
                margin:
                    '0',
                zIndex:
                    '2147483000',
                pointerEvents:
                    'none',
                overflow:
                    'hidden',
                contain:
                    'paint',
                transformOrigin:
                    'top left',
                transform:
                    'translate3d(0, 0, 0) scale(1, 1)',
                transition:
                    'none',
                visibility:
                    'visible',
                opacity:
                    '1',
                backgroundColor:
                    '#335940',
                backfaceVisibility:
                    'hidden',
                WebkitBackfaceVisibility:
                    'hidden',
                willChange:
                    'transform, border-radius, opacity'
            }
        );

        const contentElement =
            shell.querySelector(
                '.page-card__capture-content'
            );

        let counterElement =
            null;

        if (contentElement) {
            /*
             * The page may already contain its own transform,
             * for example the closing scroll-position offset.
             * Animate a new wrapper around it so that transform
             * is preserved rather than overwritten.
             */
            counterElement =
                document.createElement(
                    'div'
                );

            counterElement.className =
                'page-card__transition-counter';

            Object.assign(
                counterElement.style,
                {
                    position:
                        'absolute',
                    top:
                        '0',
                    left:
                        '0',
                    width:
                        `${expandedRect.width}px`,
                    height:
                        `${expandedRect.height}px`,
                    backgroundColor:
                        '#335940',
                    transformOrigin:
                        'top left',
                    willChange:
                        'transform'
                }
            );

            contentElement.parentNode
                ?.insertBefore(
                    counterElement,
                    contentElement
                );

            counterElement.appendChild(
                contentElement
            );
        }

        document.body.appendChild(
            shell
        );

        /*
         * Force WebKit to allocate and paint the shell and
         * counter-transform layer before animation starts.
         */
        shell.getBoundingClientRect();
        counterElement
            ?.getBoundingClientRect();

        return {
            element:
                shell,
            contentElement:
                counterElement
        };
    }

    function getExpandedAnimationRect(
        expandedElement
    ) {
        return normalizeRect(
            expandedElement
                ?.getBoundingClientRect()
        );
    }

    function getCombinedTransitionGeometry({
        previewRect,
        expandedRect
    }) {
        const scaleX =
            previewRect.width /
            Math.max(
                expandedRect.width,
                1
            );

        const scaleY =
            previewRect.height /
            Math.max(
                expandedRect.height,
                1
            );

        const uniformContentScale =
            Math.max(
                scaleX,
                scaleY
            );

        const contentOffsetX =
            (
                previewRect.width -
                expandedRect.width *
                uniformContentScale
            ) /
            2;

        const contentOffsetY =
            (
                previewRect.height -
                expandedRect.height *
                uniformContentScale
            ) /
            2;

        return {
            translateX:
                previewRect.left -
                expandedRect.left,
            translateY:
                previewRect.top -
                expandedRect.top,
            scaleX,
            scaleY,
            innerTranslateX:
                contentOffsetX /
                Math.max(
                    scaleX,
                    0.001
                ),
            innerTranslateY:
                contentOffsetY /
                Math.max(
                    scaleY,
                    0.001
                ),
            innerScaleX:
                uniformContentScale /
                Math.max(
                    scaleX,
                    0.001
                ),
            innerScaleY:
                uniformContentScale /
                Math.max(
                    scaleY,
                    0.001
                )
        };
    }

    function formatCornerRadius(
        horizontalRadius,
        verticalRadius
    ) {
        /*
         * Individual corner-radius longhands use two
         * whitespace-separated values:
         *
         *     border-bottom-left-radius: 40px 28px;
         *
         * The slash syntax belongs only to the
         * `border-radius` shorthand. WebKit may reject or
         * discretely apply a slash value on a longhand,
         * which caused the bottom corners to snap at the
         * end of the minimizing animation.
         */
        return [
            `${horizontalRadius}px`,
            `${verticalRadius}px`
        ].join(' ');
    }

    function applyTransitionEndpoint(
        shellRecord,
        geometry,
        endpoint
    ) {
        if (!shellRecord?.element) {
            return;
        }

        if (endpoint === 'preview') {
            shellRecord.element.style.transform = [
                `translate3d(${geometry.translateX}px, ${geometry.translateY}px, 0)`,
                `scale(${geometry.scaleX}, ${geometry.scaleY})`
            ].join(' ');

            /*
             * Compensate each axis independently so the
             * combined outer + inner transform is uniform.
             * The card may change shape, but text and images
             * never stretch.
             */
            if (shellRecord.contentElement) {
                shellRecord.contentElement.style.transform = [
                    `translate3d(${geometry.innerTranslateX}px, ${geometry.innerTranslateY}px, 0)`,
                    `scale(${geometry.innerScaleX}, ${geometry.innerScaleY})`
                ].join(' ');
            }

            const previewCornerRadius =
                formatCornerRadius(
                    OVERVIEW_RADIUS /
                    Math.max(
                        geometry.scaleX,
                        0.001
                    ),
                    OVERVIEW_RADIUS /
                    Math.max(
                        geometry.scaleY,
                        0.001
                    )
                );

            shellRecord.element.style.borderTopLeftRadius =
                previewCornerRadius;
            shellRecord.element.style.borderTopRightRadius =
                previewCornerRadius;
            shellRecord.element.style.borderBottomLeftRadius =
                previewCornerRadius;
            shellRecord.element.style.borderBottomRightRadius =
                previewCornerRadius;

            return;
        }

        shellRecord.element.style.transform =
            'translate3d(0, 0, 0) scale(1, 1)';

        const expandedTopRadius =
            formatCornerRadius(
                EXPANDED_RADIUS,
                EXPANDED_RADIUS
            );

        const expandedBottomRadiusValue =
            endpoint ===
                'opening-expanded'
                ? OPENING_BOTTOM_RADIUS
                : EXPANDED_RADIUS;

        const expandedBottomRadius =
            formatCornerRadius(
                expandedBottomRadiusValue,
                expandedBottomRadiusValue
            );

        shellRecord.element.style.borderTopLeftRadius =
            expandedTopRadius;
        shellRecord.element.style.borderTopRightRadius =
            expandedTopRadius;
        shellRecord.element.style.borderBottomLeftRadius =
            expandedBottomRadius;
        shellRecord.element.style.borderBottomRightRadius =
            expandedBottomRadius;

        if (shellRecord.contentElement) {
            shellRecord.contentElement.style.transform =
                'translate3d(0, 0, 0) scale(1, 1)';
        }
    }

    async function animateTransitionShell(
        shellRecord,
        {
            previewRect,
            expandedRect,
            opening
        }
    ) {
        if (
            !shellRecord?.element ||
            !previewRect ||
            !expandedRect
        ) {
            return;
        }

        const geometry =
            getCombinedTransitionGeometry({
                previewRect,
                expandedRect
            });

        const previewRadiusX =
            OVERVIEW_RADIUS /
            Math.max(
                geometry.scaleX,
                0.001
            );

        const previewRadiusY =
            OVERVIEW_RADIUS /
            Math.max(
                geometry.scaleY,
                0.001
            );

        const previewCornerRadius =
            formatCornerRadius(
                previewRadiusX,
                previewRadiusY
            );

        const expandedTopRadius =
            formatCornerRadius(
                EXPANDED_RADIUS,
                EXPANDED_RADIUS
            );

        const expandedBottomRadiusValue =
            opening
                ? OPENING_BOTTOM_RADIUS
                : EXPANDED_RADIUS;

        const expandedBottomRadius =
            formatCornerRadius(
                expandedBottomRadiusValue,
                expandedBottomRadiusValue
            );

        const previewShellKeyframe = {
            transform: [
                `translate3d(${geometry.translateX}px, ${geometry.translateY}px, 0)`,
                `scale(${geometry.scaleX}, ${geometry.scaleY})`
            ].join(' '),
            borderTopLeftRadius:
                previewCornerRadius,
            borderTopRightRadius:
                previewCornerRadius,
            borderBottomLeftRadius:
                previewCornerRadius,
            borderBottomRightRadius:
                previewCornerRadius
        };

        const expandedShellKeyframe = {
            transform:
                'translate3d(0, 0, 0) scale(1, 1)',
            borderTopLeftRadius:
                expandedTopRadius,
            borderTopRightRadius:
                expandedTopRadius,
            borderBottomLeftRadius:
                expandedBottomRadius,
            borderBottomRightRadius:
                expandedBottomRadius
        };

        const previewContentKeyframe = {
            transform: [
                `translate3d(${geometry.innerTranslateX}px, ${geometry.innerTranslateY}px, 0)`,
                `scale(${geometry.innerScaleX}, ${geometry.innerScaleY})`
            ].join(' ')
        };

        const expandedContentKeyframe = {
            transform:
                'translate3d(0, 0, 0) scale(1, 1)'
        };

        applyTransitionEndpoint(
            shellRecord,
            geometry,
            opening
                ? 'preview'
                : 'settled-expanded'
        );

        /*
         * Use one animation for the complete shell geometry.
         *
         * Previously, minimizing used a second animation for
         * the bottom corners. Safari could apply that second
         * longhand animation discretely, so the radius stayed
         * at 0 until the card had nearly reached its endpoint.
         *
         * Opening temporarily reaches square bottom corners.
         * The settled live page is rounded again after the
         * shell handoff. Closing therefore begins with all
         * four corners rounded and keeps them rounded while
         * returning to the overview card.
         */
        const shellAnimation =
            shellRecord.element.animate(
                opening
                    ? [
                        previewShellKeyframe,
                        expandedShellKeyframe
                    ]
                    : [
                        expandedShellKeyframe,
                        previewShellKeyframe
                    ],
                {
                    duration:
                        SHELL_TRANSITION_DURATION,
                    easing:
                        SHELL_TRANSITION_EASING,
                    fill:
                        'both'
                }
            );

        const animations = [
            shellAnimation
        ];

        if (shellRecord.contentElement) {
            animations.push(
                shellRecord.contentElement.animate(
                    opening
                        ? [
                            previewContentKeyframe,
                            expandedContentKeyframe
                        ]
                        : [
                            expandedContentKeyframe,
                            previewContentKeyframe
                        ],
                    {
                        duration:
                            SHELL_TRANSITION_DURATION,
                        easing:
                            SHELL_TRANSITION_EASING,
                        fill:
                            'both'
                    }
                )
            );
        }

        await Promise.allSettled(
            animations.map(
                (animation) => {
                    return animation.finished;
                }
            )
        );

        applyTransitionEndpoint(
            shellRecord,
            geometry,
            opening
                ? 'opening-expanded'
                : 'preview'
        );
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

        if (
            !previewElement ||
            !previewRect
        ) {
            return;
        }

        const needsContentStabilization =
            Boolean(
                previewElement.querySelector(
                    '[data-transition-needs-settle]'
                )
            );

        const preparationCover =
            needsContentStabilization
                ? createOpeningPreparationCover(
                    previewElement,
                    previewRect
                )
                : null;

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

        if (
            needsContentStabilization &&
            expandedElement
        ) {
            hideElement(
                expandedElement
            );

            await waitForTransitionContentStable(
                expandedElement
            );
        }

        const expandedRect =
            getExpandedAnimationRect(
                expandedElement
            );

        if (
            !expandedElement ||
            !expandedRect
        ) {
            preparationCover
                ?.remove();

            clearTransitionState();

            return;
        }

        if (
            !animate ||
            reducedMotion.value
        ) {
            preparationCover
                ?.remove();

            showElement(
                expandedElement
            );

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
                expandedRect
            );

        if (!shellRecord) {
            preparationCover
                ?.remove();

            showElement(
                expandedElement
            );

            clearTransitionState();

            return;
        }

        const geometry =
            getCombinedTransitionGeometry({
                previewRect,
                expandedRect
            });

        applyTransitionEndpoint(
            shellRecord,
            geometry,
            'preview'
        );

        hideElement(
            expandedElement
        );

        /*
         * The preparation cover keeps the exact preview
         * visible while Home/Services finish child layout.
         * Remove it only after the animated shell is already
         * painted at the identical preview endpoint.
         */
        await waitForFrames(
            1
        );

        preparationCover
            ?.remove();

        try {
            await waitForFrames(1);

            await animateTransitionShell(
                shellRecord,
                {
                    previewRect,
                    expandedRect,
                    opening: true
                }
            );

            /*
             * Keep the frozen shell visible while the live
             * page leaves its fixed capture rectangle. The
             * clone and live page are now pixel-aligned.
             */
            const liveExpandedElement =
                expandedCardElement.value;

            prepareElementForHandoff(
                liveExpandedElement
            );

            state.captureMode =
                null;
            state.captureRect =
                null;

            await nextTick();

            await crossfadeTransitionHandoff({
                fromElement:
                    shellRecord.element,
                toElement:
                    expandedCardElement.value,
                roundOpeningBottom:
                    true
            });
        } finally {
            preparationCover
                ?.remove();

            shellRecord.element.remove();
            finishElementHandoff(
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
        await waitForFrames(2);

        const expandedElement =
            expandedCardElement.value;

        const expandedRect =
            getExpandedAnimationRect(
                expandedElement
            );

        if (
            !expandedElement ||
            !expandedRect
        ) {
            clearTransitionState();

            return;
        }

        const shellRecord =
            animate &&
                !reducedMotion.value
                ? createTransitionShell(
                    expandedElement,
                    expandedRect
                )
                : null;

        if (shellRecord) {
            hideElement(
                expandedElement
            );
        }

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

        if (
            !previewElement ||
            !previewRect
        ) {
            shellRecord?.element?.remove();

            if (updateRoute) {
                await pushRoute('/');
            }

            clearTransitionState();

            return;
        }

        if (shellRecord) {
            prepareElementForHandoff(
                previewElement
            );

            try {
                await animateTransitionShell(
                    shellRecord,
                    {
                        previewRect,
                        expandedRect,
                        opening: false
                    }
                );

                await crossfadeTransitionHandoff({
                    fromElement:
                        shellRecord.element,
                    toElement:
                        previewElement
                });
            } finally {
                shellRecord.element.remove();
                finishElementHandoff(
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