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
            min-w-[15rem]
            overflow-hidden
            rounded-[40px]
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
                px-8
                py-10

                sm:px-10
                sm:py-12

                md:px-12
                md:py-12

                lg:px-10
                lg:py-10

                xl:px-8
                xl:py-8
            "
        >
            <slot
                :item="item"
                :active="active"
            />
        </div>
    </article>
</template>