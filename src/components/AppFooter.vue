<script setup>
import {
    computed,
    ref
} from 'vue';

import { storeToRefs } from 'pinia';

import PrivacyPolicyBottomSheet from './PrivacyPolicy.vue';

import { usePublicSiteStore } from '../stores/publicSite';
import { useCookieConsent } from '../composables/useCookieConsent';

const publicSiteStore =
    usePublicSiteStore();

const {
    openSettings: openCookieSettings
} = useCookieConsent();

const {
    company,
    currentBranch,
    contacts,
    openingHours,
    privacyPolicy
} = storeToRefs(
    publicSiteStore
);

const privacyPolicyOpen =
    ref(false);

const currentYear =
    new Date().getFullYear();

const displayedBranchName = computed(() => {
    return (
        currentBranch.value?.name ??
        company.value?.name ??
        company.value?.legalName ??
        company.value?.legal_name ??
        'Humanitas'
    );
});

const displayedCompanyName = computed(() => {
    return (
        company.value?.legalName ??
        company.value?.legal_name ??
        company.value?.name ??
        'Humanitas'
    );
});

const branchAddress = computed(() => {
    const address =
        currentBranch.value?.address;

    if (!address) {
        return [];
    }

    if (
        Array.isArray(
            address.lines
        ) &&
        address.lines.length
    ) {
        return address.lines;
    }

    return [
        address.line1 ??
            address.line_1,

        address.line2 ??
            address.line_2,

        [
            address.postalCode ??
                address.postal_code,
            address.city
        ]
            .filter(Boolean)
            .join(' '),

        address.country
    ].filter(Boolean);
});

const companyAddress = computed(() => {
    const address =
        company.value?.registeredAddress ??
        company.value?.registered_address ??
        company.value?.address;

    if (!address) {
        return [];
    }

    if (
        Array.isArray(
            address.lines
        ) &&
        address.lines.length
    ) {
        return address.lines;
    }

    return [
        address.line1 ??
            address.line_1,

        address.line2 ??
            address.line_2,

        [
            address.postalCode ??
                address.postal_code,
            address.city
        ]
            .filter(Boolean)
            .join(' '),

        address.country
    ].filter(Boolean);
});

const phoneContact = computed(() => {
    return (
        contacts.value.find(
            (contact) => {
                return (
                    contact.type ===
                    'phone'
                );
            }
        ) ??
        contacts.value.find(
            (contact) => {
                return (
                    contact.type ===
                    'booking_phone'
                );
            }
        ) ??
        null
    );
});

const emailContact = computed(() => {
    return (
        contacts.value.find(
            (contact) => {
                return (
                    contact.type ===
                    'email'
                );
            }
        ) ??
        null
    );
});

const formattedBranchAddress = computed(() => {
    return branchAddress.value.join(
        ', '
    );
});

const formattedCompanyAddress = computed(() => {
    return companyAddress.value.join(
        ', '
    );
});

const companyIco = computed(() => {
    return (
        company.value?.ico ??
        company.value?.companyIdNumber ??
        company.value?.company_id_number ??
        null
    );
});

const companyDic = computed(() => {
    return (
        company.value?.dic ??
        company.value?.taxId ??
        company.value?.tax_id ??
        null
    );
});

const ambulances = [
    {
        name: 'Mentis',
        logo: '/images/mentis_logo.png',
        nameClass: [
            'text-[#BB5264]'
        ],
        href: 'https://klinickapsychologialucenec.sk'
    },
    {
        name: 'Humanitas',
        logo: '/images/humanitas_logo.png',
        href: 'https://klinickapsychologiars.sk'
    }
];

function contactHref(contact) {
    if (!contact?.value) {
        return null;
    }

    if (
        contact.type ===
        'email'
    ) {
        return `mailto:${contact.value}`;
    }

    if (
        contact.type ===
            'phone' ||
        contact.type ===
            'booking_phone'
    ) {
        return `tel:${contact.value.replace(
            /[^\d+]/g,
            ''
        )}`;
    }

    return null;
}

function openingHoursDayLabel(entry) {
    if (entry.label) {
        return entry.label;
    }

    const day =
        entry.dayOfWeek ??
        entry.day_of_week ??
        entry.day;

    return {
        1: 'Pondelok',
        2: 'Utorok',
        3: 'Streda',
        4: 'Štvrtok',
        5: 'Piatok',
        6: 'Sobota',
        7: 'Nedeľa',

        monday: 'Pondelok',
        tuesday: 'Utorok',
        wednesday: 'Streda',
        thursday: 'Štvrtok',
        friday: 'Piatok',
        saturday: 'Sobota',
        sunday: 'Nedeľa'
    }[day] ?? day ?? '';
}

function openingHoursSchedule(entry) {
    if (
        entry.isClosed ||
        entry.is_closed
    ) {
        return 'Zatvorené';
    }

    if (entry.schedule) {
        return entry.schedule;
    }

    const intervals =
        entry.intervals ?? [];

    if (!intervals.length) {
        return 'Neuvedené';
    }

    return intervals
        .map((interval) => {
            const opensAt =
                interval.opensAt ??
                interval.opens_at;

            const closesAt =
                interval.closesAt ??
                interval.closes_at;

            if (
                !opensAt ||
                !closesAt
            ) {
                return null;
            }

            return `${String(
                opensAt
            ).slice(
                0,
                5
            )} – ${String(
                closesAt
            ).slice(
                0,
                5
            )}`;
        })
        .filter(Boolean)
        .join(', ');
}

function handlePrivacyPolicyClick() {
    privacyPolicyOpen.value = true;
}

function handleCookiesClick() {
    openCookieSettings();
}
</script>

<template>
    <footer
        class="
            relative
            z-10
            overflow-hidden
            bg-baige
            px-6
            pb-4
            pt-5
            text-green

            sm:pt-10
        "
    >
        <!-- Decorative image behind footer content -->
        <img
            src="/images/humanitas_mamadieta_zelena.svg"
            alt=""
            aria-hidden="true"
            draggable="false"
            class="
                pointer-events-none
                absolute
                bottom-[-4rem]
                right-[-4rem]
                z-0
                h-auto
                w-[150%]
                max-h-[40rem]
                max-w-none
                opacity-[0.2]

                sm:bottom-[-9rem]
                sm:w-[60%]
            "
        >

        <!-- Footer content -->
        <div
            class="
                relative
                z-10
                mx-auto
                w-full
            "
        >
            <!-- Main footer sections -->
            <div
                class="
                    grid
                    grid-cols-1
                    gap-x-12
                    gap-y-14
                    pt-15

                    sm:justify-items-center

                    md:grid-cols-3

                    xl:gap-x-30
                "
            >
                <!-- Contact -->
                <section
                    class="
                        w-full
                        max-w-[350px]
                        text-left
                    "
                >
                    <h2
                        class="
                            text-regular
                            font-bold
                            text-green
                        "
                    >
                        Kontakt
                    </h2>

                    <div
                        class="
                            mt-6
                            flex
                            flex-col
                            items-start
                            gap-1
                        "
                    >
                        <a
                            v-if="phoneContact"
                            :href="
                                contactHref(
                                    phoneContact
                                )
                            "
                            class="
                                group
                                flex
                                min-h-9
                                items-center
                                gap-3
                            "
                        >
                            <span
                                class="
                                    flex
                                    shrink-0
                                    items-center
                                    justify-center
                                    text-green
                                "
                            >
                                <i
                                    class="
                                        bi
                                        bi-telephone
                                        text-base
                                    "
                                    aria-hidden="true"
                                />
                            </span>

                            <span
                                class="
                                    text-regular
                                    break-words
                                    text-green
                                    transition-opacity
                                    group-hover:opacity-55
                                "
                            >
                                {{ phoneContact.value }}
                            </span>
                        </a>

                        <a
                            v-if="emailContact"
                            :href="
                                contactHref(
                                    emailContact
                                )
                            "
                            class="
                                group
                                flex
                                min-h-9
                                items-center
                                gap-3
                            "
                        >
                            <span
                                class="
                                    flex
                                    shrink-0
                                    items-center
                                    justify-center
                                    text-green
                                "
                            >
                                <i
                                    class="
                                        bi
                                        bi-envelope
                                        text-base
                                    "
                                    aria-hidden="true"
                                />
                            </span>

                            <span
                                class="
                                    text-regular
                                    min-w-0
                                    break-words
                                    text-green
                                    transition-opacity
                                    group-hover:opacity-55
                                "
                            >
                                {{ emailContact.value }}
                            </span>
                        </a>

                        <div
                            v-if="
                                formattedBranchAddress
                            "
                            class="
                                flex
                                min-h-9
                                items-start
                                gap-3
                            "
                        >
                            <span
                                class="
                                    flex
                                    shrink-0
                                    items-center
                                    justify-center
                                    text-green
                                "
                            >
                                <i
                                    class="
                                        bi
                                        bi-geo-alt
                                        text-base
                                    "
                                    aria-hidden="true"
                                />
                            </span>

                            <span
                                class="
                                    text-regular
                                    pt-2
                                    text-left
                                    text-green
                                "
                            >
                                {{
                                    formattedBranchAddress
                                }}
                            </span>
                        </div>
                    </div>
                </section>

                <!-- Opening hours -->
                <section
                    class="
                        w-full
                        max-w-[350px]
                        text-left
                    "
                >
                    <h2
                        class="
                            text-regular
                            font-bold
                            text-green
                        "
                    >
                        Otváracie hodiny
                    </h2>

                    <div
                        v-if="
                            openingHours.length
                        "
                        class="
                            mt-6
                            flex
                            w-full
                            flex-col
                        "
                    >
                        <div
                            v-for="
                                entry in
                                openingHours
                            "
                            :key="
                                `${
                                    entry.dayOfWeek ||
                                    entry.day_of_week ||
                                    entry.day
                                }-${
                                    openingHoursSchedule(
                                        entry
                                    )
                                }`
                            "
                            class="
                                grid
                                min-h-9
                                w-full
                                grid-cols-[minmax(0,1fr)_auto]
                                items-center
                                gap-4
                            "
                        >
                            <span
                                class="
                                    text-regular
                                    text-left
                                    text-green
                                "
                            >
                                {{
                                    openingHoursDayLabel(
                                        entry
                                    )
                                }}
                            </span>

                            <span
                                class="
                                    text-regular
                                    text-right
                                    text-green
                                "
                            >
                                {{
                                    openingHoursSchedule(
                                        entry
                                    )
                                }}
                            </span>
                        </div>
                    </div>

                    <p
                        v-else
                        class="
                            text-regular
                            mt-6
                            text-left
                            text-green/50
                        "
                    >
                        Otváracie hodiny zatiaľ nie sú uvedené.
                    </p>
                </section>

                <!-- Company -->
                <section
                    class="
                        w-full
                        max-w-[350px]
                        text-left
                    "
                >
                    <h2
                        class="
                            text-regular
                            font-bold
                            text-green
                        "
                    >
                        Prevádzkovateľ
                    </h2>

                    <div
                        class="
                            mt-6
                            flex
                            flex-col
                            items-start
                            gap-3
                        "
                    >
                        <p
                            class="
                                text-regular
                                flex
                                min-h-9
                                items-center
                                text-left
                                text-green
                            "
                        >
                            {{
                                displayedCompanyName
                            }}
                        </p>

                        <div
                            class="
                                text-regular
                                flex
                                flex-col
                                items-start
                                gap-1
                                text-left
                                text-green
                            "
                        >
                            <p
                                v-if="
                                    formattedCompanyAddress
                                "
                                class="
                                    break-words
                                "
                            >
                                {{
                                    formattedCompanyAddress
                                }}
                            </p>

                            <p
                                v-if="
                                    companyIco
                                "
                            >
                                IČO:
                                {{ companyIco }}
                            </p>

                            <p
                                v-if="
                                    companyDic
                                "
                            >
                                DIČ:
                                {{ companyDic }}
                            </p>
                        </div>
                    </div>

                    <!-- Ambulances -->
                    <div
                        class="
                            mt-6
                            flex
                            flex-col
                            items-start
                            gap-3
                        "
                    >
                        <a
                            v-for="
                                ambulance in
                                ambulances
                            "
                            :key="
                                ambulance.name
                            "
                            :href="
                                ambulance.href
                            "
                            target="_blank"
                            rel="noopener noreferrer"
                            class="
                                group
                                flex
                                min-h-9
                                w-fit
                                items-center
                                gap-2
                                transition-opacity
                                hover:opacity-60
                            "
                            :aria-label="
                                `Navštíviť web ${ambulance.name}`
                            "
                        >
                            <img
                                :src="
                                    ambulance.logo
                                "
                                :alt="
                                    ambulance.name
                                "
                                class="
                                    h-7
                                    w-auto
                                    max-w-10
                                    shrink-0
                                    object-contain
                                "
                            >

                            <span
                                class="
                                    heading
                                    uppercase
                                "
                                :class="
                                    ambulance.nameClass
                                "
                            >
                                {{
                                    ambulance.name
                                }}
                            </span>
                        </a>
                    </div>
                </section>
            </div>

            <!-- Bottom bar -->
            <div
                class="
                    relative
                    z-10
                    mt-14
                    flex
                    flex-col
                    items-center
                    justify-center
                    gap-3
                "
            >
                <p
                    class="
                        text-regular
                        text-center
                        text-green/70
                    "
                >
                    © {{ currentYear }}
                    {{ displayedBranchName }}
                </p>

                <nav
                    class="
                        flex
                        flex-wrap
                        items-center
                        justify-center
                        gap-x-6
                        gap-y-3
                    "
                    aria-label="Právne odkazy"
                >
                    <button
                        type="button"
                        class="
                            text-regular
                            text-green/70
                            transition-opacity
                            hover:opacity-55
                            cursor-pointer
                        "
                        @click="
                            handlePrivacyPolicyClick
                        "
                    >
                        Ochrana osobných údajov
                    </button>

                    <button
                        type="button"
                        class="
                            text-regular
                            text-green/70
                            transition-opacity
                            hover:opacity-55
                            cursor-pointer
                        "
                        @click="
                            handleCookiesClick
                        "
                    >
                        Cookies
                    </button>
                </nav>
            </div>
        </div>
    </footer>

    <PrivacyPolicyBottomSheet
        v-model="privacyPolicyOpen"
        :title="
            privacyPolicy.title
        "
        :updated-at="
            privacyPolicy.updatedAt
        "
        :sections="
            privacyPolicy.sections
        "
    />
</template>