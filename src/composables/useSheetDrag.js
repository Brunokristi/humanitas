import { ref } from 'vue'

export function useSheetDrag(options = {}) {
    const {
        intentThreshold = 8,
        onStart,
        onMove,
        onEnd,
        onCancel
    } = options

    const dragging = ref(false)

    let pointerId = null
    let startX = 0
    let startY = 0
    let startTime = 0
    let lastY = 0
    let lastTime = 0
    let currentDistance = 0
    let currentVelocity = 0
    let gestureClaimed = false

    function reset() {
        pointerId = null
        startX = 0
        startY = 0
        startTime = 0
        lastY = 0
        lastTime = 0
        currentDistance = 0
        currentVelocity = 0
        gestureClaimed = false
        dragging.value = false
    }

    function handlePointerDown(event) {
        if (
            event.button !== undefined &&
            event.button !== 0
        ) {
            return
        }

        const mayStart = onStart?.(event)

        if (mayStart === false) {
            return
        }

        pointerId = event.pointerId
        startX = event.clientX
        startY = event.clientY
        startTime = event.timeStamp
        lastY = event.clientY
        lastTime = event.timeStamp
        currentDistance = 0
        currentVelocity = 0
        gestureClaimed = false
        dragging.value = true
    }

    function claimGesture(event) {
        if (gestureClaimed) {
            return
        }

        gestureClaimed = true

        try {
            event.currentTarget?.setPointerCapture?.(
                pointerId
            )
        } catch {
            // Safe fallback when capture is unavailable.
        }
    }

    function handlePointerMove(event) {
        if (
            !dragging.value ||
            event.pointerId !== pointerId
        ) {
            return
        }

        const deltaX = event.clientX - startX
        const deltaY = event.clientY - startY

        if (!gestureClaimed) {
            const passedThreshold =
                Math.abs(deltaY) > intentThreshold ||
                Math.abs(deltaX) > intentThreshold

            if (!passedThreshold) {
                return
            }

            const isVerticalIntent =
                Math.abs(deltaY) > Math.abs(deltaX) * 1.25

            if (!isVerticalIntent || deltaY < 0) {
                reset()
                onCancel?.()
                return
            }

            claimGesture(event)
        }

        const distance = Math.max(0, deltaY)

        const deltaTime = Math.max(
            1,
            event.timeStamp - lastTime
        )

        currentVelocity =
            (event.clientY - lastY) /
            deltaTime

        lastY = event.clientY
        lastTime = event.timeStamp
        currentDistance = distance

        if (distance > 2) {
            event.preventDefault()
        }

        onMove?.({
            distance,
            velocity: currentVelocity
        })
    }

    function finish(event) {
        if (
            !dragging.value ||
            event.pointerId !== pointerId
        ) {
            return
        }

        if (gestureClaimed) {
            try {
                event.currentTarget?.releasePointerCapture?.(
                    pointerId
                )
            } catch {
                // Ignore release failures.
            }
        }

        const totalTime = Math.max(
            1,
            event.timeStamp - startTime
        )

        const averageVelocity =
            currentDistance /
            totalTime

        const releaseVelocity = Math.max(
            currentVelocity,
            averageVelocity
        )

        const finalDistance = currentDistance
        const wasClaimed = gestureClaimed

        reset()

        if (!wasClaimed) {
            onCancel?.()
            return
        }

        onEnd?.({
            distance: finalDistance,
            velocity: releaseVelocity
        })
    }

    function handlePointerUp(event) {
        finish(event)
    }

    function handlePointerCancel(event) {
        if (
            !dragging.value ||
            event.pointerId !== pointerId
        ) {
            return
        }

        if (gestureClaimed) {
            try {
                event.currentTarget?.releasePointerCapture?.(
                    pointerId
                )
            } catch {
                // Ignore release failures.
            }
        }

        reset()
        onCancel?.()
    }

    return {
        dragging,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerCancel
    }
}
