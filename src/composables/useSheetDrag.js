import { ref } from 'vue'

export function useSheetDrag(options = {}) {
    const {
        onStart,
        onMove,
        onEnd,
        onCancel
    } = options

    const dragging = ref(false)

    let pointerId = null
    let startY = 0
    let startTime = 0
    let lastY = 0
    let lastTime = 0
    let currentDistance = 0
    let currentVelocity = 0

    function reset() {
        pointerId = null
        startY = 0
        startTime = 0
        lastY = 0
        lastTime = 0
        currentDistance = 0
        currentVelocity = 0
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
        startY = event.clientY
        startTime = event.timeStamp
        lastY = event.clientY
        lastTime = event.timeStamp
        currentDistance = 0
        currentVelocity = 0
        dragging.value = true

        try {
            event.currentTarget?.setPointerCapture?.(
                pointerId
            )
        } catch {
            // Drag môže fungovať aj bez pointer capture.
        }
    }

    function handlePointerMove(event) {
        if (
            !dragging.value ||
            event.pointerId !== pointerId
        ) {
            return
        }

        const rawDistance = event.clientY - startY
        const distance = Math.max(0, rawDistance)

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

        try {
            event.currentTarget?.releasePointerCapture?.(
                pointerId
            )
        } catch {
            // Pointer capture nemusel byť vytvorený.
        }

        const totalTime = Math.max(
            1,
            event.timeStamp - startTime
        )

        const averageVelocity =
            currentDistance /
            totalTime

        /*
         * Použijeme vyššiu z okamžitej a priemernej
         * rýchlosti. Rýchly flick tak funguje prirodzene.
         */
        const releaseVelocity = Math.max(
            currentVelocity,
            averageVelocity
        )

        const finalDistance = currentDistance

        reset()

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

        try {
            event.currentTarget?.releasePointerCapture?.(
                pointerId
            )
        } catch {
            // Pointer capture nemusel byť vytvorený.
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