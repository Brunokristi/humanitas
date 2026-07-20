<script setup>
defineProps({
    showMenu: {
        type: Boolean,
        default: true
    }
})

const emit = defineEmits([
    'menu-click'
])
</script>

<template>
    <header class="pointer-events-none fixed inset-x-0 top-0 z-[100]">
        <div class="mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 pb-4 pt-5 sm:px-8 sm:pt-7">
            <div class="pointer-events-auto flex items-center gap-3">
                <div
                    class="h-10 w-10 rounded-full border border-green/35 bg-baige"
                    aria-hidden="true"
                />
                <span class="text-xs font-semibold uppercase tracking-[0.16em] text-green/80">Humanitas</span>
            </div>
            <button
                v-if="showMenu"
                type="button"
                class="pointer-events-auto rounded-full border border-green/35 bg-baige/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-green transition-colors hover:bg-baige/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green/70 focus-visible:ring-offset-2 focus-visible:ring-offset-baige"
                aria-label="Open menu"
                @click="emit('menu-click')"
            >
                Menu
            </button>
        </div>
    </header>
</template>
