<script setup>
defineProps({
    showMenu: {
        type: Boolean,
        default: true
    },
    isFixed: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits([
    'menu-click'
])
</script>

<template>
    <header
        class="pointer-events-none top-0 bg-transparent p-5"
        :class="isFixed ? 'fixed inset-x-0' : 'sticky'"
    >
        <div class="flex w-full items-center justify-center">
            <div class="pointer-events-auto flex items-center gap-3">
                 <img
                    src="/images/humanitas_logo.png"
                    alt="Humanitas"
                    class="h-7 w-auto max-w-10 object-contain"
                >

                <span class="heading uppercase text-green">
                    Humanitas
                </span>
            </div>
        </div>
    </header>
</template>