<script setup>
import {
    computed,
    ref
} from 'vue';

import { storeToRefs } from 'pinia';

import { usePublicSiteStore } from '../stores/publicSite';

import BottomSheet from '../components/BottomSheet.vue';
import Button from '../components/Button.vue';
import EmployeeCarousel from '../components/EmployeeCarousel.vue';
import FaqCarousel from '../components/Carousel.vue';
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

const servicesUrl = '/sluzby';
const contactUrl = '/kontakt';

const selectedService = ref(null);
const serviceDetailsOpen = ref(false);

const selectedEmployee = ref(null);
const employeeSheetOpen = ref(false);

const activeServices = computed(() => {
    return services.value.filter((service) => {
        return service.isActive;
    });
});

const homepageServices = computed(() => {
    return activeServices.value.slice(0, 6);
});

const remainingServicesCount = computed(() => {
    return Math.max(
        activeServices.value.length -
            homepageServices.value.length,
        0
    );
});

const todayDayOfWeek = computed(() => {
    const day =
        new Date().getDay();

    return day === 0
        ? 7
        : day;
});

const todaysOpeningHours = computed(() => {
    return (
        openingHours.value.find((entry) => {
            return entry.dayOfWeek ===
                todayDayOfWeek.value;
        }) ??
        null
    );
});

const openingHoursTodayLabel = computed(() => {
    const entry =
        todaysOpeningHours.value;

    if (!entry) {
        return 'Dnes neuvedené';
    }

    if (entry.isClosed) {
        return 'Dnes zatvorené';
    }

    if (!entry.intervals?.length) {
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
        contacts.value.find((contact) => {
            return contact.isPrimary;
        }) ??
        contacts.value.find((contact) => {
            return contact.type === 'phone';
        }) ??
        contacts.value.find((contact) => {
            return contact.type === 'email';
        }) ??
        contacts.value[0] ??
        null
    );
});

const primaryContactHref = computed(() => {
    const contact =
        primaryContact.value;

    if (!contact?.value) {
        return contactUrl;
    }

    if (contact.type === 'phone') {
        return `tel:${contact.value.replace(/[^\d+]/g, '')}`;
    }

    if (contact.type === 'email') {
        return `mailto:${contact.value}`;
    }

    return contactUrl;
});

const primaryContactButtonLabel = computed(() => {
    const contact =
        primaryContact.value;

    if (!contact) {
        return 'Kontaktujte nás';
    }

    if (contact.type === 'phone') {
        return 'Zavolajte nám';
    }

    if (contact.type === 'email') {
        return 'Napíšte nám';
    }

    return 'Kontaktujte nás';
});

const branchAddressLabel = computed(() => {
    const address =
        currentBranch.value?.address;

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
            id: 'location',
            question: 'Kde nás nájdete?',
            answer:
                branchAddressLabel.value
                    ? `Nájdete nás na adrese ${branchAddressLabel.value}.`
                    : 'Informácie o adrese nájdete v sekcii Kontakt.'
        },

        {
            id: 'booking',
            question: 'Ako sa objednať?',
            answer:
                primaryContact.value?.value
                    ? `Najrýchlejšie sa s nami spojíte cez ${primaryContact.value.value}.`
                    : 'Kontaktujte nás prostredníctvom kontaktnej sekcie.'
        },

        {
            id: 'opening-hours',
            question: 'Kedy máme otvorené?',
            answer:
                openingHoursTodayLabel.value
        }
    ];
});

function trimText(
    value,
    maxLength
) {
    const text =
        String(value ?? '')
            .trim();

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
        .slice(0, maxLength)
        .trim()}…`;
}

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

    return `${apiBaseUrl}${path}`;
}

/*
 * Services
 */

function serviceTitle(service) {
    return trimText(
        service?.name,
        80
    );
}

function serviceDescription(service) {
    return trimText(
        service?.description ??
            service?.shortDescription ??
            service?.short_description,
        80
    );
}

function serviceFullDescription(service) {
    return (
        service?.description ??
        service?.fullDescription ??
        service?.full_description ??
        service?.longDescription ??
        service?.long_description ??
        service?.shortDescription ??
        service?.short_description ??
        ''
    );
}

function serviceDurationLabel(service) {
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

function hasInsurancePrice(service) {
    const value =
        service?.insuranceAmount ??
        service?.insurance_amount;

    return (
        value !== null &&
        value !== undefined
    );
}

function insurancePrice(service) {
    return (
        service?.insuranceAmount ??
        service?.insurance_amount
    );
}

function hasSelfPayPrice(service) {
    const value =
        service?.selfPayAmount ??
        service?.self_pay_amount;

    return (
        value !== null &&
        value !== undefined
    );
}

function selfPayPrice(service) {
    return (
        service?.selfPayAmount ??
        service?.self_pay_amount
    );
}

function serviceCategoryLabel(service) {
    return (
        service?.category?.name ??
        service?.category?.slug ??
        null
    );
}

function serviceTags(service) {
    return Array.isArray(
        service?.tags
    )
        ? service.tags.filter(
            Boolean
        )
        : [];
}

function serviceInformationItems(service) {
    return Array.isArray(
        service?.information
    )
        ? [
            ...service.information
        ].sort(
            (left, right) => {
                return (
                    (left.sortOrder ?? 0) -
                    (right.sortOrder ?? 0)
                );
            }
        )
        : [];
}

function serviceNecessityItems(service) {
    return Array.isArray(
        service?.necessities
    )
        ? [
            ...service.necessities
        ].sort(
            (left, right) => {
                return (
                    (left.sortOrder ?? 0) -
                    (right.sortOrder ?? 0)
                );
            }
        )
        : [];
}

function serviceSteps(service) {
    return Array.isArray(
        service?.steps
    )
        ? [
            ...service.steps
        ].sort(
            (left, right) => {
                const leftOrder =
                    left.number ||
                    left.sortOrder ||
                    0;

                const rightOrder =
                    right.number ||
                    right.sortOrder ||
                    0;

                return (
                    leftOrder -
                    rightOrder
                );
            }
        )
        : [];
}

function serviceFiles(service) {
    return Array.isArray(
        service?.files
    )
        ? [
            ...service.files
        ].sort(
            (left, right) => {
                return (
                    (left.sortOrder ?? 0) -
                    (right.sortOrder ?? 0)
                );
            }
        )
        : [];
}

function serviceFileUrl(file) {
    return buildPublicAssetUrl(
        file?.path
    );
}

function serviceFileCardProps(file) {
    const url =
        serviceFileUrl(file);

    if (!url) {
        return {};
    }

    return {
        href: url,
        target: '_blank',
        rel: 'noreferrer'
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

    if (
        kilobytes <
        1024
    ) {
        return `${kilobytes.toFixed(1)} KB`;
    }

    return `${
        (
            kilobytes /
            1024
        ).toFixed(1)
    } MB`;
}

function serviceRawData(service) {
    return JSON.stringify(
        service,
        null,
        2
    );
}

function openServiceDetails(service) {
    selectedService.value =
        service;

    serviceDetailsOpen.value =
        true;
}

/*
 * Employees
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

function employeeInitials(employee) {
    return [
        employee?.firstName
            ?.charAt(0),
        employee?.lastName
            ?.charAt(0)
    ]
        .filter(Boolean)
        .join('');
}

function employeePhotoUrl(employee) {
    return buildPublicAssetUrl(
        employee?.photoUrl
    );
}

function employeePhoneHref(employee) {
    if (!employee?.phone) {
        return null;
    }

    return `tel:${employee.phone.replace(/[^\d+]/g, '')}`;
}

function employeeEmailHref(employee) {
    if (!employee?.email) {
        return null;
    }

    return `mailto:${employee.email}`;
}

function openEmployee(employee) {
    selectedEmployee.value =
        employee;

    employeeSheetOpen.value =
        true;
}

function employeePositions(employee) {
    const value =
        employee?.position ??
        '';

    return String(value)
        .split(/[\n,;]+/)
        .map((item) => {
            return item.trim();
        })
        .filter(Boolean);
}
</script>

<template>
    <div>
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

            <div class="mt-8">
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
        <div
            v-else
            class="space-y-20"
        >
            <!-- Hero -->
            <section
                class="
                    flex
                    flex-col
                    items-center
                    justify-center
                    gap-3
                    px-5
                    pt-5
                    text-center
                "
            >
                <h1
                    class="
                        text-xl
                        text-baige
                    "
                >
                    Podeľte sa s nami o

                    <strong>
                        váš príbeh
                    </strong>
                </h1>

                <h2
                    class="
                        text-regular
                        max-w-lg
                        text-baige/70
                    "
                >
                    {{
                        currentBranch?.description ??
                        'Ambulancia klinickej a dopravnej psychológie a psychoterapie v Rimavskej Sobote'
                    }}
                </h2>
            </section>

            <!-- Illustration -->
            <section
                class="
                    relative
                    flex
                    w-full
                    justify-center
                    overflow-x-clip
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
                    "
                    style="
                        width: 180vw;
                        max-width: none;
                    "
                >
            </section>

            <!-- FAQ -->
            <section
                class="
                    flex
                    flex-col
                    items-center
                    justify-center
                    gap-3
                "
            >
                <h2
                    class="
                        text-regular
                        text-xl
                        font-bold
                        text-baige
                    "
                >
                    Časté otázky
                </h2>

                <p
                    class="
                        text-regular
                        mt-3
                        text-baige/70
                        text-center
                    "
                >
                    Prelistujte sa najčastejšie
                    sa vyskytujúcimi otázkami
                </p>

                <FaqCarousel
                    :items="faqItems"
                />
            </section>

            <!-- Illustration -->
            <section
                class="
                    relative
                    flex
                    w-full
                    justify-center
                    overflow-x-clip
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
                    "
                    style="
                        width: 180vw;
                        max-width: none;
                    "
                >
            </section>

            <!-- Services -->
            <section
                class="
                    flex
                    w-full
                    flex-col
                    items-center
                    justify-center
                    gap-3
                "
            >
                <h2
                    class="
                        text-regular
                        text-xl
                        font-bold
                        text-baige
                    "
                >
                    Ponúkané služby
                </h2>

                <p
                    class="
                        text-regular
                        text-baige/75
                    "
                >
                    Prelistujte sa ponúkanými
                    službami
                </p>

                <ServicesSlider
                    v-if="homepageServices.length"
                    :items="homepageServices"
                    aria-label="Ponúkané služby"
                    @select="openServiceDetails"
                >
                    <template #card="{ item }">
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
                                    {{ serviceTitle(item) }}
                                </h3>
                            </div>

                            <!-- Description slot -->
                            <div
                                class="
                                    min-h-[3rem]
                                    shrink-0
                                "
                            >
                                <p
                                    v-if="serviceDescription(item)"
                                    class="
                                        text-regular
                                        line-clamp-2
                                        text-sm
                                        leading-6
                                        text-green
                                    "
                                >
                                    {{ serviceDescription(item) }}
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
                                        v-if="serviceDurationLabel(item)"
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
                                            {{ serviceDurationLabel(item) }}
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
                                        v-if="hasSelfPayPrice(item)"
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
                                            od {{ selfPayPrice(item) }} €
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
                                        openServiceDetails(item)
                                    "
                                >
                                    Preskúmať
                                </Button>
                            </div>
                        </div>
                    </template>
                </ServicesSlider>

                <p
                    v-else
                    class="
                        text-regular
                        text-baige/60
                    "
                >
                    Služby momentálne nie sú
                    k dispozícii.
                </p>

                <p
                    class="
                        text-regular
                        mt-3
                        text-baige/70
                        text-center
                    "
                >
                    Prelistujte sa najčastejšie
                    sa vyskytujúcimi otázkami
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
            </section>

            <!-- Illustration -->
            <section
                class="
                    relative
                    flex
                    w-full
                    justify-center
                    overflow-x-clip
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
                    "
                    style="
                        width: 180vw;
                        max-width: none;
                    "
                >
            </section>

            <!-- Team -->
            <section
                v-if="
                    employees.length
                "
                class="
                    flex
                    w-full
                    flex-col
                    items-center
                    justify-center
                    gap-6
                    overflow-hidden
                "
            >
                <div
                    class="
                        px-5
                        text-center
                    "
                >
                    <h2
                        class="
                            text-regular
                            text-xl
                            font-bold
                            text-baige
                        "
                    >
                        Náš tím
                    </h2>

                    <p
                        class="
                            text-regular
                            mt-3
                            text-baige/70
                        "
                    >
                        Spoznajte našich odborníkov
                    </p>
                </div>

                <EmployeeCarousel
                    :items="employees"
                    aria-label="Náš tím"
                    @select="
                        openEmployee
                    "
                />
            </section>
        </div>

        <!-- Service detail -->
        <BottomSheet
            v-model="
                serviceDetailsOpen
            "
        >
            <div
                v-if="
                    selectedService
                "
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
                <!-- Heading + description -->
                <div
                    class="
                        max-w-3xl
                        flex
                        flex-col
                        gap-3
                    "
                >
                    <h2
                        class="
                            font-regular
                            font-bold
                            leading-[1]
                            text-green
                        "
                    >
                        {{
                            selectedService.name
                        }}
                    </h2>

                    <p
                        v-if="
                            serviceFullDescription(
                                selectedService
                            )
                        "
                        class="
                            text-regular
                            mt-6
                            max-w-3xl
                            whitespace-pre-line
                            leading-[1.65]
                            text-green/70
                        "
                    >
                        {{
                            serviceFullDescription(
                                selectedService
                            )
                        }}
                    </p>
                </div>

                <!-- Duration + price -->
                <div
                    v-if="
                        serviceDurationLabel(
                            selectedService
                        ) ||
                        hasSelfPayPrice(
                            selectedService
                        )
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
                        v-if="
                            serviceDurationLabel(
                                selectedService
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
                                    selectedService
                                )
                            }}
                        </p>
                    </div>

                    <!-- Self-pay price -->
                    <div
                        v-if="
                            hasSelfPayPrice(
                                selectedService
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
                                    selectedService
                                )
                            }}
                            €
                        </p>
                    </div>
                </div>

                <!-- Important information -->
                <div
                    v-if="
                        serviceInformationItems(
                            selectedService
                        ).length
                    "
                    class="
                        mt-10
                        border-t
                        border-green/15
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
                                serviceInformationItems(
                                    selectedService
                                )
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

                                <span
                                    v-if="
                                        item.isActive ===
                                        false
                                    "
                                    class="
                                        text-green/45
                                    "
                                >
                                    (neaktívne)
                                </span>
                            </p>
                        </li>
                    </ul>
                </div>

                <!-- Steps -->
                <div
                    v-if="
                        serviceSteps(
                            selectedService
                        ).length
                    "
                    class="
                        mt-10
                        border-t
                        border-green/15
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

                    <ol
                        class="
                            mt-5
                            space-y-4
                        "
                    >
                        <li
                            v-for="
                                step in
                                serviceSteps(
                                    selectedService
                                )
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
                        </li>
                    </ol>
                </div>

                <!-- Files -->
                <div
                    v-if="
                        serviceFiles(
                            selectedService
                        ).length
                    "
                    class="
                        mt-10
                        border-t
                        border-green/15
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
                            sm:grid-cols-2
                        "
                    >
                        <component
                            v-for="
                                file in
                                serviceFiles(
                                    selectedService
                                )
                            "
                            :key="
                                `file-${file.id}`
                            "
                            :is="
                                serviceFileUrl(
                                    file
                                )
                                    ? 'a'
                                    : 'div'
                            "
                            v-bind="
                                serviceFileCardProps(
                                    file
                                )
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
                            <!-- File icon -->
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

                            <!-- File info -->
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
                </div>
            </div>
        </BottomSheet>

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
                        <!-- Main text -->
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
                                    text-regular
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

                        <!-- Contact -->
                        <div
                            v-if="
                                selectedEmployee.phone ||
                                selectedEmployee.email
                            "
                            class="
                                mt-8
                                border-t
                                border-green/15
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
                                Kontakt
                            </h3>

                            <div
                                class="
                                    mt-5
                                    grid
                                    gap-3
                                "
                            >
                                <!-- Phone -->
                                <a
                                    v-if="
                                        selectedEmployee.phone
                                    "
                                    :href="
                                        employeePhoneHref(
                                            selectedEmployee
                                        )
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
                                                bi-telephone
                                            "
                                            aria-hidden="true"
                                        />
                                    </div>

                                    <div
                                        class="
                                            min-w-0
                                            flex-1
                                        "
                                    >
                                        <p
                                            class="
                                                text-regular
                                                text-sm
                                                text-green/55
                                            "
                                        >
                                            Telefón
                                        </p>

                                        <p
                                            class="
                                                text-regular
                                                mt-0.5
                                                truncate
                                                font-bold
                                                text-green
                                            "
                                        >
                                            {{
                                                selectedEmployee.phone
                                            }}
                                        </p>
                                    </div>

                                    <div
                                        class="
                                            flex
                                            size-8
                                            shrink-0
                                            items-center
                                            justify-center
                                            rounded-full
                                            text-green/60
                                            transition-all
                                            duration-200
                                            group-hover:bg-green
                                            group-hover:text-baige
                                        "
                                    >
                                        <i
                                            class="
                                                bi
                                                bi-arrow-up-right
                                                text-sm
                                            "
                                            aria-hidden="true"
                                        />
                                    </div>
                                </a>

                                <!-- Email -->
                                <a
                                    v-if="
                                        selectedEmployee.email
                                    "
                                    :href="
                                        employeeEmailHref(
                                            selectedEmployee
                                        )
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
                                                bi-envelope
                                            "
                                            aria-hidden="true"
                                        />
                                    </div>

                                    <div
                                        class="
                                            min-w-0
                                            flex-1
                                        "
                                    >
                                        <p
                                            class="
                                                text-regular
                                                text-sm
                                                text-green/55
                                            "
                                        >
                                            E-mail
                                        </p>

                                        <p
                                            class="
                                                text-regular
                                                mt-0.5
                                                truncate
                                                font-bold
                                                text-green
                                            "
                                        >
                                            {{
                                                selectedEmployee.email
                                            }}
                                        </p>
                                    </div>

                                    <div
                                        class="
                                            flex
                                            size-8
                                            shrink-0
                                            items-center
                                            justify-center
                                            rounded-full
                                            text-green/60
                                            transition-all
                                            duration-200
                                            group-hover:bg-green
                                            group-hover:text-baige
                                        "
                                    >
                                        <i
                                            class="
                                                bi
                                                bi-arrow-up-right
                                                text-sm
                                            "
                                            aria-hidden="true"
                                        />
                                    </div>
                                </a>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div
                            v-if="
                                selectedEmployee.phone ||
                                selectedEmployee.email
                            "
                            class="
                                mt-8
                                flex
                                flex-wrap
                                gap-3
                            "
                        >
                            <Button
                                v-if="
                                    selectedEmployee.phone
                                "
                                :href="
                                    employeePhoneHref(
                                        selectedEmployee
                                    )
                                "
                                background-image=""
                                background-color="#335940"
                                text-color="#FBF9F3"
                            >
                                Zavolať
                            </Button>

                            <Button
                                v-if="
                                    selectedEmployee.email
                                "
                                :href="
                                    employeeEmailHref(
                                        selectedEmployee
                                    )
                                "
                                background-image=""
                                background-color="#FBF9F3"
                                text-color="#335940"
                            >
                                Napísať e-mail
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </BottomSheet>
    </div>
</template>