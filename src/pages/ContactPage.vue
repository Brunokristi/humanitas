<script setup>
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    reactive,
    ref,
    watch
} from 'vue';

import {
    useClinviaPublicSite
} from '../composables/useClinviaPublicSite';
import { usePageSeo } from '../composables/usePageSeo';

import {
    useScrollMotion
} from '../composables/useScrollMotion';

import Button from '../components/Button.vue';

const props = defineProps({
    expanded: {
        type: Boolean,
        default: false
    },

    transitioning: {
        type: Boolean,
        default: false
    }
});

const {
    data,
    loading,
    error,
    load
} = useClinviaPublicSite();

const scrollMotionEnabled = computed(() => {
    return (
        props.expanded &&
        !props.transitioning
    );
});

const {
    motionRoot
} = useScrollMotion({
    enabled:
        scrollMotionEnabled,

    disableOnCoarsePointer:
        false
});

usePageSeo({
    pageKey: 'contact',
    breadcrumbs: [
        {
            name: 'Domov',
            url: 'https://klinickapsychologiars.sk/'
        },
        {
            name: 'Kontakt',
            url: 'https://klinickapsychologiars.sk/kontakt'
        }
    ]
});

/*
 * Form
 */

const form = reactive({
    sender_name: '',
    sender_email: '',
    sender_phone: '',
    body: '',

    /*
     * Honeypot.
     *
     * Real users never see this field.
     */
    website: '',

    /*
     * Used for basic bot timing protection.
     */
    form_started_at:
        Math.floor(
            Date.now() / 1000
        )
});

const formErrors = reactive({
    sender_name: null,
    sender_email: null,
    sender_phone: null,
    body: null
});

const isSubmitting =
    ref(false);

const submittedSuccessfully =
    ref(false);

const submitError =
    ref(null);

const messageTextarea =
    ref(null);

/*
 * One persistent loader object.
 *
 * It remains mounted in the same fixed slot while its SVG
 * state changes from loading to success.
 */

const statusLoaderObject =
    ref(null);

const showStatusPanel = computed(() => {
    return (
        isSubmitting.value ||
        submittedSuccessfully.value
    );
});

const statusLoaderState = computed(() => {
    return submittedSuccessfully.value
        ? 'success'
        : 'loading';
});

/*
 * Phone formatting
 *
 * Numbers without a country code are treated as
 * Slovak numbers and automatically receive +421.
 */

const PHONE_SETTINGS = Object.freeze({
    defaultCountryCode: '421',
    example: '+421 900 123 456',
    minimumDigits: 8,
    maximumDigits: 15
});

const TWO_DIGIT_COUNTRY_CODES =
    new Set([
        '20',
        '27',
        '30',
        '31',
        '32',
        '33',
        '34',
        '36',
        '39',
        '40',
        '41',
        '43',
        '44',
        '45',
        '46',
        '47',
        '48',
        '49',
        '51',
        '52',
        '53',
        '54',
        '55',
        '56',
        '57',
        '58',
        '60',
        '61',
        '62',
        '63',
        '64',
        '65',
        '66',
        '81',
        '82',
        '84',
        '86',
        '90',
        '91',
        '92',
        '93',
        '94',
        '95',
        '98'
    ]);

/*
 * API data
 */

const apiData = computed(() => {
    return data.value ?? null;
});

const branch = computed(() => {
    return (
        apiData.value?.branch ??
        null
    );
});

const company = computed(() => {
    return (
        apiData.value?.company ??
        null
    );
});

/*
 * Address and maps
 */

const GOOGLE_MAPS_ADDRESS =
    'Hviezdoslavova 440/8, 979 01 Rimavská Sobota';

const GOOGLE_MAPS_SHARED_URL =
    'https://maps.app.goo.gl/ZiLiSj7zcNqTfon48';

const googleMapsQuery =
    computed(() => {
        return GOOGLE_MAPS_ADDRESS;
    });

const googleMapsUrl =
    computed(() => {
        return GOOGLE_MAPS_SHARED_URL;
    });

const googleMapsEmbedUrl =
    computed(() => {
        return (
            'https://www.google.com/maps?' +
            'q=' +
            encodeURIComponent(
                googleMapsQuery.value
            ) +
            '&z=17&output=embed'
        );
    });


const shouldRenderInteractiveMap =
    computed(() => {
        return (
            props.expanded &&
            !props.transitioning
        );
    });

/*
 * Contacts
 */

const contacts = computed(() => {
    const providedContacts =
        branch.value?.contacts ??
        [];

    const result =
        providedContacts.filter(
            (contact) => {
                return (
                    contact.type !==
                    'website'
                );
            }
        );

    if (!result.length) {
        if (
            branch.value?.phone
        ) {
            result.push({
                type: 'phone',
                label: 'Telefón',
                value:
                    branch.value.phone
            });
        }

        const bookingPhone =
            branch.value
                ?.bookingPhone ??
            branch.value
                ?.booking_phone;

        if (bookingPhone) {
            result.push({
                type:
                    'booking_phone',

                label:
                    'Telefón na objednanie',

                value:
                    bookingPhone
            });
        }

        if (
            branch.value?.email
        ) {
            result.push({
                type: 'email',
                label: 'E-mail',
                value:
                    branch.value.email
            });
        }
    }

    result.push({
        type: 'address',
        label: 'Adresa',
        value:
            GOOGLE_MAPS_ADDRESS
    });

    return result;
});


/*
 * Contact endpoint
 */

const contactMessageUrl =
    '/api/contact.php';

/*
 * Contact helpers
 */

function contactLabel(contact) {
    if (contact.label) {
        return contact.label;
    }

    return {
        email:
            'E-mail',

        phone:
            'Telefón',

        booking_phone:
            'Telefón na objednanie',

        address:
            'Adresa',

        facebook:
            'Facebook',

        instagram:
            'Instagram'
    }[contact.type] ??
        'Kontakt';
}

function contactIcon(contact) {
    return {
        email:
            'bi-envelope',

        phone:
            'bi-telephone',

        booking_phone:
            'bi-calendar-check',

        address:
            'bi-geo-alt',

        facebook:
            'bi-facebook',

        instagram:
            'bi-instagram'
    }[contact.type] ??
        'bi-arrow-up-right';
}

function contactHref(contact) {
    if (!contact?.value) {
        return null;
    }

    if (
        contact.type ===
        'email'
    ) {
        return (
            `mailto:${contact.value}`
        );
    }

    if (
        contact.type ===
            'phone' ||
        contact.type ===
            'booking_phone'
    ) {
        return (
            `tel:${contact.value.replace(
                /[^\d+]/g,
                ''
            )}`
        );
    }

    if (
        contact.type ===
        'address'
    ) {
        return (
            googleMapsUrl.value
        );
    }

    if (
        contact.type ===
            'facebook' ||
        contact.type ===
            'instagram'
    ) {
        return normalizeUrl(
            contact.value
        );
    }

    return null;
}

function normalizeUrl(url) {
    if (!url) {
        return null;
    }

    if (
        /^https?:\/\//i.test(
            url
        ) ||
        url.startsWith('/')
    ) {
        return url;
    }

    return `https://${url}`;
}

function isExternalUrl(url) {
    return /^https?:\/\//i.test(
        url
    );
}

function linkAttrs(url) {
    if (
        !url ||
        !isExternalUrl(url)
    ) {
        return {};
    }

    return {
        target: '_blank',
        rel: 'noopener noreferrer'
    };
}

/*
 * Animated message suggestion
 */

const messageFocused =
    ref(false);

const messageSuggestionText =
    ref('');

const messageSuggestionIndex =
    ref(0);

const messageSuggestionDeleting =
    ref(false);

let messageSuggestionTimer =
    null;

const messageSuggestions = [
    'Chcel/a by som sa objednať na vyšetrenie.',
    'Chcel/a by som sa informovať o vašich službách.',
    'Potrebujem poradiť s výberom vhodnej služby.',
    'Chcel/a by som sa opýtať na voľný termín.',
    'Mám otázku ohľadom psychologického vyšetrenia.'
];

const showMessageSuggestion = computed(() => {
    return (
        !form.body &&
        !messageFocused.value
    );
});

function stopMessageSuggestionAnimation() {
    if (
        messageSuggestionTimer ===
        null
    ) {
        return;
    }

    window.clearTimeout(
        messageSuggestionTimer
    );

    messageSuggestionTimer =
        null;
}

function scheduleMessageSuggestionTick(
    delay
) {
    stopMessageSuggestionAnimation();

    messageSuggestionTimer =
        window.setTimeout(() => {
            animateMessageSuggestion();
        }, delay);
}

function animateMessageSuggestion() {
    if (
        messageFocused.value ||
        form.body
    ) {
        return;
    }

    const target =
        messageSuggestions[
            messageSuggestionIndex.value
        ];

    if (
        !messageSuggestionDeleting.value
    ) {
        if (
            messageSuggestionText.value.length <
            target.length
        ) {
            messageSuggestionText.value =
                target.slice(
                    0,
                    messageSuggestionText.value.length +
                        1
                );

            scheduleMessageSuggestionTick(
                45 +
                Math.random() *
                    45
            );

            return;
        }

        messageSuggestionDeleting.value =
            true;

        scheduleMessageSuggestionTick(
            2200
        );

        return;
    }

    if (
        messageSuggestionText.value.length >
        0
    ) {
        messageSuggestionText.value =
            messageSuggestionText.value.slice(
                0,
                -1
            );

        scheduleMessageSuggestionTick(
            20 +
                Math.random() *
                    25
        );

        return;
    }

    messageSuggestionDeleting.value =
        false;

    messageSuggestionIndex.value =
        (
            messageSuggestionIndex.value +
            1
        ) %
        messageSuggestions.length;

    scheduleMessageSuggestionTick(
        450
    );
}

function startMessageSuggestionAnimation() {
    if (
        messageFocused.value ||
        form.body ||
        messageSuggestionTimer
    ) {
        return;
    }

    scheduleMessageSuggestionTick(
        700
    );
}

function resetMessageSuggestionAnimation() {
    stopMessageSuggestionAnimation();

    messageSuggestionText.value =
        '';

    messageSuggestionDeleting.value =
        false;

    messageFocused.value =
        false;

    startMessageSuggestionAnimation();
}

function handleMessageFocus() {
    messageFocused.value =
        true;

    stopMessageSuggestionAnimation();
}

function handleMessageBlur() {
    messageFocused.value =
        false;

    if (!form.body) {
        startMessageSuggestionAnimation();
    }
}

function sendAnotherMessage() {
    submittedSuccessfully.value =
        false;

    form.form_started_at =
        Math.floor(
            Date.now() / 1000
        );

    resetMessageSuggestionAnimation();
}

function setLoaderObjectState(
    objectElement,
    state
) {
    if (!objectElement) {
        return;
    }

    const validStates = [
        'loading',
        'success',
        'error'
    ];

    const nextState =
        validStates.includes(state)
            ? state
            : 'loading';

    try {
        const svgRoot =
            objectElement
                .contentDocument
                ?.documentElement;

        if (!svgRoot) {
            return;
        }

        svgRoot.dataset.state =
            nextState;

        svgRoot.dispatchEvent(
            new CustomEvent(
                'loader-state',
                {
                    detail:
                        nextState
                }
            )
        );
    } catch {
        // Ignore cross-document access errors.
    }
}

function updateStatusLoaderState() {
    setLoaderObjectState(
        statusLoaderObject.value,
        statusLoaderState.value
    );
}

function handleStatusLoaderReady() {
    updateStatusLoaderState();
}


function contactCardBaseRotation(index) {
    const rotations = [
        -1.4,
        1.15,
        -0.9,
        1.35,
        -1.1,
        0.85
    ];

    return rotations[
        index % rotations.length
    ];
}

function resizeMessageTextarea() {
    const textarea =
        messageTextarea.value;

    if (!textarea) {
        return;
    }

    textarea.style.height =
        'auto';

    textarea.style.height =
        `${textarea.scrollHeight}px`;
}

function resetMessageTextarea() {
    window.requestAnimationFrame(
        () => {
            const textarea =
                messageTextarea.value;

            if (!textarea) {
                return;
            }

            textarea.style.height =
                'auto';
        }
    );
}

/*
 * Phone helpers
 */

function phoneDigits(value) {
    return String(
        value ?? ''
    ).replace(
        /\D/g,
        ''
    );
}

function normalizePhoneDigits(value) {
    const rawValue =
        String(
            value ?? ''
        ).trim();

    let digits =
        phoneDigits(
            rawValue
        );

    if (!digits) {
        return '';
    }

    if (
        rawValue.startsWith(
            '00'
        )
    ) {
        digits =
            digits.slice(
                2
            );
    } else if (
        rawValue.startsWith(
            '+'
        )
    ) {
        /*
         * The country code is already present.
         */
    } else if (
        digits.startsWith(
            PHONE_SETTINGS
                .defaultCountryCode
        )
    ) {
        /*
         * The user entered 421 without the plus.
         */
    } else if (
        digits.startsWith(
            '0'
        )
    ) {
        digits =
            PHONE_SETTINGS
                .defaultCountryCode +
            digits.slice(
                1
            );
    } else {
        digits =
            PHONE_SETTINGS
                .defaultCountryCode +
            digits;
    }

    return digits.slice(
        0,
        PHONE_SETTINGS.maximumDigits
    );
}

function phoneCountryCodeLength(
    digits
) {
    if (!digits) {
        return 0;
    }

    if (
        digits.startsWith(
            '1'
        ) ||
        digits.startsWith(
            '7'
        )
    ) {
        return 1;
    }

    if (
        TWO_DIGIT_COUNTRY_CODES.has(
            digits.slice(
                0,
                2
            )
        )
    ) {
        return Math.min(
            2,
            digits.length
        );
    }

    return Math.min(
        3,
        digits.length
    );
}

function formatPhoneNumber(value) {
    const digits =
        normalizePhoneDigits(
            value
        );

    if (!digits) {
        return '';
    }

    const countryCodeLength =
        phoneCountryCodeLength(
            digits
        );

    const countryCode =
        digits.slice(
            0,
            countryCodeLength
        );

    const nationalNumber =
        digits.slice(
            countryCodeLength
        );

    const nationalGroups =
        nationalNumber.match(
            /.{1,3}/g
        ) ?? [];

    return (
        `+${countryCode}` +
        (
            nationalGroups.length
                ? ` ${nationalGroups.join(
                    ' '
                )}`
                : ''
        )
    );
}

function normalizePhoneForSubmission(
    value
) {
    const digits =
        normalizePhoneDigits(
            value
        );

    return digits
        ? `+${digits}`
        : '';
}

function handlePhoneInput(event) {
    form.sender_phone =
        formatPhoneNumber(
            event.target.value
        );

    formErrors.sender_phone =
        null;
}

function handlePhoneBlur() {
    form.sender_phone =
        formatPhoneNumber(
            form.sender_phone
        );
}

function validatePhoneNumber() {
    const normalizedPhone =
        normalizePhoneForSubmission(
            form.sender_phone
        );

    const digits =
        phoneDigits(
            normalizedPhone
        );

    if (
        digits.length <
            PHONE_SETTINGS.minimumDigits ||
        digits.length >
            PHONE_SETTINGS.maximumDigits
    ) {
        formErrors.sender_phone =
            `Zadajte číslo v medzinárodnom formáte, napr. ${PHONE_SETTINGS.example}.`;

        return null;
    }

    form.sender_phone =
        formatPhoneNumber(
            normalizedPhone
        );

    return normalizedPhone;
}

/*
 * Form helpers
 */

function resetFormErrors() {
    Object.keys(
        formErrors
    ).forEach((key) => {
        formErrors[key] =
            null;
    });
}

function resetForm() {
    form.sender_name =
        '';

    form.sender_email =
        '';

    form.sender_phone =
        '';

    form.body =
        '';

    form.website =
        '';

    form.form_started_at =
        Math.floor(
            Date.now() / 1000
        );

    resetMessageTextarea();
}

function applyValidationErrors(
    errors
) {
    Object.keys(
        formErrors
    ).forEach((key) => {
        const value =
            errors?.[key];

        formErrors[key] =
            Array.isArray(value)
                ? value[0]
                : value ?? null;
    });
}

async function submit() {
    resetFormErrors();

    submitError.value =
        null;

    const normalizedPhone =
        validatePhoneNumber();

    if (!normalizedPhone) {
        return;
    }

    isSubmitting.value =
        true;

    try {
        const response =
            await fetch(
                contactMessageUrl,
                {
                    method:
                        'POST',

                    headers: {
                        Accept:
                            'application/json',

                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify({
                            sender_name:
                                form.sender_name,

                            sender_email:
                                form.sender_email,

                            sender_phone:
                                normalizedPhone,

                            body:
                                form.body,

                            website:
                                form.website,

                            form_started_at:
                                form.form_started_at
                        })
                }
            );

        const responseData =
            await response
                .json()
                .catch(
                    () => ({})
                );

        if (
            response.status ===
            422
        ) {
            applyValidationErrors(
                responseData.errors ??
                {}
            );

            return;
        }

        if (
            response.status ===
            429
        ) {
            throw new Error(
                responseData.message ??
                'Odoslali ste príliš veľa správ. Skúste to neskôr.'
            );
        }

        if (
            !response.ok
        ) {
            throw new Error(
                responseData.message ??
                'Správu sa nepodarilo odoslať.'
            );
        }

        submittedSuccessfully.value =
            true;

        stopMessageSuggestionAnimation();

        messageFocused.value =
            false;

        resetForm();
    } catch (requestError) {
        submitError.value =
            requestError instanceof
            Error
                ? requestError.message
                : 'Správu sa nepodarilo odoslať.';
    } finally {
        isSubmitting.value =
            false;
    }
}

/*
 * Lifecycle
 */

watch(
    statusLoaderState,
    async () => {
        await nextTick();

        updateStatusLoaderState();
    }
);

watch(
    [
        () => props.expanded,
        () => props.transitioning
    ],
    () => {
        stopMessageSuggestionAnimation();

        if (
            props.expanded &&
            !props.transitioning
        ) {
            startMessageSuggestionAnimation();
        }
    }
);

onMounted(() => {
    form.form_started_at =
        Math.floor(
            Date.now() / 1000
        );

    if (
        props.expanded &&
        !props.transitioning
    ) {
        startMessageSuggestionAnimation();
    }
});

onBeforeUnmount(() => {
    stopMessageSuggestionAnimation();
});
</script>

<template>
    <div
        ref="motionRoot"
        class="
            relative
            min-h-full
            bg-green
            text-baige
        "
    >
        <main
            class="
                mx-auto
                w-full
                px-5
                pb-20
                py-12

                lg:px-15
                lg:pb-28
                lg:pt-12
            "
        >
            <!-- Two-column contact layout -->
            <section
                class="
                    mx-auto
                    grid
                    w-full
                    max-w-6xl
                    grid-cols-1
                    items-start
                    space-y-32
                    
                    lg:mt-16
                    lg:grid-cols-2
                    lg:gap-20

                "
            >
                <!-- Column 1: Contact form -->
                <section>
                    <div
                        class="
                            text-center
                            mb-7
                        "
                    >
                        <h2
                            class="
                                text-xl
                                font-bold
                                text-baige
                            "
                        >
                            Ozvite sa nám
                        </h2>

                        <p
                            class="
                                text-regular
                                mt-2
                                text-sm
                                text-baige/60
                            "
                        >
                            Máte otázky alebo sa chcete objednať?
                            Vyplňte formulár a my sa vám ozveme.
                        </p>
                    </div>

                    <div
                        class="
                            scroll-motion
                        "
                        :data-scroll-motion="
                            scrollMotionEnabled
                                ? ''
                                : undefined
                        "
                        :data-motion-seed="
                            scrollMotionEnabled
                                ? 1
                                : undefined
                        "
                        :data-base-rotation="
                            scrollMotionEnabled
                                ? -1.25
                                : undefined
                        "
                        :data-rotation-mode="
                            scrollMotionEnabled
                                ? 'offset'
                                : undefined
                        "
                        :data-motion-strength="
                            scrollMotionEnabled
                                ? 1
                                : undefined
                        "
                        :data-straighten-strength="
                            scrollMotionEnabled
                                ? 0.97
                                : undefined
                        "
                        :data-max-y="
                            scrollMotionEnabled
                                ? 12
                                : undefined
                        "
                        :data-max-scale="
                            scrollMotionEnabled
                                ? 0.004
                                : undefined
                        "
                    >
                        <div
                            class="
                                relative
                                min-h-[34rem]
                                min-w-0
                                overflow-hidden
                                rounded-[40px]
                                bg-baige
                                text-green
                                shadow-[var(--shadow-mid)]
    
                                transition-[box-shadow,transform]
                                duration-300
                                ease-[cubic-bezier(0.22,1,0.36,1)]
    
                                hover:-translate-y-[1px]
                                hover:shadow-[0_22px_48px_rgba(0,0,0,0.12)]
                            "
                        >
                                <form
                                    class="
                                        relative
                                        min-h-[34rem]
    
                                        transition-opacity
                                        duration-300
                                        ease-[cubic-bezier(0.22,1,0.36,1)]
                                    "
                                    :class="
                                        showStatusPanel
                                            ? 'pointer-events-none opacity-0'
                                            : 'opacity-100'
                                    "
                                    :aria-hidden="
                                        showStatusPanel
                                    "
                                    :inert="
                                        showStatusPanel
                                            ? ''
                                            : undefined
                                    "
                                    :aria-busy="
                                        isSubmitting
                                    "
                                    @submit.prevent="
                                        submit
                                    "
                                >
                                    <!-- Honeypot -->
                                    <div
                                        class="
                                            pointer-events-none
                                            absolute
                                            left-[-9999px]
                                            top-[-9999px]
                                            h-px
                                            w-px
                                            overflow-hidden
                                            opacity-0
                                        "
                                        aria-hidden="true"
                                    >
                                        <label
                                            for="contact-website"
                                        >
                                            Webová stránka
                                        </label>
    
                                        <input
                                            id="contact-website"
                                            v-model="
                                                form.website
                                            "
                                            type="text"
                                            name="website"
                                            tabindex="-1"
                                            autocomplete="off"
                                        >
                                    </div>
    
                                    <!-- Name -->
                                    <div
                                        class="
                                            flex
                                            flex-col
                                            px-6
                                            pb-3
                                            pt-5
                                            gap-2
                                        "
                                    >
                                        <label
                                            for="contact-name"
                                            class="
                                                text-regular
                                                block
                                                font-bold
                                                tracking-[0.1em]
                                            "
                                        >
                                            Meno
                                        </label>
    
                                        <input
                                            id="contact-name"
                                            v-model="
                                                form.sender_name
                                            "
                                            type="text"
                                            autocomplete="name"
                                            placeholder="Vaše meno"
                                            required
                                            class="
                                                text-regular
                                                mt-1.5
                                                w-full
                                                border-0
                                                bg-transparent
                                                p-0
                                                text-base
                                                font-bold
                                                text-green
                                                outline-none
                                                placeholder:font-normal
                                                placeholder:text-green/30
                                                focus:ring-0
                                            "
                                            :aria-invalid="
                                                Boolean(
                                                    formErrors.sender_name
                                                )
                                            "
                                        >
    
                                        <p
                                            v-if="
                                                formErrors.sender_name
                                            "
                                            class="
                                                text-regular
                                                mt-2
                                                text-sm
                                                text-red-700
                                            "
                                        >
                                            {{
                                                formErrors.sender_name
                                            }}
                                        </p>
                                    </div>
    
                                    <!-- Email -->
                                    <div
                                        class="
                                            border-t
                                            border-green/10
                                            flex
                                            flex-col
                                            px-6
                                            pb-3
                                            pt-5
                                            gap-2
                                        "
                                    >
                                        <label
                                            for="contact-email"
                                            class="
                                                text-regular
                                                block
                                                font-bold
                                                tracking-[0.1em]
                                            "
                                        >
                                            E-mail
                                        </label>
    
                                        <input
                                            id="contact-email"
                                            v-model="
                                                form.sender_email
                                            "
                                            type="email"
                                            autocomplete="email"
                                            placeholder="vas@email.sk"
                                            required
                                            class="
                                                text-regular
                                                mt-1.5
                                                w-full
                                                border-0
                                                bg-transparent
                                                p-0
                                                text-base
                                                font-bold
                                                text-green
                                                outline-none
                                                placeholder:font-normal
                                                placeholder:text-green/30
                                                focus:ring-0
                                            "
                                            :aria-invalid="
                                                Boolean(
                                                    formErrors.sender_email
                                                )
                                            "
                                        >
    
                                        <p
                                            v-if="
                                                formErrors.sender_email
                                            "
                                            class="
                                                text-regular
                                                mt-2
                                                text-sm
                                                text-red-700
                                            "
                                        >
                                            {{
                                                formErrors.sender_email
                                            }}
                                        </p>
                                    </div>
    
                                    <!-- Phone -->
                                    <div
                                        class="
                                            border-t
                                            border-green/10
                                            flex
                                            flex-col
                                            px-6
                                            pb-3
                                            pt-5
                                            gap-2
                                        "
                                    >
                                        <label
                                            for="contact-phone"
                                            class="
                                                text-regular
                                                block
                                                font-bold
                                                tracking-[0.1em]
                                            "
                                        >
                                            Telefón
                                        </label>
    
                                        <input
                                            id="contact-phone"
                                            :value="
                                                form.sender_phone
                                            "
                                            type="tel"
                                            inputmode="tel"
                                            autocomplete="tel"
                                            :placeholder="
                                                PHONE_SETTINGS.example
                                            "
                                            maxlength="24"
                                            required
                                            class="
                                                text-regular
                                                mt-1.5
                                                w-full
                                                border-0
                                                bg-transparent
                                                p-0
                                                text-base
                                                font-bold
                                                text-green
                                                outline-none
                                                placeholder:font-normal
                                                placeholder:text-green/30
                                                focus:ring-0
                                            "
                                            :aria-invalid="
                                                Boolean(
                                                    formErrors.sender_phone
                                                )
                                            "
                                            aria-describedby="
                                                contact-phone-hint
                                            "
                                            @input="
                                                handlePhoneInput
                                            "
                                            @blur="
                                                handlePhoneBlur
                                            "
                                        >
    
                                        <p
                                            v-if="
                                                formErrors.sender_phone
                                            "
                                            id="contact-phone-hint"
                                            class="
                                                text-regular
                                                mt-2
                                                text-sm
                                                text-red-700
                                            "
                                        >
                                            {{
                                                formErrors.sender_phone
                                            }}
                                        </p>
                                    </div>
    
                                    <!-- Message -->
                                    <div
                                        class="
                                            border-t
                                            border-green/10
                                            flex
                                            flex-col
                                            px-6
                                            pb-3
                                            pt-5
                                            gap-2
                                        "
                                    >
                                        <label
                                            for="contact-message"
                                            class="
                                                text-regular
                                                block
                                                font-bold
                                                tracking-[0.1em]
                                            "
                                        >
                                            Správa
                                        </label>
    
                                        <div
                                            class="
                                                relative
                                                mt-2
                                            "
                                        >
                                            <div
                                                v-if="
                                                    showMessageSuggestion
                                                "
                                                class="
                                                    pointer-events-none
                                                    absolute
                                                    inset-0
                                                    z-10
                                                    overflow-hidden
                                                "
                                            >
                                                <span
                                                    class="
                                                        text-regular
                                                        whitespace-pre-wrap
                                                        text-base
                                                        leading-[1.6]
                                                        text-green/30
                                                    "
                                                >
                                                    {{ messageSuggestionText
                                                    }}<span
                                                        class="
                                                            ml-[1px]
                                                            inline-block
                                                            h-[1.05em]
                                                            w-px
                                                            translate-y-[0.14em]
                                                            animate-pulse
                                                            bg-green/30
                                                        "
                                                    />
                                                </span>
                                            </div>
    
                                            <textarea
                                                id="contact-message"
                                                ref="messageTextarea"
                                                v-model="form.body"
                                                rows="1"
                                                aria-label="Správa"
                                                required
                                                class="
                                                    text-regular
                                                    relative
                                                    z-0
                                                    min-h-[7rem]
                                                    w-full
                                                    resize-none
                                                    overflow-hidden
                                                    border-0
                                                    bg-transparent
                                                    p-0
                                                    text-base
                                                    leading-[1.6]
                                                    text-green
                                                    outline-none
                                                    focus:ring-0
                                                "
                                                :aria-invalid="
                                                    Boolean(
                                                        formErrors.body
                                                    )
                                                "
                                                @input="
                                                    resizeMessageTextarea
                                                "
                                                @focus="
                                                    handleMessageFocus
                                                "
                                                @blur="
                                                    handleMessageBlur
                                                "
                                            />
                                        </div>
    
                                        <p
                                            v-if="
                                                formErrors.body
                                            "
                                            class="
                                                text-regular
                                                mt-2
                                                text-sm
                                                text-red-700
                                            "
                                        >
                                            {{
                                                formErrors.body
                                            }}
                                        </p>
                                    </div>
    
                                    <!-- Submit error -->
                                    <div
                                        v-if="
                                            submitError
                                        "
                                        class="
                                            px-6
                                            py-4
                                        "
                                    >
                                        <p
                                            class="
                                                text-regular
                                                text-sm
                                                text-red-700
                                            "
                                        >
                                            {{ submitError }}
                                        </p>
                                    </div>
    
                                    <!-- Submit -->
                                    <div
                                        class="
                                            flex
                                            justify-center
                                            px-6
                                            py-6
                                        "
                                    >
                                        <Button
                                            type="submit"
                                            background-image=""
                                            background-color="var(--color-green)"
                                            text-color="var(--color-baige)"
                                            :disabled="
                                                isSubmitting
                                            "
                                        >
                                            {{
                                                isSubmitting
                                                    ? 'Odosielam…'
                                                    : 'Odoslať správu'
                                            }}
                                        </Button>
                                    </div>
                                </form>
    
                                <!-- Persistent loading/success panel -->
                                <div
                                    class="
                                        absolute
                                        inset-0
                                        z-30
                                        flex
                                        min-h-[34rem]
                                        flex-col
                                        items-center
                                        bg-baige
                                        px-6
                                        pt-10
                                        text-center
    
                                        transition-opacity
                                        duration-300
                                        ease-[cubic-bezier(0.22,1,0.36,1)]
                                    "
                                    :class="
                                        showStatusPanel
                                            ? 'pointer-events-auto opacity-100'
                                            : 'pointer-events-none opacity-0'
                                    "
                                    :aria-hidden="
                                        !showStatusPanel
                                    "
                                >
                                    <!-- Fixed loader slot: it never moves -->
                                    <div
                                        class="
                                            pointer-events-none
                                            flex
                                            h-[9rem]
                                            w-[clamp(8rem,18vw,12rem)]
                                            shrink-0
                                            items-center
                                            justify-center
                                        "
                                    >
                                        <object
                                            ref="statusLoaderObject"
                                            data="/humanitas_loader_states.svg"
                                            type="image/svg+xml"
                                            :aria-label="
                                                submittedSuccessfully
                                                    ? 'Správa odoslaná'
                                                    : 'Odosielanie správy'
                                            "
                                            class="
                                                h-auto
                                                w-full
                                            "
                                            @load="
                                                handleStatusLoaderReady
                                            "
                                        >
                                            Humanitas
                                        </object>
                                    </div>
    
                                    <!-- Reserved text area below the fixed loader -->
                                    <div
                                        class="
                                            flex
                                            min-h-[15rem]
                                            w-full
                                            flex-col
                                            items-center
                                            pt-6
                                        "
                                    >
                                        <Transition
                                            name="success-content"
                                        >
                                            <div
                                                v-if="
                                                    submittedSuccessfully
                                                "
                                                class="
                                                    flex
                                                    w-full
                                                    flex-col
                                                    items-center
                                                "
                                            >
                                                <h2
                                                    class="
                                                        text-xl
                                                        font-bold
                                                        text-green
                                                    "
                                                >
                                                    Správa bola odoslaná
                                                </h2>
    
                                                <p
                                                    class="
                                                        text-regular
                                                        mt-3
                                                        max-w-md
                                                        leading-[1.65]
                                                        text-green/60
                                                    "
                                                >
                                                    Ďakujeme za vašu správu.
                                                    Ozveme sa vám čo najskôr.
                                                </p>
    
                                                <div
                                                    class="
                                                        mt-7
                                                    "
                                                >
                                                    <Button
                                                        background-image=""
                                                        background-color="var(--color-green)"
                                                        text-color="var(--color-baige)"
                                                        @click="
                                                            sendAnotherMessage
                                                        "
                                                    >
                                                        Poslať ďalšiu správu
                                                    </Button>
                                                </div>
                                            </div>
                                        </Transition>
                                    </div>
                                </div>
                        </div>
                    </div>
                </section>

                <!-- Column 2: Contacts -->
                <article
                    class="
                        min-w-0
                    "
                >
                    <div
                        class="
                            mb-7
                            text-center
                        "
                    >
                        <h2
                            class="
                                text-xl
                                font-bold
                                text-baige
                            "
                        >
                            Kontaktné údaje
                        </h2>

                        <p
                            class="
                                text-regular
                                mt-2
                                text-sm
                                text-baige/60
                            "
                        >
                            Vyberte si spôsob, ktorý vám vyhovuje.
                        </p>
                    </div>

                    <div
                        v-if="
                            contacts.length
                        "
                        class="
                            flex
                            flex-col
                            gap-4
                        "
                    >
                        <div
                            v-for="
                                (
                                    contact,
                                    index
                                ) in
                                contacts
                            "
                            :key="
                                `${contact.type}-${contact.value}-${index}`
                            "
                            class="
                                scroll-motion
                            "
                            :data-scroll-motion="
                                scrollMotionEnabled
                                    ? ''
                                    : undefined
                            "
                            :data-motion-seed="
                                scrollMotionEnabled
                                    ? index + 2
                                    : undefined
                            "
                            :data-base-rotation="
                                scrollMotionEnabled
                                    ? contactCardBaseRotation(index)
                                    : undefined
                            "
                            :data-rotation-mode="
                                scrollMotionEnabled
                                    ? 'offset'
                                    : undefined
                            "
                            :data-motion-strength="
                                scrollMotionEnabled
                                    ? 1
                                    : undefined
                            "
                            :data-straighten-strength="
                                scrollMotionEnabled
                                    ? 0.97
                                    : undefined
                            "
                            :data-max-y="
                                scrollMotionEnabled
                                    ? 10
                                    : undefined
                            "
                            :data-max-scale="
                                scrollMotionEnabled
                                    ? 0.0035
                                    : undefined
                            "
                        >
                            <component
                                :is="
                                    contact.type ===
                                    'address'
                                        ? 'div'
                                        : contactHref(
                                            contact
                                        )
                                            ? 'a'
                                            : 'div'
                                "
                                :href="
                                    contact.type !==
                                        'address'
                                        ? (
                                            contactHref(
                                                contact
                                            ) ||
                                            undefined
                                        )
                                        : undefined
                                "
                                v-bind="
                                    contact.type !==
                                        'address'
                                        ? linkAttrs(
                                            contactHref(
                                                contact
                                            )
                                        )
                                        : {}
                                "
                                class="
                                    group
                                    relative
                                    flex
                                    min-w-0
                                    gap-4
                                    rounded-[40px]
                                    bg-baige
                                    p-4
                                    text-green
                                    shadow-[var(--shadow-soft)]
    
                                    transition-transform
                                    duration-300
                                    ease-[cubic-bezier(0.22,1,0.36,1)]
    
                                    hover:z-20
                                    hover:-translate-y-[1px]
                                "
                                :class="
                                    contact.type ===
                                    'address'
                                        ? 'flex-col items-stretch'
                                        : 'items-center'
                                "
                            >
                                <div
                                    class="
                                        flex
                                        min-w-0
                                        items-center
                                        gap-4
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
                                            class="bi"
                                            :class="
                                                contactIcon(
                                                    contact
                                                )
                                            "
                                            aria-hidden="true"
                                        />
                                    </div>
    
                                    <p
                                        class="
                                            min-w-0
                                            flex-1
                                        "
                                    >
                                        <span
                                            class="
                                                text-regular
                                                block
                                                text-sm
                                                text-green/50
                                            "
                                        >
                                            {{
                                                contactLabel(
                                                    contact
                                                )
                                            }}
                                        </span>
    
                                        <a
                                            v-if="
                                                contact.type ===
                                                    'address' &&
                                                googleMapsUrl
                                            "
                                            :href="
                                                googleMapsUrl
                                            "
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="
                                                text-regular
                                                mt-0.5
                                                block
                                                break-words
                                                font-bold
                                                text-green
                                                transition-opacity
                                                hover:opacity-60
                                            "
                                        >
                                            {{
                                                contact.value
                                            }}
                                        </a>
    
                                        <span
                                            v-else
                                            class="
                                                text-regular
                                                mt-0.5
                                                block
                                                break-words
                                                font-bold
                                                text-green
                                            "
                                        >
                                            {{
                                                contact.value
                                            }}
                                        </span>
                                    </p>
                                </div>
    
                                <div
                                    v-if="
                                        contact.type ===
                                            'address' &&
                                        googleMapsEmbedUrl
                                    "
                                    class="
                                        mt-1
                                        overflow-hidden
                                        rounded-[28px]
                                        bg-green/10
                                    "
                                >
                                                                    <iframe
                                    v-if="
                                        shouldRenderInteractiveMap
                                    "
                                    :src="
                                        googleMapsEmbedUrl
                                    "
                                    :title="
                                        `Mapa adresy ${contact.value}`
                                    "
                                    class="
                                        block
                                        h-64
                                        w-full
                                        border-0

                                        lg:h-72
                                    "
                                    loading="lazy"
                                    allowfullscreen
                                    referrerpolicy="no-referrer-when-downgrade"
                                />

                                <div
                                    v-else
                                    class="
                                        flex
                                        h-64
                                        w-full
                                        items-center
                                        justify-center
                                        bg-green/5
                                        text-green/35

                                        lg:h-72
                                    "
                                    aria-hidden="true"
                                >
                                    <i
                                        class="
                                            bi
                                            bi-geo-alt
                                            text-2xl
                                        "
                                    />
                                </div>
                                </div>
                            </component>
                        </div>
                    </div>

                    <p
                        v-else
                        class="
                            text-regular
                            text-center
                            text-baige/50
                        "
                    >
                        Kontaktné údaje zatiaľ
                        nie sú uvedené.
                    </p>
                </article>

            </section>
        </main>
    </div>
</template>

<style scoped>
.success-content-enter-active {
    transition:
        opacity 500ms cubic-bezier(0.22, 1, 0.36, 1),
        transform 650ms cubic-bezier(0.16, 1, 0.3, 1),
        filter 500ms cubic-bezier(0.22, 1, 0.36, 1);
}

.success-content-leave-active {
    transition:
        opacity 220ms ease,
        transform 220ms ease,
        filter 220ms ease;
}

.success-content-enter-from,
.success-content-leave-to {
    opacity: 0;
    filter: blur(5px);
    transform:
        translateY(12px)
        scale(0.98);
}

.success-content-enter-to,
.success-content-leave-from {
    opacity: 1;
    filter: blur(0);
    transform:
        translateY(0)
        scale(1);
}

@media (
    prefers-reduced-motion:
    reduce
) {
    .success-content-enter-active,
    .success-content-leave-active {
        transition-duration: 1ms;
    }
}
</style>