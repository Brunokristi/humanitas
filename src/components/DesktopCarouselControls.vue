<script setup>
import {
    computed
} from 'vue';

const props = defineProps({
    count: {
        type: Number,
        required: true
    },

    currentIndex: {
        type: Number,
        required: true
    },

    previousLabel: {
        type: String,
        default: 'Predchádzajúca karta'
    },

    nextLabel: {
        type: String,
        default: 'Nasledujúca karta'
    },

    tablistLabel: {
        type: String,
        default: 'Výber karty'
    },

    cardAriaPrefix: {
        type: String,
        default: 'Zobraziť kartu'
    },

    previousDisabled: {
        type: Boolean,
        default: false
    },

    nextDisabled: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits([
    'previous',
    'next',
    'select'
]);

const indexes = computed(() => {
    return Array.from(
        {
            length:
                Math.max(
                    props.count,
                    0
                )
        },

        (_, index) => {
            return index;
        }
    );
});

function indicatorStateClass(
    index
) {
    return index ===
        props.currentIndex
        ? 'w-8 opacity-100'
        : 'w-1.5 opacity-60';
}
</script>

<template>
    <div
        v-if="
            count > 1
        "
        class="
            hidden
            w-full
            items-center
            justify-center

            md:flex
        "
    >
        <div
            class="
                mx-auto
                flex
                items-center
                justify-center
                gap-10
                px-3
            "
        >
            <!-- Previous -->
            <button
                type="button"
                :aria-label="
                    previousLabel
                "
                :disabled="
                    previousDisabled
                "
                class="
                    flex
                    cursor-pointer
                    items-center
                    justify-center
                    border-0
                    bg-transparent
                    p-0
                    text-baige/60
                    outline-none
                    transition-[transform,color,opacity]
                    duration-200
                    ease-out

                    hover:scale-110
                    hover:text-baige

                    active:scale-90

                    disabled:pointer-events-none
                    disabled:opacity-20

                    focus-visible:outline
                    focus-visible:outline-2
                    focus-visible:outline-offset-4
                    focus-visible:outline-baige/70
                "
                @click="
                    emit(
                        'previous'
                    )
                "
            >
                <svg
                    viewBox="0 0 24 24"
                    class="
                        size-5
                    "
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >
                    <path
                        d="
                            M15 5
                            L8 12
                            L15 19
                        "
                    />
                </svg>
            </button>

            <!-- Indicators -->
            <div
                class="
                    flex
                    min-w-20
                    items-center
                    justify-center
                    gap-2
                "
                role="tablist"
                :aria-label="
                    tablistLabel
                "
            >
                <button
                    v-for="
                        index in
                        indexes
                    "
                    :key="
                        index
                    "
                    type="button"
                    class="
                        h-[6px]
                        cursor-pointer
                        rounded-full
                        bg-baige
                        transition-[width,transform,opacity]
                        duration-300
                        ease-[cubic-bezier(0.22,1,0.36,1)]

                        hover:scale-110
                        hover:opacity-100

                        focus-visible:outline
                        focus-visible:outline-2
                        focus-visible:outline-offset-4
                        focus-visible:outline-baige/70
                    "
                    :class="
                        indicatorStateClass(
                            index
                        )
                    "
                    :aria-label="
                        `${cardAriaPrefix} ${index + 1}`
                    "
                    :aria-selected="
                        index ===
                        currentIndex
                    "
                    role="tab"
                    @click="
                        emit(
                            'select',
                            index
                        )
                    "
                />
            </div>

            <!-- Next -->
            <button
                type="button"
                :aria-label="
                    nextLabel
                "
                :disabled="
                    nextDisabled
                "
                class="
                    flex
                    cursor-pointer
                    items-center
                    justify-center
                    border-0
                    bg-transparent
                    p-0
                    text-baige/60
                    outline-none
                    transition-[transform,color,opacity]
                    duration-200
                    ease-out

                    hover:scale-110
                    hover:text-baige

                    active:scale-90

                    disabled:pointer-events-none
                    disabled:opacity-20

                    focus-visible:outline
                    focus-visible:outline-2
                    focus-visible:outline-offset-4
                    focus-visible:outline-baige/70
                "
                @click="
                    emit(
                        'next'
                    )
                "
            >
                <svg
                    viewBox="0 0 24 24"
                    class="
                        size-5
                    "
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >
                    <path
                        d="
                            M9 5
                            L16 12
                            L9 19
                        "
                    />
                </svg>
            </button>
        </div>
    </div>
</template>