<script setup>
defineProps({
    expanded: {
        type: Boolean,
        default: false
    }
})
</script>

<template>
    <div class="page-contact space-y-8">
        <section class="space-y-4">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-baige/70">
                Kontakt
            </p>
            <h1 class="text-4xl font-semibold leading-[1.04] text-baige sm:text-[3.15rem]">
                Contact Page
            </h1>
            <p class="max-w-[58ch] text-sm leading-relaxed text-baige/88 sm:text-base">
                This page is now independent. Build your contact experience, forms, and CTA flow here.
            </p>
        </section>

        <section class="rounded-3xl border border-baige/16 bg-green/55 p-5 sm:p-6">
            <h2 class="mb-3 text-xl font-semibold text-baige">
                Contact Blocks
            </h2>
            <p class="text-sm leading-relaxed text-baige/86 sm:text-base">
                Add address, channels, links, and interaction modules specific to Contact.
            </p>
        </section>

        <section class="rounded-3xl border border-baige/16 bg-green/70 p-5 sm:p-6">
            <h2 class="mb-3 text-xl font-semibold text-baige">
                Form Area
            </h2>
            <p class="text-sm leading-relaxed text-baige/86 sm:text-base">
                Place your custom form and confirmation UX here.
            </p>
        </section>
    </div>
</template>
