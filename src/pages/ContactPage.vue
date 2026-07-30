<script setup>
import {
    computed,
    onBeforeUnmount,
    onMounted,
    reactive,
    ref
} from 'vue';

import {
    useClinviaPublicSite
} from '../composables/useClinviaPublicSite';

import Button from '../components/Button.vue';

defineProps({
    expanded: {
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

/*
 * Form
 */

const form = reactive({
    sender_name: '',
    sender_email: '',
    sender_phone: '',
    body: ''
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

const publicSite = computed(() => {
    return (
        apiData.value?.publicSite ??
        apiData.value?.public_site ??
        branch.value?.publicSite ??
        branch.value?.public_site ??
        null
    );
});

const branchName = computed(() => {
    return (
        branch.value?.name ??
        company.value?.name ??
        company.value?.legalName ??
        company.value?.legal_name ??
        'Humanitas'
    );
});

/*
 * Address
 */

const branchAddressParts =
    computed(() => {
        const address =
            branch.value?.address;

        if (!address) {
            return [];
        }

        if (
            address.lines?.length
        ) {
            return address.lines;
        }

        const line1 =
            address.line1 ??
            address.line_1;

        const line2 =
            address.line2 ??
            address.line_2;

        const postalCode =
            address.postalCode ??
            address.postal_code;

        return [
            [
                line1,
                line2
            ]
                .filter(Boolean)
                .join(' '),

            [
                postalCode,
                address.city
            ]
                .filter(Boolean)
                .join(' '),

            address.country
        ].filter(Boolean);
    });

const branchAddress = computed(() => {
    return branchAddressParts.value
        .join(', ');
});

const latitude = computed(() => {
    return (
        branch.value
            ?.location
            ?.latitude ??
        branch.value?.latitude ??
        null
    );
});

const longitude = computed(() => {
    return (
        branch.value
            ?.location
            ?.longitude ??
        branch.value?.longitude ??
        null
    );
});

/*
 * Maps
 */

const googleMapsUrl =
    computed(() => {
        if (
            latitude.value !== null &&
            longitude.value !== null
        ) {
            return (
                'https://www.google.com/maps/search/' +
                '?api=1&query=' +
                `${latitude.value},${longitude.value}`
            );
        }

        if (
            branchAddress.value
        ) {
            return (
                'https://www.google.com/maps/search/' +
                '?api=1&query=' +
                encodeURIComponent(
                    branchAddress.value
                )
            );
        }

        return null;
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
                value: branch.value.phone
            });
        }

        const bookingPhone =
            branch.value
                ?.bookingPhone ??
            branch.value
                ?.booking_phone;

        if (bookingPhone) {
            result.push({
                type: 'booking_phone',
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
                value: branch.value.email
            });
        }
    }

    if (
        branchAddress.value
    ) {
        result.push({
            type: 'address',
            label: 'Adresa',
            value: branchAddress.value
        });
    }

    return result;
});

const openingHours = computed(() => {
    return (
        branch.value?.openingHours ??
        branch.value?.opening_hours ??
        []
    );
});

/*
 * Contact form endpoint
 */

const contactMessageUrl =
    computed(() => {
        return (
            apiData.value
                ?.contactMessageUrl ??
            apiData.value
                ?.contact_message_url ??
            publicSite.value
                ?.contactMessageUrl ??
            publicSite.value
                ?.contact_message_url ??
            branch.value
                ?.contactMessageUrl ??
            branch.value
                ?.contact_message_url ??
            null
        );
    });

const csrfToken = computed(() => {
    return (
        document
            .querySelector(
                'meta[name="csrf-token"]'
            )
            ?.getAttribute(
                'content'
            ) ??
        null
    );
});

/*
 * Contact helpers
 */

function contactLabel(contact) {
    if (contact.label) {
        return contact.label;
    }

    return {
        email: 'E-mail',
        phone: 'Telefón',
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

function contactCardBaseRotation(index) {
    const baseRotations = [
        -2,
        1.3,
        -0.7,
        2.2,
        -1.4
    ];

    return baseRotations[
        index %
        baseRotations.length
    ];
}

function physicsCardMotionStyle(
    baseRotation
) {
    return {
        '--card-rest-rotate': `${baseRotation}deg`,
        '--physics-x': '0px'
    };
}

function contactCardMotionStyle(index) {
    return physicsCardMotionStyle(
        contactCardBaseRotation(
            index
        )
    );
}

function formCardMotionStyle() {
    return physicsCardMotionStyle(
        -0.6
    );
}

function contactCardLayout(index) {
    const layouts = [
        'z-[5] mr-5',
        'z-[3] ml-5',
        'z-[6] ml-2 mr-3',
        'z-[2] ml-6 mr-1',
        'z-[4] ml-1 mr-6'
    ];

    return layouts[
        index %
        layouts.length
    ];
}

/*
 * Opening hours
 */

function openingHoursDayLabel(
    entry
) {
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
    }[day] ??
        day ??
        '';
}

function openingHoursLabel(
    entry
) {
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
        entry.intervals ??
        [];

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

            return (
                `${String(opensAt)
                    .slice(0, 5)}` +
                ' – ' +
                `${String(closesAt)
                    .slice(0, 5)}`
            );
        })
        .filter(Boolean)
        .join(', ');
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

    resetMessageSuggestionAnimation();
}

/*
 * Contact card scroll physics
 */

let physicsFrame =
    null;

let lastScrollY =
    0;

let lastScrollTime =
    0;

const cardPhysics =
    new Map();

const cardMotionVariants = [
    {
        offsetImpulse: 0.85,
        rotationImpulse: 0.1,
        restRotationImpulse: 0.03,
        offsetEase: 0.14,
        rotationEase: 0.1,
        restRotationEase: 0.055,
        relaxation: 0.84,
        rotationRelaxation: 0.9,
        restRotationReturn: 0.018,
        maxOffset: 10,
        offsetSpread: 0.72,
        maxRotation: 1.2,
        maxRestRotationDrift: 0.65
    },
    {
        offsetImpulse: 1,
        rotationImpulse: 0.115,
        restRotationImpulse: 0.036,
        offsetEase: 0.12,
        rotationEase: 0.09,
        restRotationEase: 0.05,
        relaxation: 0.82,
        rotationRelaxation: 0.89,
        restRotationReturn: 0.016,
        maxOffset: 12,
        offsetSpread: 1,
        maxRotation: 1.42,
        maxRestRotationDrift: 0.78
    },
    {
        offsetImpulse: 1.12,
        rotationImpulse: 0.13,
        restRotationImpulse: 0.04,
        offsetEase: 0.11,
        rotationEase: 0.085,
        restRotationEase: 0.045,
        relaxation: 0.8,
        rotationRelaxation: 0.885,
        restRotationReturn: 0.014,
        maxOffset: 14,
        offsetSpread: 1.42,
        maxRotation: 1.58,
        maxRestRotationDrift: 0.9
    },
    {
        offsetImpulse: 0.92,
        rotationImpulse: 0.105,
        restRotationImpulse: 0.032,
        offsetEase: 0.145,
        rotationEase: 0.105,
        restRotationEase: 0.058,
        relaxation: 0.85,
        rotationRelaxation: 0.905,
        restRotationReturn: 0.02,
        maxOffset: 11,
        offsetSpread: 0.84,
        maxRotation: 1.24,
        maxRestRotationDrift: 0.7
    },
    {
        offsetImpulse: 1.05,
        rotationImpulse: 0.12,
        restRotationImpulse: 0.038,
        offsetEase: 0.125,
        rotationEase: 0.095,
        restRotationEase: 0.048,
        relaxation: 0.81,
        rotationRelaxation: 0.89,
        restRotationReturn: 0.015,
        maxOffset: 13,
        offsetSpread: 1.22,
        maxRotation: 1.48,
        maxRestRotationDrift: 0.82
    }
];

function getPhysicsState(
    card,
    index
) {
    if (
        cardPhysics.has(
            card
        )
    ) {
        return cardPhysics.get(
            card
        );
    }

    const seed =
        Number.parseInt(
            card.dataset.physicsSeed ??
                `${index}`,
            10
        );

    const variant =
        cardMotionVariants[
            Math.abs(seed) %
            cardMotionVariants.length
        ];

    const baseRotation =
        Number.parseFloat(
            card.dataset.baseRotate ??
                `${contactCardBaseRotation(index)}`
        );

    const state = {
        baseRotation,
        restRotation:
            baseRotation,
        targetRestRotation:
            baseRotation,
        x: 0,
        targetX: 0,
        offset: 0,
        targetOffset: 0,
        rotation: 0,
        targetRotation: 0,
        xDirection:
            Number.parseFloat(
                card.dataset.xDirection ??
                    '0'
            ),
        yDirection:
            Number.parseFloat(
                card.dataset.yDirection ??
                    '1'
            ),
        rotationDirection:
            Number.parseFloat(
                card.dataset.rotationDirection ??
                    '1'
            ),
        motionScale:
            Number.parseFloat(
                card.dataset.motionScale ??
                    '1'
            ),
        rotationScale:
            Number.parseFloat(
                card.dataset.rotationScale ??
                    '1'
            ),
        ...variant
    };

    cardPhysics.set(
        card,
        state
    );

    return state;
}

function applyScrollImpulse(
    scrollVelocity
) {
    const cards =
        document.querySelectorAll(
            '[data-physics-card]'
        );

    cards.forEach(
        (
            card,
            index
        ) => {
            const state =
                getPhysicsState(
                    card,
                    index
                );

            state.targetOffset =
                Math.max(
                    -state.maxOffset,
                    Math.min(
                        state.maxOffset,
                        state.targetOffset +
                            scrollVelocity *
                                state.offsetImpulse *
                                state.yDirection *
                                state.motionScale
                    )
                );

            state.targetX =
                Math.max(
                    -state.maxOffset,
                    Math.min(
                        state.maxOffset,
                        state.targetX +
                            scrollVelocity *
                                state.offsetImpulse *
                                state.xDirection *
                                state.motionScale
                    )
                );

            state.targetRotation =
                Math.max(
                    -state.maxRotation,
                    Math.min(
                        state.maxRotation,
                        state.targetRotation +
                            scrollVelocity *
                                state.rotationImpulse *
                                state.rotationDirection *
                                state.rotationScale
                    )
                );
            state.targetRestRotation =
                Math.max(
                    state.baseRotation -
                        state.maxRestRotationDrift *
                            state.rotationScale,
                    Math.min(
                        state.baseRotation +
                            state.maxRestRotationDrift *
                                state.rotationScale,
                        state.targetRestRotation +
                            scrollVelocity *
                                state.restRotationImpulse *
                                state.rotationScale
                    )
                );
        }
    );

    startPhysicsLoop();
}

function updatePhysics() {
    let stillMoving =
        false;

    document
        .querySelectorAll(
            '[data-physics-card]'
        )
        .forEach(
            (
                card,
                index
            ) => {
                const state =
                    getPhysicsState(
                        card,
                        index
                    );

                state.targetOffset *=
                    state.relaxation;

                state.targetX *=
                    state.relaxation;

                state.targetRotation *=
                    state.rotationRelaxation;

                state.targetRestRotation +=
                    (
                        state.baseRotation -
                        state.targetRestRotation
                    ) *
                    state.restRotationReturn;

                state.offset +=
                    (
                        state.targetOffset -
                        state.offset
                    ) *
                    state.offsetEase;

                state.x +=
                    (
                        state.targetX -
                        state.x
                    ) *
                    state.offsetEase;

                state.rotation +=
                    (
                        state.targetRotation -
                        state.rotation
                    ) *
                    state.rotationEase;

                state.restRotation +=
                    (
                        state.targetRestRotation -
                        state.restRotation
                    ) *
                    state.restRotationEase;

                card.style.setProperty(
                    '--physics-y',
                    `${state.offset * state.offsetSpread}px`
                );

                card.style.setProperty(
                    '--physics-x',
                    `${state.x * state.offsetSpread}px`
                );

                card.style.setProperty(
                    '--card-rest-rotate',
                    `${state.restRotation}deg`
                );

                card.style.setProperty(
                    '--physics-rotate',
                    `${state.rotation}deg`
                );

                if (
                    Math.abs(
                        state.targetOffset
                    ) >
                        0.04 ||
                    Math.abs(
                        state.targetX
                    ) >
                        0.04 ||
                    Math.abs(
                        state.rotation
                    ) >
                        0.04 ||
                    Math.abs(
                        state.x
                    ) >
                        0.04 ||
                    Math.abs(
                        state.offset
                    ) >
                        0.04 ||
                    Math.abs(
                        state.restRotation -
                        state.baseRotation
                    ) >
                        0.02 ||
                    Math.abs(
                        state.targetRotation
                    ) >
                        0.04 ||
                    Math.abs(
                        state.targetRestRotation -
                        state.baseRotation
                    ) >
                        0.02
                ) {
                    stillMoving =
                        true;
                } else {
                    state.offset =
                        0;

                    state.targetOffset =
                        0;

                    state.x =
                        0;

                    state.targetX =
                        0;

                    state.rotation =
                        0;

                    state.targetRotation =
                        0;

                    state.restRotation =
                        state.baseRotation;

                    state.targetRestRotation =
                        state.baseRotation;

                    card.style.setProperty(
                        '--physics-x',
                        '0px'
                    );

                    card.style.setProperty(
                        '--physics-y',
                        '0px'
                    );

                    card.style.setProperty(
                        '--card-rest-rotate',
                        `${state.baseRotation}deg`
                    );

                    card.style.setProperty(
                        '--physics-rotate',
                        '0deg'
                    );
                }
            }
        );

    if (
        stillMoving
    ) {
        physicsFrame =
            window.requestAnimationFrame(
                updatePhysics
            );

        return;
    }

    physicsFrame =
        null;
}

function startPhysicsLoop() {
    if (
        physicsFrame !==
        null
    ) {
        return;
    }

    physicsFrame =
        window.requestAnimationFrame(
            updatePhysics
        );
}

function handlePhysicsScroll() {
    const now =
        performance.now();

    const currentScrollY =
        window.scrollY;

    const scrollDelta =
        currentScrollY -
        lastScrollY;

    const timeDelta =
        Math.max(
            now -
            lastScrollTime,
            16
        );

    let scrollVelocity =
        scrollDelta /
        timeDelta *
        16;

    /*
     * Clamp very fast trackpad
     * or touch scrolls.
     */
    scrollVelocity =
        Math.max(
            -8,
            Math.min(
                8,
                scrollVelocity
            )
        );

    if (
        Math.abs(
            scrollVelocity
        ) >
        0.05
    ) {
        /*
         * Opposite direction creates
         * natural inertia / lag.
         */
        applyScrollImpulse(
            -scrollVelocity
        );
    }

    lastScrollY =
        currentScrollY;

    lastScrollTime =
        now;
}

function startCardPhysics() {
    lastScrollY =
        window.scrollY;

    lastScrollTime =
        performance.now();

    window.addEventListener(
        'scroll',
        handlePhysicsScroll,
        {
            passive: true
        }
    );
}

function stopCardPhysics() {
    window.removeEventListener(
        'scroll',
        handlePhysicsScroll
    );

    if (
        physicsFrame !==
        null
    ) {
        window.cancelAnimationFrame(
            physicsFrame
        );

        physicsFrame =
            null;
    }

    cardPhysics.clear();
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
    if (
        !contactMessageUrl.value
    ) {
        submitError.value =
            'Odosielanie správ zatiaľ nie je nakonfigurované.';

        return;
    }

    resetFormErrors();

    submitError.value =
        null;

    isSubmitting.value =
        true;

    try {
        const headers = {
            Accept:
                'application/json',
            'Content-Type':
                'application/json'
        };

        if (
            csrfToken.value
        ) {
            headers[
                'X-CSRF-TOKEN'
            ] =
                csrfToken.value;
        }

        const response =
            await fetch(
                contactMessageUrl.value,
                {
                    method: 'POST',
                    headers,
                    body:
                        JSON.stringify({
                            sender_name:
                                form.sender_name,
                            sender_email:
                                form.sender_email,
                            sender_phone:
                                form.sender_phone,
                            body:
                                form.body
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

        if (!response.ok) {
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

onMounted(() => {
    startMessageSuggestionAnimation();
    startCardPhysics();
});

onBeforeUnmount(() => {
    stopMessageSuggestionAnimation();
    stopCardPhysics();
});
</script>

<template>
    <div>
        <!-- Loading -->
        <div
            v-if="loading"
            class="
                mx-auto
                w-full
                max-w-7xl
                px-5
                py-10

                lg:px-10

                xl:px-16
            "
        >
            <div
                class="
                    mx-auto
                    max-w-xl
                    space-y-4
                    text-center
                "
            >
                <div
                    class="
                        mx-auto
                        h-10
                        w-56
                        animate-pulse
                        rounded-full
                        bg-baige/10
                    "
                />

                <div
                    class="
                        h-5
                        w-full
                        animate-pulse
                        rounded-full
                        bg-baige/10
                    "
                />
            </div>

            <div
                class="
                    mt-16
                    grid
                    gap-8

                    lg:grid-cols-2
                "
            >
                <div
                    class="
                        h-[34rem]
                        animate-pulse
                        rounded-[3rem]
                        bg-baige/10
                    "
                />

                <div
                    class="
                        h-[34rem]
                        animate-pulse
                        rounded-[3rem]
                        bg-baige/10
                    "
                />
            </div>
        </div>

        <!-- Error -->
        <div
            v-else-if="error"
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
                    text-xl
                    font-bold
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
                    background-image=""
                    background-color="#FBF9F3"
                    text-color="#335940"
                    @click="load"
                >
                    Skúsiť znova
                </Button>
            </div>
        </div>

        <!-- Page -->
        <main
            v-else
            class="
                mx-auto
                w-full
                max-w-[100rem]
                px-5
                pb-20
                pt-5

                lg:px-10
                lg:pb-28
                lg:pt-12

                xl:px-16
            "
        >
            <!-- Hero -->
            <section
                class="
                    flex
                    flex-col
                    items-center
                    text-center

                    lg:items-start
                    lg:text-left
                "
            >
                <h1
                    class="
                        text-xl
                        font-bold
                        text-baige

                        lg:text-4xl

                        xl:text-5xl
                    "
                >
                    Ozvite sa nám
                </h1>

                <p
                    class="
                        text-regular
                        mt-4
                        max-w-xl
                        leading-[1.65]
                        text-baige/70

                        lg:text-lg
                    "
                >
                    Napíšte nám správu alebo nás
                    kontaktujte priamo. Radi vám
                    pomôžeme.
                </p>
            </section>

            <!-- Form + contacts -->
            <section
                class="
                    mt-14
                    grid
                    grid-cols-1
                    gap-10

                    lg:mt-20
                    lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]
                    lg:items-start
                    lg:gap-12

                    xl:gap-16
                "
            >
                <!-- Contact form -->
                <div
                    class="
                        physics-card
                        overflow-hidden
                        rounded-[2.7rem]
                        bg-baige
                        text-green
                        shadow-[var(--shadow-mid)]

                        transition-[box-shadow]
                        duration-200
                        ease-out

                        hover:shadow-[0_22px_48px_rgba(0,0,0,0.12)]
                    "
                    :style="
                        formCardMotionStyle()
                    "
                    data-physics-card
                    data-physics-seed="1"
                    data-base-rotate="-0.1"
                    data-x-direction="-0.1"
                    data-y-direction="0.1"
                    data-rotation-direction="0"
                    data-motion-scale="0.18"
                    data-rotation-scale="0.1"
                >
                    <!-- Success -->
                    <div
                        v-if="
                            submittedSuccessfully
                        "
                        class="
                            flex
                            min-h-[34rem]
                            flex-col
                            items-center
                            justify-center
                            px-6
                            py-12
                            text-center

                            sm:px-10
                        "
                    >
                        <div
                            class="
                                success-icon
                                flex
                                size-14
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
                                    bi-check-lg
                                    text-xl
                                "
                                aria-hidden="true"
                            />
                        </div>

                        <h2
                            class="
                                mt-6
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
                                background-color="#335940"
                                text-color="#FBF9F3"
                                @click="
                                    sendAnotherMessage
                                "
                            >
                                Poslať ďalšiu správu
                            </Button>
                        </div>
                    </div>

                    <!-- Form -->
                    <div
                        v-else
                    >
                        <!-- Heading -->
                        <div
                            class="
                                px-6
                                pb-3
                                pt-8

                                sm:px-9
                                sm:pb-5
                                sm:pt-10
                            "
                        >
                            <h2
                                class="
                                    text-center
                                    text-xl
                                    font-bold
                                    text-green
                                "
                            >
                                Napíšte nám
                            </h2>
                        </div>

                        <form
                            @submit.prevent="
                                submit
                            "
                        >
                            <!-- Name -->
                            <div
                                class="
                                    px-6
                                    pb-1
                                    pt-5

                                    sm:px-9
                                    sm:py-6
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
                                    class="
                                        text-regular
                                        mt-1.5
                                        w-full
                                        border-0
                                        bg-transparent
                                        p-0
                                        text-lg
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
                                    px-6
                                    pb-1
                                    pt-5

                                    sm:px-9
                                    sm:py-6
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
                                    class="
                                        text-regular
                                        mt-1.5
                                        w-full
                                        border-0
                                        bg-transparent
                                        p-0
                                        text-lg
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
                                    px-6
                                    pb-1
                                    pt-5

                                    sm:px-9
                                    sm:py-6
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
                                    v-model="
                                        form.sender_phone
                                    "
                                    type="tel"
                                    autocomplete="tel"
                                    placeholder="+421"
                                    class="
                                        text-regular
                                        mt-1.5
                                        w-full
                                        border-0
                                        bg-transparent
                                        p-0
                                        text-lg
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
                                >

                                <p
                                    v-if="
                                        formErrors.sender_phone
                                    "
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
                                    px-6
                                    pb-5
                                    pt-5

                                    sm:px-9
                                    sm:pb-6
                                    sm:pt-6
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
                                        min-h-[11rem]
                                    "
                                >
                                    <!-- Animated suggestion -->
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
                                                text-lg
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

                                    <!-- Actual textarea -->
                                    <textarea
                                        id="contact-message"
                                        v-model="
                                            form.body
                                        "
                                        rows="6"
                                        aria-label="Správa"
                                        class="
                                            text-regular
                                            relative
                                            z-0
                                            min-h-[11rem]
                                            w-full
                                            resize-none
                                            border-0
                                            bg-transparent
                                            p-0
                                            text-lg
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

                            <!-- Error -->
                            <div
                                v-if="
                                    submitError
                                "
                                class="
                                    px-6
                                    py-4

                                    sm:px-9
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
                                    py-5

                                    sm:px-9
                                    sm:py-6
                                "
                            >
                                <Button
                                    type="submit"
                                    background-image=""
                                    background-color="#335940"
                                    text-color="#FBF9F3"
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
                    </div>
                </div>

                <!-- Contact details -->
                <aside
                    class="
                        min-w-0
                    "
                >
                    <div
                        class="
                            mb-6

                            lg:ml-3
                        "
                    >
                        <h2
                            class="
                                text-center
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
                                text-center
                                text-baige/60
                            "
                        >
                            Vyberte si spôsob,
                            ktorý vám najviac vyhovuje.
                        </p>
                    </div>

                    <!-- Floating contact cards -->
                    <div
                        v-if="
                            contacts.length
                        "
                        class="
                            relative
                            flex
                            flex-col
                            py-10
                        "
                    >
                        <component
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
                            :is="
                                contactHref(
                                    contact
                                )
                                    ? 'a'
                                    : 'div'
                            "
                            :href="
                                contactHref(
                                    contact
                                ) ||
                                undefined
                            "
                            v-bind="
                                linkAttrs(
                                    contactHref(
                                        contact
                                    )
                                )
                            "
                            class="
                                physics-card
                                group
                                relative
                                flex
                                min-w-0
                                items-center
                                gap-4
                                rounded-[1.7rem]
                                bg-baige
                                p-4
                                text-green
                                shadow-[var(--shadow-soft)]

                                transition-[box-shadow]
                                duration-200
                                ease-out

                                hover:z-50
                                hover:shadow-[var(--shadow-mid)]

                                [&+&]:-mt-1

                                sm:[&+&]:-mt-2

                                lg:[&+&]:-mt-3
                            "
                            :class="
                                contactCardLayout(
                                    index
                                )
                            "
                            :style="
                                contactCardMotionStyle(
                                    index
                                )
                            "
                            data-physics-card
                            :data-physics-seed="index"
                            :data-base-rotate="
                                contactCardBaseRotation(
                                    index
                                )
                            "
                            data-x-direction="0"
                            data-y-direction="1"
                            data-rotation-direction="1"
                        >
                            <div
                                class="
                                    flex
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-green
                                    text-baige
                                    size-10
                                    shrink-0
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

                                <span
                                    class="
                                        text-regular
                                        mt-0.5
                                        block
                                        truncate
                                        font-bold
                                        text-green
                                    "
                                >
                                    {{
                                        contact.value
                                    }}
                                </span>
                            </p>

                            <div
                                v-if="
                                    contactHref(
                                        contact
                                    )
                                "
                                class="
                                    flex
                                    size-8
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                    text-green/50
                                    transition-all
                                    duration-200

                                    group-hover:bg-green
                                    group-hover:text-baige
                                "
                            />
                        </component>
                    </div>

                    <p
                        v-else
                        class="
                            text-regular
                            mt-5
                            text-baige/50
                        "
                    >
                        Kontaktné údaje zatiaľ
                        nie sú uvedené.
                    </p>
                </aside>
            </section>

            <!-- Opening hours -->
            <section
                class="
                    mt-24
                    grid
                    grid-cols-1
                    gap-8

                    lg:mt-32
                    lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)]
                    lg:items-start
                    lg:gap-14
                "
            >
                <div
                    class="
                        lg:pt-7
                    "
                >
                    <h2
                        class="
                            text-center
                            text-xl
                            font-bold
                            text-baige
                        "
                    >
                        Otváracie hodiny
                    </h2>

                    <p
                        class="
                            text-regular
                            mt-3
                            max-w-sm
                            text-center
                            text-baige/60
                        "
                    >
                        Kedy nás môžete zastihnúť
                        na pobočke.
                    </p>
                </div>

                <div
                    v-if="
                        openingHours.length
                    "
                    class="
                        overflow-hidden
                        p-6
                        text-baige

                        sm:p-8
                    "
                >
                    <div
                        v-for="
                            entry in
                            openingHours
                        "
                        :key="
                            `${entry.dayOfWeek || entry.day_of_week || entry.day}-${openingHoursLabel(entry)}`
                        "
                        class="
                            grid
                            min-h-12
                            grid-cols-[minmax(0,1fr)_auto]
                            items-center
                            gap-6
                        "
                    >
                        <p
                            class="
                                text-regular
                                text-baige
                            "
                        >
                            {{
                                openingHoursDayLabel(
                                    entry
                                )
                            }}
                        </p>

                        <p
                            class="
                                text-regular
                                text-right
                                font-bold
                                text-baige
                            "
                        >
                            {{
                                openingHoursLabel(
                                    entry
                                )
                            }}
                        </p>
                    </div>
                </div>

                <p
                    v-else
                    class="
                        text-regular
                        text-baige/50
                    "
                >
                    Otváracie hodiny momentálne
                    nie sú uvedené.
                </p>
            </section>
        </main>
    </div>
</template>

<style scoped>
.physics-card {
    --card-rest-rotate: 0deg;
    --physics-x: 0px;
    --physics-y: 0px;
    --physics-rotate: 0deg;

    transform:
        translate3d(
            var(--physics-x),
            var(--physics-y),
            0
        )
        rotate(
            calc(
                var(--card-rest-rotate) +
                var(--physics-rotate)
            )
        );

    will-change:
        transform;

    transform-origin:
        center center;

    backface-visibility:
        hidden;
}

.success-icon {
    animation:
        success-pop
        500ms
        cubic-bezier(
            0.34,
            1.56,
            0.64,
            1
        )
        both;
}

@keyframes success-pop {
    from {
        opacity: 0;

        transform:
            scale(0.55)
            rotate(-12deg);
    }

    to {
        opacity: 1;

        transform:
            scale(1)
            rotate(0);
    }
}

@media (
    prefers-reduced-motion:
    reduce
) {
    .physics-card {
        transform:
            none !important;
    }

    .success-icon {
        animation:
            none;
    }
}
</style>