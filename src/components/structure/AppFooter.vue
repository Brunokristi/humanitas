<script setup>
import {
    computed,
    ref
} from 'vue';

import { storeToRefs } from 'pinia';

import PrivacyPolicyBottomSheet from '../sheets/PrivacyPolicy.vue';

import { usePublicSiteStore } from '../../stores/publicSite.js';
import { useCookieConsent } from '../../composables/useCookieConsent.js';

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
        logo: '/images/mentis_logo_horizontalne.svg',
        nameClass: [
            'text-[#BB5264]'
        ],
        href: 'https://klinickapsychologialucenec.sk'
    },
    {
        name: 'Humanitas',
        logo: '/images/humanitas_logo_horizontalne.svg',
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
    privacyPolicyOpen.value =
        true;
}

function handleCookiesClick() {
    openCookieSettings();
}
</script>

<template>
    <div
        class="
            relative
            w-full
            overflow-hidden
            bg-baige
        "
    >
        <img
            src="/images/humanitas_mamadieta_zelena.svg"
            alt=""
            aria-hidden="true"
            draggable="false"
            class="
                pointer-events-none
                absolute
                bottom-[-4rem]
                right-[-8rem]
                z-0
                h-auto
                max-h-[50rem]
                max-w-none
                opacity-[0.2]

                sm:bottom-[-9rem]
                sm:w-[60%]

                md:bottom-[-15rem]
                md:right-[-15rem]
                md:w-[40rem]

                lg:bottom-[-10rem]

                xl:right-[-15rem]
            "
        >

        <footer
            class="
                relative
                z-10
                mx-auto
                w-full
                max-w-[1600px]
                px-6
                pb-20
                pt-14
                text-green
            "
        >
            <div
                class="
                    grid
                    grid-cols-1
                    justify-items-center
                    gap-x-12
                    gap-y-14

                    lg:grid-cols-3

                    xl:gap-x-30
                "
            >
                <section
                    class="
                        w-full
                        max-w-[350px]
                        text-left
                    "
                >
                    <div
                        class="
                            relative
                            w-fit
                            pb-1
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

                        <svg
                            viewBox="0 0 160 12"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                            class="
                                pointer-events-none
                                absolute
                                -bottom-0.5
                                h-2
                                w-[calc(100%+3rem)]
                                overflow-visible
                                text-green
                            "
                        >
                            <path
                                d="
                                    M2 7
                                    C28 8.5, 54 5.5, 80 7
                                    C106 8.5, 132 5.8, 158 6.8
                                "
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </div>

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
                                        leading-none
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
                                        leading-none
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
                                        bi-geo-alt
                                        text-base
                                        leading-none
                                    "
                                    aria-hidden="true"
                                />
                            </span>

                            <span
                                class="
                                    text-regular
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

                <section
                    class="
                        w-full
                        max-w-[350px]
                        text-left
                    "
                >
                    <div
                        class="
                            relative
                            w-fit
                            pb-1
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

                        <svg
                            viewBox="0 0 160 12"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                            class="
                                pointer-events-none
                                absolute
                                -bottom-0.5
                                h-2
                                w-[calc(100%+3rem)]
                                overflow-visible
                                text-green
                            "
                        >
                            <path
                                d="
                                    M2 7
                                    C28 8.5, 54 5.5, 80 7
                                    C106 8.5, 132 5.8, 158 6.8
                                "
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </div>

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

                <div
                    class="
                        flex
                        w-full
                        max-w-[350px]
                        flex-col
                        gap-14
                    "
                >
                    <!-- Prevádzkovateľ -->
                    <section
                        class="
                            w-full
                            text-left
                        "
                    >
                        <div
                            class="
                                relative
                                w-fit
                                pb-1
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

                            <svg
                                viewBox="0 0 160 12"
                                preserveAspectRatio="none"
                                aria-hidden="true"
                                class="
                                    pointer-events-none
                                    absolute
                                    -bottom-0.5
                                    h-2
                                    w-[calc(100%+3rem)]
                                    overflow-visible
                                    text-green
                                "
                            >
                                <path
                                    d="
                                        M2 7
                                        C28 8.5, 54 5.5, 80 7
                                        C106 8.5, 132 5.8, 158 6.8
                                    "
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </div>

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
                    </section>

                    <!-- Naše ambulancie -->
                    <section
                        class="
                            w-full
                            text-left
                        "
                    >
                        <div
                            class="
                                relative
                                w-fit
                                pb-1
                            "
                        >
                            <h2
                                class="
                                    text-regular
                                    font-bold
                                    text-green
                                "
                            >
                                Naše ambulancie
                            </h2>

                            <svg
                                viewBox="0 0 160 12"
                                preserveAspectRatio="none"
                                aria-hidden="true"
                                class="
                                    pointer-events-none
                                    absolute
                                    -bottom-0.5
                                    h-2
                                    w-[calc(100%+3rem)]
                                    overflow-visible
                                    text-green
                                "
                            >
                                <path
                                    d="
                                        M2 7
                                        C28 8.5, 54 5.5, 80 7
                                        C106 8.5, 132 5.8, 158 6.8
                                    "
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </div>

                        <div
                            class="
                                mt-6
                                flex
                                flex-col
                                items-start
                                gap-6
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
                                        h-10
                                        w-auto
                                        shrink-0
                                        object-contain
                                    "
                                >
                            </a>
                        </div>
                    </section>
                </div>
            </div>

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
                            cursor-pointer
                            text-green/70
                            transition-opacity
                            hover:opacity-55
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
                            cursor-pointer
                            text-green/70
                            transition-opacity
                            hover:opacity-55
                        "
                        @click="
                            handleCookiesClick
                        "
                    >
                        Cookies
                    </button>
                </nav>
            </div>
        </footer>
    </div>

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