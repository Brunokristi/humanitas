<script setup>
import {
    computed,
    ref
} from 'vue';

import {
    useRouter
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

    activeBackgroundColor: {
        type: String,
        default: null,
    },

    activeTextColor: {
        type: String,
        default: null,
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

const router =
    useRouter();

const isPressed =
    ref(false);

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

    return 'a';
});

const resolvedActiveBackgroundColor = computed(() => {
    return (
        props.activeBackgroundColor ??
        props.textColor
    );
});

const resolvedActiveTextColor = computed(() => {
    return (
        props.activeTextColor ??
        props.backgroundColor
    );
});

const displayedBackgroundColor = computed(() => {
    return isPressed.value
        ? resolvedActiveBackgroundColor.value
        : props.backgroundColor;
});

const displayedTextColor = computed(() => {
    return isPressed.value
        ? resolvedActiveTextColor.value
        : props.textColor;
});

function shouldInterceptInternalClick(event) {
    if (!isInternalLink.value) {
        return false;
    }

    if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button === 1
    ) {
        return false;
    }

    return true;
}

function startPress() {
    if (props.disabled) {
        return;
    }

    isPressed.value =
        true;
}

function endPress() {
    isPressed.value =
        false;
}

function handleClick(event) {
    if (props.disabled) {
        event.preventDefault();

        return;
    }

    if (
        shouldInterceptInternalClick(
            event
        )
    ) {
        event.preventDefault();

        router.push(
            props.href
        );
    }

    emit(
        'click',
        event
    );
}
</script>

<template>
    <span
        class="
            relative
            inline-flex
            w-fit
        "
    >
        <component
            :is="componentTag"
            :href="
                href ||
                undefined
            "
            :target="
                href &&
                !isInternalLink
                    ? target || undefined
                    : undefined
            "
            :rel="
                href &&
                !isInternalLink &&
                target === '_blank'
                    ? 'noopener noreferrer'
                    : undefined
            "
            :type="
                href
                    ? undefined
                    : type
            "
            :disabled="
                href
                    ? undefined
                    : disabled
            "
            :aria-disabled="
                href &&
                disabled
                    ? 'true'
                    : undefined
            "
            :style="{
                backgroundColor:
                    displayedBackgroundColor,

                color:
                    displayedTextColor,
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
                border-0
                outline-none
                px-5
                py-2
                transition-[background-color,color,transform,opacity]
                duration-200
                ease-out

                hover:-translate-y-0.5

                focus:outline-none
                focus:ring-0

                focus-visible:outline-none
                focus-visible:ring-0

                active:translate-y-0
                active:scale-[0.98]

                disabled:pointer-events-none
                disabled:opacity-50

                aria-disabled:pointer-events-none
                aria-disabled:opacity-50
            "
            @pointerdown="startPress"
            @pointerup="endPress"
            @pointercancel="endPress"
            @pointerleave="endPress"
            @blur="endPress"
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
                    transform:
                        `scale(${imageScale})`,
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
                backgroundColor:
                    notificationColor,
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