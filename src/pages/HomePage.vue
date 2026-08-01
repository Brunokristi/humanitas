<script setup>
import {
    computed,
    onBeforeUnmount,
    onMounted,
    ref
} from 'vue';

import { storeToRefs } from 'pinia';

import { usePublicSiteStore } from '../stores/publicSite';

import BottomSheet from '../components/BottomSheet.vue';
import Button from '../components/Button.vue';
import EmployeeCarousel from '../components/EmployeeCarousel.vue';
import FaqCarousel from '../components/Carousel.vue';
import ServiceBottomSheet from '../components/ServiceBottomSheet.vue';
import ServicesSlider from '../components/Slider.vue';

defineProps({
    expanded: {
        type: Boolean,
        default: false
    }
});

const publicSiteStore =
    usePublicSiteStore();

const {
    company,
    currentBranch,
    services,
    employees,
    contacts,
    openingHours,
    loading,
    error
} = storeToRefs(
    publicSiteStore
);

const servicesUrl =
    '/sluzby';

const contactUrl =
    '/kontakt';

/*
 * Hero
 */

const heroPhrases = [
    'váš príbeh',
    'to, čo prežívate',
    'vaše obavy',
    'vaše pocity',
    'to, čo je pre vás dôležité'
];

const heroPhraseIndex =
    ref(0);

const heroPhrase = computed(() => {
    return heroPhrases[
        heroPhraseIndex.value
    ];
});

let heroPhraseTimer =
    null;

/*
 * Service detail
 */

const selectedService =
    ref(null);

const serviceDetailsOpen =
    ref(false);

/*
 * Employee detail
 */

const selectedEmployee =
    ref(null);

const employeeSheetOpen =
    ref(false);

/*
 * Services
 */

const activeServices = computed(() => {
    return services.value.filter(
        (service) => {
            return service.isActive;
        }
    );
});

const homepageServices = computed(() => {
    const eligibleServices =
        activeServices.value.filter(
            hasServiceDescription
        );

    return shuffleItems(
        eligibleServices
    ).slice(
        0,
        6
    );
});

const remainingServicesCount =
    computed(() => {
        return Math.max(
            activeServices.value.length -
                homepageServices.value.length,
            0
        );
    });

/*
 * Team
 */

const orderedEmployees = computed(() => {
    const normalizeName = (
        employee
    ) => {
        return employeeName(
            employee
        )
            .normalize('NFD')
            .replace(
                /[\u0300-\u036f]/g,
                ''
            )
            .toLocaleLowerCase(
                'sk'
            );
    };

    return [
        ...employees.value
    ].sort((left, right) => {
        const leftName =
            normalizeName(left);

        const rightName =
            normalizeName(right);

        const leftIsLenka =
            leftName.includes(
                'lenka hafernikova'
            );

        const rightIsLenka =
            rightName.includes(
                'lenka hafernikova'
            );

        if (
            leftIsLenka &&
            !rightIsLenka
        ) {
            return -1;
        }

        if (
            !leftIsLenka &&
            rightIsLenka
        ) {
            return 1;
        }

        return 0;
    });
});

/*
 * FAQ
 */

const todayDayOfWeek = computed(() => {
    const day =
        new Date().getDay();

    return day === 0
        ? 7
        : day;
});

const todaysOpeningHours =
    computed(() => {
        return (
            openingHours.value.find(
                (entry) => {
                    return (
                        entry.dayOfWeek ===
                        todayDayOfWeek.value
                    );
                }
            ) ??
            null
        );
    });

const openingHoursTodayLabel =
    computed(() => {
        const entry =
            todaysOpeningHours.value;

        if (!entry) {
            return 'Dnes neuvedené';
        }

        if (entry.isClosed) {
            return 'Dnes zatvorené';
        }

        if (
            !entry.intervals?.length
        ) {
            return 'Dnes neuvedené';
        }

        const schedule =
            entry.intervals
                .map((interval) => {
                    return `${interval.opensAt} – ${interval.closesAt}`;
                })
                .join(', ');

        return `Dnes ${schedule}`;
    });

const primaryContact = computed(() => {
    return (
        contacts.value.find(
            (contact) => {
                return (
                    contact.isPrimary
                );
            }
        ) ??
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
                    'email'
                );
            }
        ) ??
        contacts.value[0] ??
        null
    );
});

const branchAddressLabel =
    computed(() => {
        const address =
            currentBranch.value
                ?.address;

        if (!address) {
            return '';
        }

        return [
            address.line1,
            address.line2,

            [
                address.postalCode,
                address.city
            ]
                .filter(Boolean)
                .join(' '),

            address.country
        ]
            .filter(Boolean)
            .join(', ');
    });

const faqItems = computed(() => {
    return [
        {
            id:
                'location',

            question:
                'Kde nás nájdete?',

            answer:
                branchAddressLabel.value
                    ? `Nájdete nás na adrese ${branchAddressLabel.value}.`
                    : 'Informácie o adrese nájdete v sekcii Kontakt.'
        },

        {
            id:
                'booking',

            question:
                'Ako sa objednať?',

            answer:
                primaryContact.value
                    ?.value
                    ? `Najjednoduchšie je zavolať nám na ${primaryContact.value.value}.`
                    : 'Kontaktujte nás prostredníctvom kontaktnej sekcie.'
        },

        {
            id:
                'opening-hours',

            question:
                'Kedy máme otvorené?',

            answer:
                openingHoursTodayLabel.value
        }
    ];
});

/*
 * General helpers
 */

function trimText(
    value,
    maxLength
) {
    const text =
        String(
            value ?? ''
        ).trim();

    if (!text) {
        return '';
    }

    if (
        text.length <=
        maxLength
    ) {
        return text;
    }

    return `${text
        .slice(
            0,
            maxLength
        )
        .trim()}…`;
}

function buildPublicAssetUrl(
    path
) {
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
}

function shuffleItems(items) {
    const shuffled = [
        ...items
    ];

    for (
        let index =
            shuffled.length - 1;
        index > 0;
        index--
    ) {
        const randomIndex =
            Math.floor(
                Math.random() *
                    (
                        index +
                        1
                    )
            );

        [
            shuffled[index],
            shuffled[randomIndex]
        ] = [
            shuffled[randomIndex],
            shuffled[index]
        ];
    }

    return shuffled;
}

/*
 * Service card helpers
 */

function rawServiceDescription(
    service
) {
    return (
        service?.description ??
        service?.shortDescription ??
        service?.short_description ??
        ''
    );
}

function hasServiceDescription(
    service
) {
    return Boolean(
        String(
            rawServiceDescription(
                service
            )
        ).trim()
    );
}

function serviceTitle(service) {
    return trimText(
        service?.name,
        80
    );
}

function serviceDescription(
    service
) {
    return trimText(
        rawServiceDescription(
            service
        ),
        80
    );
}

function serviceDurationLabel(
    service
) {
    const minutes =
        service?.durationMinutes ??
        service?.duration_minutes;

    const sessions =
        service?.durationSessions ??
        service?.duration_sessions;

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
}

function selfPayPrice(service) {
    return (
        service?.selfPayAmount ??
        service?.self_pay_amount ??
        null
    );
}

function hasSelfPayPrice(service) {
    return (
        selfPayPrice(
            service
        ) !== null
    );
}

function openServiceDetails(
    service
) {
    selectedService.value =
        service;

    serviceDetailsOpen.value =
        true;
}

/*
 * Employee helpers
 */

function employeeName(employee) {
    return [
        employee?.titleBefore,
        employee?.firstName,
        employee?.lastName,
        employee?.titleAfter
    ]
        .filter(Boolean)
        .join(' ');
}

function employeeInitials(
    employee
) {
    return [
        employee?.firstName
            ?.charAt(0),

        employee?.lastName
            ?.charAt(0)
    ]
        .filter(Boolean)
        .join('');
}

function employeePhotoUrl(
    employee
) {
    return buildPublicAssetUrl(
        employee?.photoUrl
    );
}

function employeePositions(
    employee
) {
    const value =
        employee?.position ??
        '';

    return String(value)
        .split(/[\n,;]+/)
        .map((position) => {
            return position.trim();
        })
        .filter(Boolean);
}

function openEmployee(employee) {
    selectedEmployee.value =
        employee;

    employeeSheetOpen.value =
        true;
}

/*
 * Lifecycle
 */

onMounted(() => {
    heroPhraseTimer =
        window.setInterval(
            () => {
                heroPhraseIndex.value =
                    (
                        heroPhraseIndex.value +
                        1
                    ) %
                    heroPhrases.length;
            },
            2800
        );
});

onBeforeUnmount(() => {
    if (
        heroPhraseTimer ===
        null
    ) {
        return;
    }

    window.clearInterval(
        heroPhraseTimer
    );

    heroPhraseTimer =
        null;
});
</script>

<template>
    <div >
        <!-- Loading -->
        <div
            v-if="
                loading &&
                !company
            "
            class="
                space-y-16
                p-5
            "
        >
            <section
                class="
                    flex
                    flex-col
                    items-center
                    gap-6
                "
            >
                <div
                    class="
                        h-6
                        w-48
                        animate-pulse
                        rounded-full
                        bg-baige/10
                    "
                />

                <div
                    class="
                        h-14
                        w-full
                        max-w-xl
                        animate-pulse
                        rounded-full
                        bg-baige/10
                    "
                />

                <div
                    class="
                        h-5
                        w-full
                        max-w-md
                        animate-pulse
                        rounded-full
                        bg-baige/10
                    "
                />
            </section>
        </div>

        <!-- Error -->
        <div
            v-else-if="
                error &&
                !company
            "
            class="
                mx-auto
                max-w-xl
                px-5
                py-16
                text-center
            "
        >
            <h1
                class="
                    heading
                    text-baige
                "
            >
                Obsah sa nepodarilo načítať
            </h1>

            <p
                class="
                    text-regular
                    mt-5
                    text-baige/65
                "
            >
                {{ error }}
            </p>

            <div
                class="
                    mt-8
                "
            >
                <Button
                    background-color="#FFE5E5"
                    text-color="#5A1F1F"
                    @click="
                        publicSiteStore.reload
                    "
                >
                    Skúsiť znova
                </Button>
            </div>
        </div>

        <!-- Content -->
        <main
            v-else
            class="
                space-y-20
                pb-12
                overflow-x-hidden

                lg:space-y-32
                lg:pb-24
            "
        >
            <!-- Hero -->
            <section
                class="
                    mx-auto
                    grid
                    w-full
                    max-w-7xl
                    grid-cols-1
                    items-center
                    gap-8
                    pt-5

                    lg:min-h-[36rem]
                    lg:grid-cols-[minmax(0,0.9fr)_minmax(28rem,1.1fr)]
                    lg:gap-14
                    lg:px-10
                    lg:pt-10

                    xl:gap-20
                    xl:px-16
                "
            >
                <!-- Hero copy -->
                <div
                    class="
                        flex
                        flex-col
                        items-center
                        gap-3
                        text-center

                        lg:items-start
                        lg:text-left
                    "
                >
                    <h1
                        class="
                            max-w-2xl
                            text-xl
                            leading-[1.08]
                            text-baige

                            lg:text-3xl
                        "
                    >
                        <span>
                            Podeľte sa s nami o
                        </span>

                        <br>

                        <span
                            class="
                                relative
                                inline-grid
                                min-h-[1.35em]
                                overflow-hidden
                                align-top
                            "
                        >
                            <Transition
                                name="hero-phrase"
                                mode="out-in"
                            >
                                <strong
                                    :key="
                                        heroPhrase
                                    "
                                    class="
                                        col-start-1
                                        row-start-1
                                        inline-block
                                        whitespace-nowrap
                                    "
                                >
                                    {{ heroPhrase }}
                                </strong>
                            </Transition>
                        </span>
                    </h1>

                    <p
                        class="
                            text-regular
                            max-w-lg
                            px-5
                            pb-6
                            text-baige/70

                            lg:px-0
                            lg:text-lg
                        "
                    >
                        Pomáhame deťom, dospelým aj rodinám
                        lepšie porozumieť tomu, čo prežívajú.
                    </p>

                    <p
                        class="
                            text-regular
                            max-w-lg
                            px-10
                            text-baige/70

                            lg:px-0
                        "
                    >
                        {{
                            currentBranch?.description ??
                            'Ambulancia klinickej a dopravnej psychológie a psychoterapie v Rimavskej Sobote'
                        }}
                    </p>
                </div>

                <!-- Hero illustration -->
                <div
                    class="
                        relative
                        flex
                        min-h-[20rem]
                        w-full
                        items-center
                        justify-center
                        overflow-x-clip

                        lg:min-h-[34rem]
                        lg:overflow-visible
                    "
                >
                    <img
                        src="/images/humanitas_rodina.svg"
                        alt="Humanitas"
                        class="
                            block
                            h-auto
                            shrink-0
                            object-contain
                            opacity-70

                            lg:max-h-[34rem]
                            lg:w-full
                            lg:max-w-[42rem]
                            lg:opacity-40
                        "
                        style="
                            width: 180vw;
                            max-width: none;
                        "
                    >
                </div>
            </section>

                        <!-- Services -->
            <section
                class="
                    mx-auto
                    flex
                    w-full
                    max-w-[100rem]
                    flex-col
                    gap-7
                "
            >
                <!-- Services heading -->
                <div
                    class="
                        mx-auto
                        flex
                        w-full
                        max-w-7xl
                        flex-col
                        items-center
                        gap-4
                        px-5
                        text-center

                        lg:px-10

                        xl:px-16
                    "
                >
                    <div>
                        <h2
                            class="
                                text-xl
                                font-bold
                                text-baige

                                lg:text-3xl
                            "
                        >
                            Ponúkané služby
                        </h2>

                        <p
                            class="
                                text-regular
                                mt-3
                                max-w-md
                                text-baige/75
                            "
                        >
                            Pozrite si, s čím sa na nás môžete
                            obrátiť.
                        </p>
                    </div>

                    <div
                        class="
                            hidden
                            shrink-0

                            lg:block
                        "
                    >
                        <Button
                            v-if="
                                remainingServicesCount >
                                0
                            "
                            :href="
                                servicesUrl
                            "
                            :notification="
                                remainingServicesCount
                            "
                            background-image=""
                            background-color="#FBF9F3"
                            text-color="#335940"
                        >
                            Ďalšie služby
                        </Button>
                    </div>
                </div>

                <!-- Service slider -->
                <div
                    class="
                        min-w-0
                        overflow-visible
                    "
                >
                    <ServicesSlider
                        v-if="
                            homepageServices.length
                        "
                        :items="
                            homepageServices
                        "
                        aria-label="Ponúkané služby"
                        @select="
                            openServiceDetails
                        "
                    >
                        <template
                            #card="{ item }"
                        >
                            <div
                                class="
                                    flex
                                    h-full
                                    w-full
                                    flex-col
                                "
                            >
                                <!-- Title -->
                                <div
                                    class="
                                        min-h-[5.5rem]
                                        shrink-0
                                    "
                                >
                                    <h3
                                        class="
                                            text-regular
                                            line-clamp-3
                                            text-xl
                                            font-bold
                                            leading-[1.3]
                                            text-green
                                        "
                                    >
                                        {{
                                            serviceTitle(
                                                item
                                            )
                                        }}
                                    </h3>
                                </div>

                                <!-- Description -->
                                <div
                                    class="
                                        min-h-[3rem]
                                        shrink-0
                                    "
                                >
                                    <p
                                        class="
                                            text-regular
                                            line-clamp-2
                                            text-sm
                                            leading-6
                                            text-green
                                        "
                                    >
                                        {{
                                            serviceDescription(
                                                item
                                            )
                                        }}
                                    </p>
                                </div>

                                <!-- Metadata -->
                                <div
                                    class="
                                        mt-5
                                        flex
                                        min-h-[4.25rem]
                                        shrink-0
                                        flex-col
                                        gap-3
                                    "
                                >
                                    <!-- Duration -->
                                    <div
                                        class="
                                            min-h-5
                                            shrink-0
                                        "
                                    >
                                        <div
                                            v-if="
                                                serviceDurationLabel(
                                                    item
                                                )
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
                                                {{
                                                    serviceDurationLabel(
                                                        item
                                                    )
                                                }}
                                            </p>
                                        </div>
                                    </div>

                                    <!-- Price -->
                                    <div
                                        class="
                                            min-h-5
                                            shrink-0
                                        "
                                    >
                                        <div
                                            v-if="
                                                hasSelfPayPrice(
                                                    item
                                                )
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
                                                od
                                                {{
                                                    selfPayPrice(
                                                        item
                                                    )
                                                }}
                                                €
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <!-- CTA -->
                                <div
                                    class="
                                        mt-auto
                                        flex
                                        w-full
                                        shrink-0
                                        justify-center
                                        pt-2
                                    "
                                >
                                    <Button
                                        data-no-drag
                                        background-image=""
                                        background-color="#335940"
                                        text-color="#FBF9F3"
                                        @click="
                                            openServiceDetails(
                                                item
                                            )
                                        "
                                    >
                                        Viac o službe
                                    </Button>
                                </div>
                            </div>
                        </template>
                    </ServicesSlider>

                    <p
                        v-else
                        class="
                            text-regular
                            text-center
                            text-baige/60
                        "
                    >
                        Služby momentálne nie sú
                        k dispozícii.
                    </p>
                </div>

                <!-- Mobile service CTA -->
                <div
                    class="
                        flex
                        flex-col
                        items-center
                        gap-3
                        px-5
                        text-center

                        lg:hidden
                    "
                >
                    <p
                        class="
                            text-regular
                            pb-3
                            text-baige/70
                        "
                    >
                        Nenašli ste, čo hľadáte?
                        <br>
                        Pozrite si všetky služby,
                        ktoré ponúkame.
                    </p>

                    <Button
                        v-if="
                            remainingServicesCount >
                            0
                        "
                        :href="
                            servicesUrl
                        "
                        :notification="
                            remainingServicesCount
                        "
                        background-image=""
                        background-color="#FBF9F3"
                        text-color="#335940"
                    >
                        Ďalšie služby
                    </Button>
                </div>
            </section>

<!-- FAQ + Team -->
<section
    class="
        mx-auto
        grid
        w-full
        max-w-7xl
        grid-cols-1
        gap-y-20
        px-5

        lg:items-stretch
        lg:gap-x-12
        lg:gap-y-0
        lg:px-10

        xl:gap-x-16
        xl:px-16
    "
    :class="
        orderedEmployees.length
            ? 'lg:grid-cols-2'
            : 'lg:grid-cols-1'
    "
>
    <!-- FAQ + CTA column -->
    <section
        class="
            min-w-0

            lg:flex
            lg:h-full
            lg:flex-col
            lg:justify-between
        "
    >
        <!-- FAQ content -->
        <div
            class="
                min-w-0
            "
        >
            <!-- FAQ copy -->
            <div
                class="
                    flex
                    flex-col
                    items-center
                    gap-3
                    text-center
                "
            >
                <h2
                    class="
                        text-xl
                        font-bold
                        text-baige

                        lg:text-2xl
                    "
                >
                    Časté otázky
                </h2>

                <p
                    class="
                        text-regular
                        max-w-sm
                        text-baige/70
                    "
                >
                    Všetko dôležité na jednom mieste.
                </p>
            </div>

            <!-- FAQ cards -->
            <div
                class="
                    mt-8
                    flex
                    min-w-0
                    justify-center
                "
            >
                <FaqCarousel
                    :items="
                        faqItems
                    "
                    scroll-motion
                />
            </div>
        </div>

        <!-- Final CTA -->
        <section
            v-if="
                orderedEmployees.length
            "
            class="
                mx-auto
                mt-12
                flex
                w-full
                max-w-4xl
                flex-col
                items-center
                justify-center
                gap-3
                px-5
                pb-12
                text-center

                lg:mt-auto
                lg:px-0
                lg:pb-4
                lg:pt-14
            "
        >
            <h2
                class="
                    text-xl
                    font-bold
                    text-baige

                    lg:text-2xl
                "
            >
                Ako ďalej?
            </h2>

            <p
                class="
                    text-regular
                    mt-2
                    text-baige/70
                "
            >
                Nájdite si cestu, ktorá vám vyhovuje.
            </p>

            <div
                class="
                    mt-5
                    flex
                    flex-wrap
                    justify-center
                    gap-3
                "
            >
                <Button
                    :href="
                        contactUrl
                    "
                    background-image=""
                    background-color="#FBF9F3"
                    text-color="#335940"
                >
                    Kontaktujte nás
                </Button>
            </div>
        </section>
    </section>

    <!-- Mobile illustration -->
    <section
        class="
            relative
            flex
            h-[20rem]
            w-full
            justify-center
            overflow-hidden

            lg:hidden
        "
    >
        <img
            src="/images/humanitas_ruky.svg"
            alt="Humanitas"
            class="
                absolute
                left-1/2
                top-1/2
                h-auto
                max-w-none
                shrink-0
                -translate-x-1/2
                -translate-y-1/2
                rotate-[50deg]
                scale-[3]
                object-contain
            "
        >
    </section>

    <!-- Team column -->
    <section
        v-if="
            orderedEmployees.length
        "
        class="
            relative
            min-w-0
            overflow-hidden

            lg:h-full
        "
    >
        <!-- Decorative illustration -->
        <img
            src="/images/humanitas_ruky.svg"
            alt=""
            aria-hidden="true"
            draggable="false"
            class="
                pointer-events-none
                absolute
                bottom-[-8rem]
                right-[-8rem]
                z-0
                hidden
                h-auto
                w-[34rem]
                max-w-none
                rotate-[20deg]
                opacity-[0.08]

                lg:block
            "
        >

        <div
            class="
                relative
                z-10
                flex
                h-full
                min-w-0
                flex-col
            "
        >
            <!-- Team copy -->
            <div
                class="
                    flex
                    flex-col
                    items-center
                    gap-3
                    text-center
                "
            >
                <h2
                    class="
                        text-xl
                        font-bold
                        text-baige

                        lg:text-2xl
                    "
                >
                    Náš tím
                </h2>

                <p
                    class="
                        text-regular
                        max-w-md
                        text-baige/70
                    "
                >
                    Ľudia, na ktorých sa môžete
                    obrátiť.
                </p>
            </div>

            <!-- Team carousel -->
            <div
                class="
                    mt-8
                    min-w-0

                    lg:flex
                    lg:flex-1
                    lg:flex-col
                "
            >
                <EmployeeCarousel
                    :items="
                        orderedEmployees
                    "
                    aria-label="Náš tím"
                    scroll-motion
                    @select="
                        openEmployee
                    "
                />
            </div>
        </div>
    </section>
</section>

        </main>

        <!-- Service detail -->
        <ServiceBottomSheet
            v-model="
                serviceDetailsOpen
            "
            :service="
                selectedService
            "
        />

        <!-- Employee detail -->
        <BottomSheet
            v-model="
                employeeSheetOpen
            "
        >
            <div
                v-if="
                    selectedEmployee
                "
                class="
                    mx-auto
                    w-full
                    max-w-4xl
                    pb-4
                    pt-4

                    sm:pb-12
                    sm:pt-6
                "
            >
                <div
                    class="
                        flex
                        flex-col
                        gap-6

                        sm:flex-row
                        sm:items-start
                    "
                >
                    <!-- Employee photo -->
                    <div
                        class="
                            shrink-0
                        "
                    >
                        <img
                            v-if="
                                employeePhotoUrl(
                                    selectedEmployee
                                )
                            "
                            :src="
                                employeePhotoUrl(
                                    selectedEmployee
                                )
                            "
                            :alt="
                                employeeName(
                                    selectedEmployee
                                )
                            "
                            class="
                                aspect-[3/4]
                                w-full
                                max-w-[11rem]
                                rounded-[2rem]
                                object-cover
                                shadow-[var(--shadow-mid)]
                            "
                        >

                        <div
                            v-else
                            class="
                                flex
                                aspect-[3/4]
                                w-full
                                max-w-[11rem]
                                items-center
                                justify-center
                                rounded-[2rem]
                                bg-green/15
                            "
                        >
                            <span
                                class="
                                    font-heading
                                    text-4xl
                                    font-bold
                                    text-green/30
                                "
                            >
                                {{
                                    employeeInitials(
                                        selectedEmployee
                                    )
                                }}
                            </span>
                        </div>
                    </div>

                    <!-- Employee information -->
                    <div
                        class="
                            min-w-0
                            flex-1
                        "
                    >
                        <div
                            class="
                                flex
                                flex-col
                                gap-3
                            "
                        >
                            <!-- Name -->
                            <h2
                                class="
                                    text-xl
                                    font-bold
                                    leading-[1.15]
                                    text-green
                                "
                            >
                                {{
                                    employeeName(
                                        selectedEmployee
                                    )
                                }}
                            </h2>

                            <!-- Positions -->
                            <div
                                v-if="
                                    employeePositions(
                                        selectedEmployee
                                    ).length
                                "
                                class="
                                    flex
                                    flex-col
                                    gap-3
                                "
                            >
                                <div
                                    v-for="
                                        (
                                            position,
                                            index
                                        ) in
                                        employeePositions(
                                            selectedEmployee
                                        )
                                    "
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
                                v-if="
                                    selectedEmployee.bio
                                "
                                class="
                                    text-regular
                                    whitespace-pre-line
                                    leading-[1.65]
                                    text-green/75
                                "
                            >
                                {{
                                    selectedEmployee.bio
                                }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </BottomSheet>
    </div>
</template>

<style scoped>
.hero-phrase-enter-active,
.hero-phrase-leave-active {
    transition:
        opacity 520ms ease,
        transform 620ms
            cubic-bezier(
                0.16,
                1,
                0.3,
                1
            ),
        filter 520ms ease;
}

.hero-phrase-enter-from {
    opacity: 0;

    transform:
        translate3d(
            0,
            0.35em,
            0
        );

    filter:
        blur(4px);
}

.hero-phrase-enter-to {
    opacity: 1;

    transform:
        translate3d(
            0,
            0,
            0
        );

    filter:
        blur(0);
}

.hero-phrase-leave-from {
    opacity: 1;

    transform:
        translate3d(
            0,
            0,
            0
        );

    filter:
        blur(0);
}

.hero-phrase-leave-to {
    opacity: 0;

    transform:
        translate3d(
            0,
            -0.25em,
            0
        );

    filter:
        blur(3px);
}

@media (
    prefers-reduced-motion:
    reduce
) {
    .hero-phrase-enter-active,
    .hero-phrase-leave-active {
        transition:
            opacity 150ms ease;
    }

    .hero-phrase-enter-from,
    .hero-phrase-enter-to,
    .hero-phrase-leave-from,
    .hero-phrase-leave-to {
        transform:
            none;

        filter:
            none;
    }
}
</style>