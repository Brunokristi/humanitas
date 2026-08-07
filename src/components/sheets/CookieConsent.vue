<script setup>
import {
    computed,
    reactive,
    watch
} from 'vue';

import {
    DEFAULT_COOKIE_PREFERENCES
} from '../../utils/cookieConsent.js';

import {
    useCookieConsent
} from '../../composables/useCookieConsent.js';

import BottomSheet from '../BottomSheet.vue';
import Button from '../Button.vue';

const {
    isSheetOpen,
    hasStoredConsent,
    preferences,
    closeSettings,
    acceptAll,
    rejectOptional,
    savePreferences
} = useCookieConsent();

const draftPreferences = reactive({
    ...DEFAULT_COOKIE_PREFERENCES
});

const isOpen = computed({
    get() {
        return isSheetOpen.value;
    },

    set(value) {
        if (value) {
            return;
        }

        closeSettings();
    }
});

const canDismiss = computed(() => {
    return true;
});

watch(
    isSheetOpen,
    (open) => {
        if (!open) {
            return;
        }

        Object.assign(
            draftPreferences,
            preferences.value
        );
    },
    {
        immediate: true
    }
);

function togglePreference(key) {
    if (
        key === 'necessary'
    ) {
        return;
    }

    draftPreferences[key] =
        !draftPreferences[key];
}

function handleSavePreferences() {
    savePreferences({
        analytics:
            draftPreferences.analytics,

        marketing:
            draftPreferences.marketing
    });
}
</script>

<template>
    <BottomSheet
        v-model="
            isOpen
        "
        :close-on-backdrop="
            canDismiss
        "
        :close-on-escape="
            canDismiss
        "
        :draggable="
            canDismiss
        "
    >
        <div
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
                        <div>
                            <h2
                                class="
                                    mt-2
                                    text-xl
                                    font-bold
                                    leading-[1.1]
                                    text-green
                                "
                            >
                                Nastavenia cookies
                            </h2>
                        </div>

                        <p
                            class="
                                text-regular
                                max-w-xl
                                leading-[1.65]
                                text-green/70
                            "
                        >
                            Nevyhnutné cookies zostávajú vždy
                            zapnuté, aby stránka fungovala správne.
                            Ostatné cookies môžete povoliť alebo
                            odmietnuť podľa svojich preferencií.
                        </p>
                    </div>

                    <!-- Information -->
                    <div
                        class="
                            mt-8
                            flex
                            flex-col
                            gap-3
                        "
                    >
                        <div
                            class="
                                border-l-2
                                border-green/15
                                pl-3
                            "
                        >
                            <p
                                class="
                                    text-regular
                                    leading-5
                                    text-green/70
                                "
                            >
                                Vaše rozhodnutie môžete neskôr zmeniť
                            </p>
                        </div>

                        <div
                            class="
                                border-l-2
                                border-green/15
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
                                Nastavenia nájdete kedykoľvek
                                v spodnej časti stránky.
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
                    <!-- Cookie categories -->
                    <section>
                        <h3
                            class="
                                text-regular
                                font-bold
                                text-green
                            "
                        >
                            Typy cookies
                        </h3>

                        <div
                            class="
                                mt-5
                                space-y-5
                            "
                        >
                            <!-- Necessary -->
                            <div
                                class="
                                    border-l-2
                                    border-green
                                    pl-4
                                "
                            >
                                <div
                                    class="
                                        flex
                                        items-start
                                        justify-between
                                        gap-5
                                    "
                                >
                                    <div
                                        class="
                                            min-w-0
                                            flex-1
                                        "
                                    >
                                        <h4
                                            class="
                                                text-regular
                                                font-bold
                                                text-green
                                            "
                                        >
                                            Nevyhnutné
                                        </h4>

                                        <p
                                            class="
                                                text-regular
                                                mt-2
                                                leading-[1.6]
                                                text-green/70
                                            "
                                        >
                                            Potrebné na základné
                                            fungovanie webu a uloženie
                                            vašich rozhodnutí.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Analytics -->
                            <div
                                class="
                                    w-full
                                    border-l-2
                                    pl-4
                                    text-left
                                    transition-colors
                                    duration-200
                                "
                                :class="
                                    draftPreferences.analytics
                                        ? 'border-green'
                                        : 'border-green/15'
                                "
                            >
                                <div
                                    class="
                                        flex
                                        items-start
                                        justify-between
                                        gap-5
                                    "
                                >
                                    <div
                                        class="
                                            min-w-0
                                            flex-1
                                        "
                                    >
                                        <h4
                                            class="
                                                text-regular
                                                font-bold
                                                text-green
                                            "
                                        >
                                            Analytické
                                        </h4>

                                        <p
                                            class="
                                                text-regular
                                                mt-2
                                                leading-[1.6]
                                                text-green/70
                                            "
                                        >
                                            Pomáhajú nám porozumieť,
                                            ako návštevníci používajú
                                            stránku, a zlepšovať jej
                                            fungovanie.
                                        </p>
                                    </div>

                                    <Button
                                        type="button"
                                        background-image=""
                                        :background-color="
                                            draftPreferences.analytics
                                                ? 'var(--color-green)'
                                                : 'var(--color-baige)'
                                        "
                                        :text-color="
                                            draftPreferences.analytics
                                                ? 'var(--color-baige)'
                                                : 'var(--color-green)'
                                        "
                                        class="
                                            min-h-0
                                            min-w-[5rem]
                                            shrink-0
                                            px-3
                                            py-2
                                            text-sm
                                        "
                                        :aria-pressed="
                                            draftPreferences.analytics
                                                ? 'true'
                                                : 'false'
                                        "
                                        @click="
                                            togglePreference(
                                                'analytics'
                                            )
                                        "
                                    >
                                        {{
                                            draftPreferences.analytics
                                                ? 'Zapnuté'
                                                : 'Vypnuté'
                                        }}
                                    </Button>
                                </div>
                            </div>

                            <!-- Marketing -->
                            <div
                                class="
                                    w-full
                                    border-l-2
                                    pl-4
                                    text-left
                                    transition-colors
                                    duration-200
                                "
                                :class="
                                    draftPreferences.marketing
                                        ? 'border-green'
                                        : 'border-green/15'
                                "
                            >
                                <div
                                    class="
                                        flex
                                        items-start
                                        justify-between
                                        gap-5
                                    "
                                >
                                    <div
                                        class="
                                            min-w-0
                                            flex-1
                                        "
                                    >
                                        <h4
                                            class="
                                                text-regular
                                                font-bold
                                                text-green
                                            "
                                        >
                                            Marketingové
                                        </h4>

                                        <p
                                            class="
                                                text-regular
                                                mt-2
                                                leading-[1.6]
                                                text-green/70
                                            "
                                        >
                                            Umožňujú používanie
                                            reklamných a remarketingových
                                            nástrojov.
                                        </p>
                                    </div>

                                    <Button
                                        type="button"
                                        background-image=""
                                        :background-color="
                                            draftPreferences.marketing
                                                ? 'var(--color-green)'
                                                : 'var(--color-baige)'
                                        "
                                        :text-color="
                                            draftPreferences.marketing
                                                ? 'var(--color-baige)'
                                                : 'var(--color-green)'
                                        "
                                        class="
                                            min-h-0
                                            min-w-[5rem]
                                            shrink-0
                                            px-3
                                            py-2
                                            text-sm
                                        "
                                        :aria-pressed="
                                            draftPreferences.marketing
                                                ? 'true'
                                                : 'false'
                                        "
                                        @click="
                                            togglePreference(
                                                'marketing'
                                            )
                                        "
                                    >
                                        {{
                                            draftPreferences.marketing
                                                ? 'Zapnuté'
                                                : 'Vypnuté'
                                        }}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- Actions -->
                    <section
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
                            Uložiť rozhodnutie
                        </h3>

                        <p
                            class="
                                text-regular
                                mt-2
                                leading-[1.6]
                                text-green/70
                            "
                        >
                            Môžete prijať všetky cookies,
                            odmietnuť voliteľné alebo uložiť
                            vlastné nastavenia.
                        </p>

                        <div
                            class="
                                mt-6
                                flex
                                flex-col
                                items-start
                                gap-3

                                sm:flex-row
                                sm:flex-wrap
                            "
                        >
                            <Button
                                background-image=""
                                background-color="var(--color-green)"
                                text-color="var(--color-baige)"
                                @click="
                                    acceptAll
                                "
                            >
                                Prijať všetko
                            </Button>

                            <Button
                                background-image=""
                                background-color="var(--color-baige)"
                                text-color="var(--color-green)"
                                @click="
                                    rejectOptional
                                "
                            >
                                Odmietnuť voliteľné
                            </Button>

                            <Button
                                background-image=""
                                background-color="var(--color-baige)"
                                text-color="var(--color-green)"
                                @click="
                                    handleSavePreferences
                                "
                            >
                                Uložiť nastavenia
                            </Button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    </BottomSheet>
</template>