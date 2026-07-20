import { ref } from 'vue'

export function useCardDrag(options = {}) {
    const {
        threshold = 110,
        velocityThreshold = 0.5,
        lockAxis = 'x',
        onStart,
        onMove,
        onSwipe,
        onCancel,
        onTap
    } = options

    const dragging = ref(false)
    const moved = ref(false)
    const clickSuppressed = ref(false)

    let pointerId = null
    let startX = 0
    let startY = 0
    let currentX = 0
    let currentY = 0
    let lastTimestamp = 0
    let velocity = 0
    let previousDistance = 0

    function handlePointerDown(event) {
        if (event.button !== undefined && event.button !== 0) {
            return
        }

        pointerId = event.pointerId
        startX = event.clientX
        startY = event.clientY
        currentX = startX
        currentY = startY
        lastTimestamp = event.timeStamp
        velocity = 0
        previousDistance = 0
        moved.value = false
        dragging.value = true

        try {
            event.currentTarget?.setPointerCapture?.(pointerId)
        } catch {
            // Some browsers/pointer sequences can reject capture; dragging still works.
        }
        onStart?.(event)
    }

    function handlePointerMove(event) {
        if (!dragging.value || pointerId !== event.pointerId) {
            return
        }

        const dx = event.clientX - startX
        const dy = event.clientY - startY
        const distance = lockAxis === 'x' ? dx : dy
        const crossAxis = lockAxis === 'x' ? dy : dx
        const dt = Math.max(1, event.timeStamp - lastTimestamp)

        currentX = event.clientX
        currentY = event.clientY
        velocity = (distance - previousDistance) / dt
        previousDistance = distance
        lastTimestamp = event.timeStamp

        if (Math.abs(distance) > 6 && Math.abs(distance) > Math.abs(crossAxis)) {
            moved.value = true
            clickSuppressed.value = true
            event.preventDefault()
        }

        onMove?.({
            dx,
            dy,
            moved: moved.value
        })
    }

    function finish(event) {
        if (!dragging.value || pointerId !== event.pointerId) {
            return
        }

        const dx = currentX - startX
        const dy = currentY - startY
        const primaryDistance = lockAxis === 'x' ? dx : dy

        dragging.value = false
        try {
            event.currentTarget?.releasePointerCapture?.(pointerId)
        } catch {
            // Ignore if pointer capture was never acquired.
        }

        if (!moved.value) {
            onTap?.()
            clearSuppressionSoon()
            return
        }

        const isSwipe = Math.abs(primaryDistance) > threshold || Math.abs(velocity) > velocityThreshold

        if (isSwipe) {
            const direction = primaryDistance < 0 ? -1 : 1
            onSwipe?.({
                dx,
                dy,
                direction,
                velocity
            })
        } else {
            onCancel?.({ dx, dy })
        }

        clearSuppressionSoon()
    }

    function clearSuppressionSoon() {
        window.setTimeout(() => {
            clickSuppressed.value = false
        }, 120)
    }

    function handlePointerUp(event) {
        finish(event)
    }

    function handlePointerCancel(event) {
        if (!dragging.value) {
            return
        }
        try {
            event.currentTarget?.releasePointerCapture?.(pointerId)
        } catch {
            // Ignore if pointer capture was never acquired.
        }
        dragging.value = false
        onCancel?.({ dx: 0, dy: 0 })
        clearSuppressionSoon()
    }

    return {
        dragging,
        moved,
        clickSuppressed,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerCancel
    }
}
