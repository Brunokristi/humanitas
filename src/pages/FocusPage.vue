<script setup>
defineProps({
    expanded: {
        type: Boolean,
        default: false
    }
})
</script>

<template>
    <div class="page-focus space-y-8">
        <section class="space-y-4">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-baige/70">
                Naše zameranie
            </p>
            <h1 class="text-4xl font-semibold leading-[1.04] text-baige sm:text-[3.15rem]">
                Focus Page
            </h1>
            <p class="max-w-[58ch] text-sm leading-relaxed text-baige/88 sm:text-base">
                This page is now independent. Customize structure and style only for your focus content.
            </p>
        </section>

        <section class="rounded-3xl border border-baige/16 bg-green/55 p-5 sm:p-6">
            <h2 class="mb-3 text-xl font-semibold text-baige">
                Direction
            </h2>
            <p class="text-sm leading-relaxed text-baige/86 sm:text-base">
                Add your strategic sections here.
            </p>
        </section>

        <section class="rounded-3xl border border-baige/16 bg-green/70 p-5 sm:p-6">
            <h2 class="mb-3 text-xl font-semibold text-baige">
                Detail Blocks
            </h2>
            <p class="text-sm leading-relaxed text-baige/86 sm:text-base">
                Create custom grids, lists, and visual components for this page only.
            </p>
        </section>
    </div>
</template>
