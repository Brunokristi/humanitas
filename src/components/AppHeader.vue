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
        class="pointer-events-none top-0 z-[500] bg-transparent p-5"
        :class="isFixed ? 'fixed inset-x-0' : 'sticky'"
    >
        <div class="flex w-full items-center justify-center">
            <div class="pointer-events-auto flex items-center gap-3">
                <span class="heading uppercase text-green">
                    Humanitas
                </span>
            </div>
        </div>
    </header>
</template>