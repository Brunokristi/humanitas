<script setup>
defineProps({
    item: {
        type: Object,
        required: true
    },

    active: {
        type: Boolean,
        default: false
    },

    equalHeight: {
        type: Boolean,
        default: false
    },

    backgroundImage: {
        type: String,
        default: '/images/humanitas_pozadie.png'
    },

    backgroundColor: {
        type: String,
        default: '#FBF9F3'
    },

    imageOpacity: {
        type: Number,
        default: 0.2
    },

    imageScale: {
        type: Number,
        default: 2.8
    },

    backgroundPosition: {
    type: String,
    default: 'center'
}
});
</script>

<template>
    <article
        class="
            relative
            flex
            w-full
            max-w-[36rem]
            overflow-hidden
            rounded-[clamp(2.5rem,8vw,4.4rem)]
            text-green
            shadow-[var(--shadow-mid)]
        "
        :class="
            equalHeight
                ? 'h-full'
                : 'min-h-[15rem] max-h-[40rem]'
        "
        :style="{
            backgroundColor: backgroundColor
        }"
    >
        <!-- Background image -->
        <img
            v-if="backgroundImage"
            :src="backgroundImage"
            alt=""
            aria-hidden="true"
            draggable="false"
            class="
                pointer-events-none
                absolute
                inset-0
                h-full
                w-full
                object-cover
            "
            :style="{
                opacity: imageOpacity,
                transform: `scale(${imageScale})`,
                objectPosition: backgroundPosition
            }"
        >

        <!-- Content -->
        <div
            class="
                relative
                z-10
                flex
                h-full
                w-full
                min-w-0
                flex-col
                justify-center
                overflow-hidden
                px-[clamp(2.1rem,8vw,4.2rem)]
                py-[clamp(2.4rem,8vw,4rem)]
            "
        >
            <slot
                :item="item"
                :active="active"
            />
        </div>
    </article>
</template>