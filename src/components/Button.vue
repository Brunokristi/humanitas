<script setup>
import { computed } from 'vue';

const props = defineProps({
    backgroundImage: {
        type: String,
        default: "/images/humanitas_pozadie.png",
    },
    backgroundColor: {
        type: String,
        default: '#8b5cf6',
    },
    textColor: {
        type: String,
        default: '#ffffff',
    },
    type: {
        type: String,
        default: 'button',
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    imageOverlay: {
        type: Boolean,
        default: true,
    },
});

const emit = defineEmits(['click']);

const hasBackgroundImage = computed(() => {
    return Boolean(props.backgroundImage);
});

const buttonStyle = computed(() => {
    if (hasBackgroundImage.value) {
        return {
            backgroundImage: `url("${props.backgroundImage}")`,
            color: props.textColor,
        };
    }

    return {
        backgroundColor: props.backgroundColor,
        color: props.textColor,
    };
});

const handleClick = (event) => {
    if (props.disabled) {
        return;
    }

    emit('click', event);
};
</script>

<template>
    <button
        :type="type"
        :disabled="disabled"
        :style="buttonStyle"
        class="
            group
            relative
            inline-flex
            w-fit
            items-center
            justify-center
            overflow-hidden
            rounded-full
            bg-cover
            bg-center
            px-4
            py-1
            font-semibold
            shadow-lg
            transition-all
            duration-300
            hover:-translate-y-0.5
            hover:shadow-xl
            active:translate-y-0
            active:scale-[0.98]
            disabled:pointer-events-none
            disabled:opacity-50
        "
        @click="handleClick"
    >
        <span
            v-if="hasBackgroundImage && imageOverlay"
            class="
                absolute
                inset-0
                opacity-0.2
                scale-500
            "
        />

        <span
            class="
                relative
                z-10
                flex
                items-center
                justify-center
                gap-2
                whitespace-nowrap
            "
        >
            <slot />
        </span>
    </button>
</template>