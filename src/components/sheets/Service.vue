<script setup>
import { computed } from 'vue';

import BottomSheet from '../BottomSheet.vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },

    service: {
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

const description = computed(() => {
    return (
        props.service?.description ??
        props.service?.fullDescription ??
        props.service?.full_description ??
        props.service?.longDescription ??
        props.service?.long_description ??
        props.service?.shortDescription ??
        props.service?.short_description ??
        ''
    );
});

const durationLabel = computed(() => {
    const minutes =
        props.service?.durationMinutes ??
        props.service?.duration_minutes;

    const sessions =
        props.service?.durationSessions ??
        props.service?.duration_sessions;

    if (!minutes) {
        return null;
    }

    if (
        sessions &&
        sessions > 1
    ) {
        return `${sessions} × ${minutes} min`;
    }

    return `${minutes} min`;
});

const selfPayPrice = computed(() => {
    return (
        props.service?.selfPayAmount ??
        props.service?.self_pay_amount ??
        null
    );
});

/*
 * Optional note displayed next to the price.
 *
 * Supported API field names:
 * selfPayNote
 * self_pay_note
 * selfPayPriceNote
 * self_pay_price_note
 * priceNote
 * price_note
 */

const selfPayPriceNote = computed(() => {
    const note =
        props.service?.selfPayNote ??
        props.service?.self_pay_note ??
        props.service?.selfPayPriceNote ??
        props.service?.self_pay_price_note ??
        props.service?.priceNote ??
        props.service?.price_note ??
        null;

    if (
        typeof note !==
        'string'
    ) {
        return null;
    }

    const normalizedNote =
        note.trim();

    return normalizedNote ||
        null;
});

const informationItems = computed(() => {
    if (
        !Array.isArray(
            props.service?.information
        )
    ) {
        return [];
    }

    return [
        ...props.service.information
    ].sort((left, right) => {
        return (
            (left.sortOrder ?? 0) -
            (right.sortOrder ?? 0)
        );
    });
});

const steps = computed(() => {
    if (
        !Array.isArray(
            props.service?.steps
        )
    ) {
        return [];
    }

    return [
        ...props.service.steps
    ].sort((left, right) => {
        const leftOrder =
            left.number ??
            left.sortOrder ??
            0;

        const rightOrder =
            right.number ??
            right.sortOrder ??
            0;

        return (
            leftOrder -
            rightOrder
        );
    });
});

const files = computed(() => {
    if (
        !Array.isArray(
            props.service?.files
        )
    ) {
        return [];
    }

    return [
        ...props.service.files
    ].sort((left, right) => {
        return (
            (left.sortOrder ?? 0) -
            (right.sortOrder ?? 0)
        );
    });
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

    const publicBaseUrl =
        String(apiBaseUrl)
            .replace(/\/+$/, '')
            .replace(/\/api$/i, '');

    const normalizedPath =
        path.startsWith('/')
            ? path
            : `/${path}`;

    return `${publicBaseUrl}${normalizedPath}`;
}

function normalizeServiceFilePath(path) {
    const normalizedPath =
        path.startsWith('/')
            ? path
            : `/${path}`;

    if (
        normalizedPath.startsWith(
            '/storage/'
        )
    ) {
        return normalizedPath;
    }

    if (
        normalizedPath.startsWith(
            '/service-files/'
        )
    ) {
        return `/storage${normalizedPath}`;
    }

    return normalizedPath;
}

function fileUrl(file) {
    const candidate =
        file?.url ??
        file?.downloadUrl ??
        file?.download_url ??
        file?.path ??
        null;

    if (!candidate) {
        return null;
    }

    if (
        candidate.startsWith('http://') ||
        candidate.startsWith('https://')
    ) {
        try {
            const parsedUrl =
                new URL(candidate);

            parsedUrl.pathname =
                normalizeServiceFilePath(
                    parsedUrl.pathname
                );

            return parsedUrl.toString();
        } catch {
            return candidate;
        }
    }

    return buildPublicAssetUrl(
        normalizeServiceFilePath(
            candidate
        )
    );
}

function fileProps(file) {
    const url =
        fileUrl(file);

    if (!url) {
        return {};
    }

    return {
        href: url,
        target: '_blank',
        rel: 'noopener noreferrer'
    };
}

function formatBytes(value) {
    const bytes =
        Number(value);

    if (
        !Number.isFinite(bytes) ||
        bytes <= 0
    ) {
        return null;
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const kilobytes =
        bytes / 1024;

    if (kilobytes < 1024) {
        return `${kilobytes.toFixed(1)} KB`;
    }

    return `${(
        kilobytes /
        1024
    ).toFixed(1)} MB`;
}
</script>

<template>
    <BottomSheet
        v-model="isOpen"
    >
        <div
            v-if="service"
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
                    gap-10

                    md:grid-cols-2
                    md:items-start
                    md:gap-12
                "
            >
                <!-- Left column -->
                <div
                    class="
                        min-w-0

                        lg:sticky
                        lg:top-0
                    "
                >
                    <!-- Heading + description -->
                    <div
                        class="
                            flex
                            flex-col
                            gap-6
                        "
                    >
                        <h2
                            class="
                                text-xl
                                font-bold
                                leading-[1]
                                text-green
                            "
                        >
                            {{ service.name }}
                        </h2>

                        <p
                            v-if="description"
                            class="
                                text-regular
                                whitespace-pre-line
                                leading-[1.65]
                                text-green/70
                            "
                        >
                            {{ description }}
                        </p>
                    </div>

                    <!-- Duration + price -->
                    <div
                        v-if="
                            durationLabel ||
                            selfPayPrice !== null
                        "
                        class="
                            mt-8
                            flex
                            flex-col
                            gap-3
                        "
                    >
                        <!-- Duration -->
                        <div
                            v-if="durationLabel"
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
                                {{ durationLabel }}
                            </p>
                        </div>

                        <!-- Price -->
                        <div
                            v-if="
                                selfPayPrice !== null
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
                                    flex
                                    flex-wrap
                                    items-baseline
                                    gap-x-2
                                    gap-y-1
                                    leading-5
                                "
                            >
                                <span
                                    class="
                                        font-bold
                                        text-green
                                    "
                                >
                                    {{ selfPayPrice }} €
                                </span>

                                <span
                                    v-if="
                                        selfPayPriceNote
                                    "
                                    class="
                                        text-sm
                                        font-normal
                                        text-green/60
                                    "
                                >
                                    {{ selfPayPriceNote }}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Right column -->
                <div
                    class="
                        min-w-0
                        space-y-10
                    "
                >
                    <!-- Important information -->
                    <section
                        v-if="
                            informationItems.length
                        "
                        class="
                            pt-8

                            lg:pt-0
                        "
                    >
                        <h3
                            class="
                                text-regular
                                font-bold
                                text-green
                            "
                        >
                            Dôležité informácie
                        </h3>

                        <ul
                            class="
                                mt-5
                                space-y-4
                            "
                        >
                            <li
                                v-for="
                                    item in
                                    informationItems
                                "
                                :key="
                                    `info-${item.id}`
                                "
                                class="
                                    border-l-2
                                    border-green/15
                                    pl-3
                                "
                            >
                                <p
                                    class="
                                        text-regular
                                        whitespace-pre-line
                                        leading-[1.6]
                                        text-green/80
                                    "
                                >
                                    {{ item.text }}
                                </p>
                            </li>
                        </ul>
                    </section>

                    <!-- Steps -->
                    <section
                        v-if="steps.length"
                        class="
                            pt-8
                        "
                    >
                        <h3
                            class="
                                text-regular
                                font-bold
                                text-green
                            "
                        >
                            Postup
                        </h3>

                        <div
                            class="
                                mt-5
                                space-y-4
                            "
                        >
                            <div
                                v-for="
                                    step in steps
                                "
                                :key="
                                    `step-${step.id}`
                                "
                                class="
                                    border-l-2
                                    border-green/15
                                    pl-3
                                "
                            >
                                <p
                                    v-if="
                                        step.title
                                    "
                                    class="
                                        text-regular
                                        font-bold
                                        leading-[1.6]
                                        text-green
                                    "
                                >
                                    {{ step.title }}
                                </p>

                                <p
                                    v-if="
                                        step.text
                                    "
                                    class="
                                        text-regular
                                        whitespace-pre-line
                                        leading-[1.65]
                                        text-green/80
                                    "
                                    :class="{
                                        'mt-1':
                                            step.title
                                    }"
                                >
                                    {{ step.text }}
                                </p>
                            </div>
                        </div>
                    </section>

                    <!-- Files -->
                    <section
                        v-if="files.length"
                        class="
                            pt-8
                        "
                    >
                        <h3
                            class="
                                text-regular
                                font-bold
                                text-green
                            "
                        >
                            Súbory
                        </h3>

                        <div
                            class="
                                mt-5
                                grid
                                gap-3

                                xl:grid-cols-2
                            "
                        >
                            <component
                                v-for="
                                    file in files
                                "
                                :key="
                                    `file-${file.id}`
                                "
                                :is="
                                    fileUrl(file)
                                        ? 'a'
                                        : 'div'
                                "
                                v-bind="
                                    fileProps(file)
                                "
                                class="
                                    group
                                    flex
                                    min-w-0
                                    items-center
                                    gap-4
                                    rounded-2xl
                                    bg-green/15
                                    p-4
                                    text-green
                                    transition-all
                                    duration-200

                                    hover:-translate-y-0.5
                                    hover:bg-green/20

                                    active:translate-y-0
                                "
                            >
                                <!-- Icon -->
                                <div
                                    class="
                                        flex
                                        size-10
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-full
                                        bg-green
                                        text-baige
                                    "
                                >
                                    <i
                                        class="
                                            bi
                                            bi-file-earmark-arrow-down
                                            text-base
                                        "
                                        aria-hidden="true"
                                    />
                                </div>

                                <!-- Info -->
                                <div
                                    class="
                                        min-w-0
                                        flex-1
                                    "
                                >
                                    <p
                                        class="
                                            text-regular
                                            truncate
                                            font-bold
                                            text-green
                                        "
                                    >
                                        {{
                                            file.label ||
                                            file.originalName ||
                                            'Súbor'
                                        }}
                                    </p>

                                    <p
                                        v-if="
                                            formatBytes(
                                                file.size
                                            )
                                        "
                                        class="
                                            text-regular
                                            mt-1
                                            text-sm
                                            text-green/60
                                        "
                                    >
                                        {{
                                            formatBytes(
                                                file.size
                                            )
                                        }}
                                    </p>
                                </div>
                            </component>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    </BottomSheet>
</template>