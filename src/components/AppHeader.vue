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
        class="pointer-events-none top-0 z-[500] transparent"
        :class="isFixed ? 'fixed inset-x-0' : 'sticky'"
    >
        <div class="flex w-full items-center justify-between p-5">
            <div class="pointer-events-auto flex items-center gap-3">
                <img
                    src="/images/humanitas_logo.png"
                    alt="Humanitas"
                    class="h-8 w-8 object-contain"
                >

                <span class="heading uppercase text-green">
                    Humanitas
                </span>
            </div>

            <button
                v-if="showMenu"
                type="button"
                class="pointer-events-auto cursor-pointer text-regular text-green"
                aria-label="Open menu"
                @click="emit('menu-click')"
            >
                menu
            </button>
        </div>
    </header>
</template>