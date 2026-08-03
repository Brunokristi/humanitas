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

const employeeName = computed(() => {
    return [
        props.employee?.titleBefore ??
            props.employee?.title_before,

        props.employee?.firstName ??
            props.employee?.first_name,

        props.employee?.lastName ??
            props.employee?.last_name,

        props.employee?.titleAfter ??
            props.employee?.title_after
    ]
        .filter(Boolean)
        .join(' ');
});

const employeeInitials = computed(() => {
    const firstName =
        props.employee?.firstName ??
        props.employee?.first_name ??
        '';

    const lastName =
        props.employee?.lastName ??
        props.employee?.last_name ??
        '';

    return [
        String(firstName).charAt(0),
        String(lastName).charAt(0)
    ]
        .filter(Boolean)
        .join('');
});

const employeePhotoUrl = computed(() => {
    return buildPublicAssetUrl(
        props.employee?.photoUrl ??
        props.employee?.photo_url ??
        null
    );
});

const employeePositions = computed(() => {
    const value =
        props.employee?.position ??
        props.employee?.positions ??
        '';

    if (Array.isArray(value)) {
        return value
            .map((position) => {
                if (
                    position &&
                    typeof position === 'object'
                ) {
                    return (
                        position.name ??
                        position.label ??
                        position.title ??
                        ''
                    );
                }

                return String(
                    position ??
                    ''
                );
            })
            .map((position) => {
                return position.trim();
            })
            .filter(Boolean);
    }

    return String(value)
        .split(/[\n,;]+/)
        .map((position) => {
            return position.trim();
        })
        .filter(Boolean);
});

const employeeBio = computed(() => {
    return (
        props.employee?.bio ??
        props.employee?.description ??
        ''
    );
});

function buildPublicAssetUrl(path) {
    if (!path) {
        return null;
    }

    if (
        path.startsWith('http://') ||
        path.startsWith('https://')
    ) {
        return path;
    }

    const apiBaseUrl =
        import.meta.env.VITE_CLINVIA_API_URL ??
        'https://clinvia.studiokristian.com';

    const normalizedPath =
        path.startsWith('/')
            ? path
            : `/${path}`;

    return `${apiBaseUrl}${normalizedPath}`;
}
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
                max-w-6xl
                pb-4
                pt-4

                sm:pb-12
                sm:pt-6

                lg:pb-14
                lg:pt-8
            "
        >
            <div
                class="
                    grid
                    grid-cols-1
                    gap-8

                    md:grid-cols-[minmax(12rem,0.4fr)_minmax(0,1fr)]
                    md:items-start
                    md:gap-12

                    lg:grid-cols-[minmax(15rem,0.42fr)_minmax(0,1fr)]
                    lg:gap-16
                "
            >
                <!-- Employee photo column -->
                <div
                    class="
                        flex
                        min-w-0
                        justify-center

                        md:sticky
                        md:top-0
                        md:block
                    "
                >
                    <img
                        v-if="employeePhotoUrl"
                        :src="employeePhotoUrl"
                        :alt="employeeName"
                        class="
                            aspect-[3/4]
                            w-full
                            max-w-[15rem]
                            rounded-[2rem]
                            object-cover
                            shadow-[var(--shadow-mid)]

                            md:max-w-none
                        "
                    >

                    <div
                        v-else
                        class="
                            flex
                            aspect-[3/4]
                            w-full
                            max-w-[15rem]
                            items-center
                            justify-center
                            rounded-[2rem]
                            bg-green/15

                            md:max-w-none
                        "
                    >
                        <span
                            class="
                                font-heading
                                text-4xl
                                font-bold
                                text-green/30

                                lg:text-5xl
                            "
                        >
                            {{ employeeInitials }}
                        </span>
                    </div>
                </div>

                <!-- Employee information column -->
                <div
                    class="
                        min-w-0
                    "
                >
                    <div
                        class="
                            flex
                            flex-col
                            gap-6
                        "
                    >
                        <!-- Name -->
                        <h2
                            class="
                                text-xl
                                font-bold
                                leading-[1.15]
                                text-green

                                lg:text-2xl
                            "
                        >
                            {{ employeeName }}
                        </h2>

                        <!-- Positions -->
                        <div
                            v-if="employeePositions.length"
                            class="
                                flex
                                flex-col
                                gap-3
                            "
                        >
                            <div
                                v-for="(
                                    position,
                                    index
                                ) in employeePositions"
                                :key="
                                    `position-${index}-${position}`
                                "
                                class="
                                    border-l-2
                                    border-green
                                    pl-3
                                "
                            >
                                <p
                                    class="
                                        text-regular
                                        font-bold
                                        leading-5
                                        text-green
                                    "
                                >
                                    {{ position }}
                                </p>
                            </div>
                        </div>

                        <!-- Bio -->
                        <p
                            v-if="employeeBio"
                            class="
                                text-regular
                                whitespace-pre-line
                                leading-[1.7]
                                text-green/75
                            "
                        >
                            {{ employeeBio }}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </BottomSheet>
</template>