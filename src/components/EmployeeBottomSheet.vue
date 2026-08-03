<script setup>
import { computed } from 'vue';

import BottomSheet from './BottomSheet.vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },

    employee: {
        type: Object,
        default: null
    }
});

const emit = defineEmits([
    'update:modelValue'
]);

const isOpen = computed({
    get() {
        return props.modelValue;
    },

    set(value) {
        emit(
            'update:modelValue',
            value
        );
    }
});

const fullName = computed(() => {
    return [
        props.employee?.titleBefore,
        props.employee?.firstName,
        props.employee?.lastName,
        props.employee?.titleAfter
    ]
        .filter(Boolean)
        .join(' ')
        .trim();
});

const description = computed(() => {
    return (
        props.employee?.description ??
        props.employee?.bio ??
        props.employee?.about ??
        ''
    );
});

const positions = computed(() => {
    const value =
        props.employee?.position ??
        '';

    return String(value)
        .split(/[\n,;]+/)
        .map((entry) => {
            return entry.trim();
        })
        .filter(Boolean);
});

const photoUrl = computed(() => {
    const path =
        props.employee?.photoUrl ??
        props.employee?.photoPath ??
        props.employee?.photo_url ??
        props.employee?.photo_path;

    if (!path) {
        return null;
    }

    if (
        path.startsWith(
            'http://'
        ) ||
        path.startsWith(
            'https://'
        )
    ) {
        return path;
    }

    const apiBaseUrl =
        import.meta.env
            .VITE_CLINVIA_API_URL ??
        'https://clinvia.studiokristian.com';

    const normalizedPath =
        path.startsWith('/')
            ? path
            : `/${path}`;

    return `${apiBaseUrl}${normalizedPath}`;
});
</script>

<template>
    <BottomSheet
        v-model="isOpen"
    >
        <div
            v-if="employee"
            class="
                mx-auto
                w-full
                max-w-5xl
                pb-4
                pt-4
                sm:pb-12
                sm:pt-6
            "
        >
            <div
                class="
                    grid
                    grid-cols-1
                    gap-8
                    md:grid-cols-[20rem_minmax(0,1fr)]
                    md:items-start
                "
            >
                <div
                    class="
                        relative
                        overflow-hidden
                        rounded-[2rem]
                        bg-baige/30
                        aspect-[4/5]
                    "
                >
                    <img
                        v-if="photoUrl"
                        :src="photoUrl"
                        :alt="fullName || 'Zamestnanec'"
                        class="
                            h-full
                            w-full
                            object-cover
                            object-center
                        "
                    >

                    <div
                        v-else
                        class="
                            flex
                            h-full
                            w-full
                            items-center
                            justify-center
                            px-8
                            text-center
                            text-green/50
                        "
                    >
                        <span
                            class="
                                font-heading
                                text-2xl
                                font-bold
                                leading-tight
                            "
                        >
                            {{
                                fullName ||
                                'Humanitas'
                            }}
                        </span>
                    </div>
                </div>

                <div
                    class="
                        min-w-0
                        space-y-5
                    "
                >
                    <h2
                        class="
                            text-xl
                            font-bold
                            text-green
                            sm:text-2xl
                        "
                    >
                        {{
                            fullName ||
                            'Náš tím'
                        }}
                    </h2>

                    <div
                        v-if="positions.length"
                        class="
                            flex
                            flex-wrap
                            gap-2
                        "
                    >
                        <span
                            v-for="position in positions"
                            :key="position"
                            class="
                                rounded-full
                                border
                                border-green/20
                                bg-baige/60
                                px-3
                                py-1
                                text-xs
                                font-semibold
                                uppercase
                                tracking-[0.08em]
                                text-green/80
                            "
                        >
                            {{ position }}
                        </span>
                    </div>

                    <p
                        v-if="description"
                        class="
                            text-regular
                            whitespace-pre-line
                            leading-relaxed
                            text-green/80
                        "
                    >
                        {{ description }}
                    </p>
                </div>
            </div>
        </div>
    </BottomSheet>
</template>
