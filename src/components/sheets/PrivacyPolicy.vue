<script setup>
import {
    computed
} from 'vue';

import BottomSheet from '../BottomSheet.vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },

    title: {
        type: String,
        default: 'Ochrana osobných údajov'
    },

    updatedAt: {
        type: String,
        default: null
    },

    sections: {
        type: Array,
        default: () => []
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

const normalizedSections = computed(() => {
    return props.sections.map(
        (
            section,
            index
        ) => {
            return {
                ...section,

                id:
                    section.id ??
                    `privacy-section-${index + 1}`,

                number:
                    section.number ??
                    index + 1,

                paragraphs:
                    Array.isArray(
                        section.paragraphs
                    )
                        ? section.paragraphs
                        : section.text
                            ? [
                                section.text
                            ]
                            : [],

                items:
                    Array.isArray(
                        section.items
                    )
                        ? section.items
                        : []
            };
        }
    );
});

function scrollToSection(id) {
    const element =
        document.getElementById(
            id
        );

    if (!element) {
        return;
    }

    element.scrollIntoView({
        behavior:
            'smooth',

        block:
            'start'
    });
}
</script>

<template>
    <BottomSheet
        v-model="
            isOpen
        "
    >
        <article
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
                    <!-- Heading -->
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
                            {{ title }}
                        </h2>

                        <p
                            class="
                                text-regular
                                max-w-xl
                                leading-[1.65]
                                text-green/70
                            "
                        >
                            Informácie o spracúvaní,
                            používaní a ochrane vašich
                            osobných údajov.
                        </p>
                    </div>

                    <!-- Updated date -->
                    <div
                        v-if="
                            updatedAt
                        "
                        class="
                            mt-8
                            border-l-2
                            border-green
                            pl-3
                        "
                    >
                        <p
                            class="
                                text-regular
                                leading-[1.6]
                                text-green/70
                            "
                        >
                            Posledná aktualizácia
                        </p>

                        <p
                            class="
                                text-regular
                                mt-1
                                font-bold
                                text-green
                            "
                        >
                            {{ updatedAt }}
                        </p>
                    </div>
                </div>

                <!-- Right column -->
                <div
                    class="
                        min-w-0
                        space-y-10
                    "
                >
                    <section
                        v-for="
                            section in
                            normalizedSections
                        "
                        :id="
                            section.id
                        "
                        :key="
                            section.id
                        "
                        class="
                            scroll-mt-8
                        "
                    >
                        <!-- Section heading -->
                        <div
                            class="
                                flex
                                items-start
                                gap-3
                            "
                        >
                            <h3
                                class="
                                    text-regular
                                    font-bold
                                    leading-[1.35]
                                    text-green
                                "
                            >
                                {{ section.title }}
                            </h3>
                        </div>

                        <!-- Section content -->
                        <div
                            v-if="
                                section.paragraphs.length ||
                                section.items.length
                            "
                            class="
                                mt-5
                                space-y-4
                            "
                        >
                            <!-- Paragraphs -->
                            <div
                                v-for="(
                                    paragraph,
                                    paragraphIndex
                                ) in section.paragraphs"
                                :key="
                                    `${section.id}-paragraph-${paragraphIndex}`
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
                                        leading-[1.7]
                                        text-green/75
                                    "
                                >
                                    {{ paragraph }}
                                </p>
                            </div>

                            <!-- Items -->
                            <ul
                                v-if="
                                    section.items.length
                                "
                                class="
                                    space-y-4
                                "
                            >
                                <li
                                    v-for="(
                                        item,
                                        itemIndex
                                    ) in section.items"
                                    :key="
                                        `${section.id}-item-${itemIndex}`
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
                                            leading-[1.7]
                                            text-green/75
                                        "
                                    >
                                        {{ item }}
                                    </p>
                                </li>
                            </ul>
                        </div>
                    </section>

                    <!-- Empty state -->
                    <section
                        v-if="
                            !normalizedSections.length
                        "
                    >
                        <h3
                            class="
                                text-regular
                                font-bold
                                text-green
                            "
                        >
                            Informácie nie sú k dispozícii
                        </h3>

                        <div
                            class="
                                mt-5
                                border-l-2
                                border-green/15
                                pl-3
                            "
                        >
                            <p
                                class="
                                    text-regular
                                    leading-[1.7]
                                    text-green/70
                                "
                            >
                                Informácie o ochrane osobných
                                údajov momentálne nie sú
                                k dispozícii.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </article>
    </BottomSheet>
</template>