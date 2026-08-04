<script setup>
import {
    computed
} from 'vue';

import {
    RouterLink
} from 'vue-router';

const props = defineProps({
    backgroundImage: {
        type: String,
        default: '/images/humanitas_pozadie.png',
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

    href: {
        type: String,
        default: null,
    },

    target: {
        type: String,
        default: null,
    },

    disabled: {
        type: Boolean,
        default: false,
    },

    imageOpacity: {
        type: Number,
        default: 0.9,
    },

    imageScale: {
        type: Number,
        default: 2.8,
    },

    notification: {
        type: [String, Number],
        default: null,
    },

    notificationColor: {
        type: String,
        default: 'var(--color-baige)',
    },
});

const emit = defineEmits([
    'click',
]);

const isInternalLink = computed(() => {
    if (
        !props.href ||
        props.target
    ) {
        return false;
    }

    return /^\//.test(props.href);
});

const componentTag = computed(() => {
    if (!props.href) {
        return 'button';
    }

    return isInternalLink.value
        ? RouterLink
        : 'a';
});

const handleClick = (event) => {
    if (props.disabled) {
        event.preventDefault();
        return;
    }

    emit('click', event);
};
</script>

<template>
    <span class="relative inline-flex w-fit">
        <component
            :is="componentTag"
            :to="isInternalLink ? href : undefined"
            :href="!isInternalLink ? href || undefined : undefined"
            :target="!isInternalLink && href ? target || undefined : undefined"
            :rel="
                !isInternalLink && href && target === '_blank'
                    ? 'noopener noreferrer'
                    : undefined
            "
            :type="href ? undefined : type"
            :disabled="href ? undefined : disabled"
            :aria-disabled="
                href && disabled
                    ? 'true'
                    : undefined
            "
            :style="{
                backgroundColor: backgroundColor,
                color: textColor,
            }"
            class="
                group
                relative
                inline-flex
                w-fit
                cursor-pointer
                items-center
                justify-center
                overflow-hidden
                rounded-full
                px-5
                py-2
                transition-all
                duration-300
                hover:-translate-y-0.5
                active:translate-y-0
                active:scale-[0.98]
                disabled:pointer-events-none
                disabled:opacity-50
                aria-disabled:pointer-events-none
                aria-disabled:opacity-50
            "
            @click="handleClick"
        >
            <img
                v-if="backgroundImage"
                :src="backgroundImage"
                alt=""
                aria-hidden="true"
                class="
                    pointer-events-none
                    absolute
                    inset-0
                    h-full
                    w-full
                    object-cover
                    object-center
                "
                :style="{
                    opacity: imageOpacity,
                    transform: `scale(${imageScale})`,
                }"
            >

            <span
                class="
                    text-regular
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
        </component>

        <span
            v-if="
                notification !== null &&
                notification !== undefined &&
                notification !== ''
            "
            :style="{
                backgroundColor: notificationColor,
            }"
            class="
                pointer-events-none
                absolute
                -right-1.5
                -top-1.5
                z-20
                flex
                min-h-5
                min-w-5
                items-center
                justify-center
                rounded-full
                px-1.5
                text-[10px]
                font-bold
                leading-none
                text-green
                shadow-sm
            "
        >
            {{ notification }}
        </span>
    </span>
</template>