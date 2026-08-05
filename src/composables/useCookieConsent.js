import {
    computed,
    ref
} from 'vue';

import {
    COOKIE_CONSENT_STORAGE_KEY,
    DEFAULT_COOKIE_PREFERENCES,
    createCookieConsentRecord,
    normalizeCookiePreferences,
    parseCookieConsentRecord,
    serializeCookieConsentRecord
} from '../utils/cookieConsent';

let instance;

function googleTagId() {
    return String(
        import.meta.env
            .VITE_GOOGLE_TAG_ID ??
        ''
    ).trim();
}

function createCookieConsent() {
    const consentRecord = ref(null);
    const isReady = ref(false);
    const isSheetOpen = ref(false);

    let initialized = false;
    let googleTagScriptLoaded = false;
    let googleTagConfigured = false;

    const preferences = computed(() => {
        return (
            consentRecord.value
                ?.preferences ??
            DEFAULT_COOKIE_PREFERENCES
        );
    });

    const hasStoredConsent = computed(() => {
        return Boolean(
            consentRecord.value
        );
    });

    function getWindowObject() {
        if (
            typeof window ===
            'undefined'
        ) {
            return null;
        }

        return window;
    }

    function ensureGtagStub() {
        const windowObject =
            getWindowObject();

        if (!windowObject) {
            return null;
        }

        windowObject.dataLayer ??= [];

        if (
            typeof windowObject.gtag !==
            'function'
        ) {
            windowObject.gtag =
                function gtag() {
                    windowObject.dataLayer.push(
                        arguments
                    );
                };
        }

        return windowObject.gtag;
    }

    function googleConsentPayload(
        cookiePreferences
    ) {
        return {
            analytics_storage:
                cookiePreferences.analytics
                    ? 'granted'
                    : 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            functionality_storage:
                'granted',
            personalization_storage: 'denied',
            security_storage:
                'granted'
        };
    }

    function ensureGoogleTagLoaded() {
        const tagId =
            googleTagId();

        if (!tagId) {
            return false;
        }

        if (
            typeof document ===
            'undefined'
        ) {
            return false;
        }

        if (
            googleTagScriptLoaded ||
            document.querySelector(
                '[data-google-tag-script]'
            )
        ) {
            googleTagScriptLoaded =
                true;

            return true;
        }

        const script =
            document.createElement(
                'script'
            );

        script.async = true;
        script.dataset.googleTagScript =
            'true';
        script.src =
            `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`;

        document.head.appendChild(
            script
        );

        googleTagScriptLoaded =
            true;

        return true;
    }

    function applyGoogleConsent(
        cookiePreferences,
        mode = 'update'
    ) {
        const gtag =
            ensureGtagStub();

        if (!gtag) {
            return;
        }

        const nextPayload =
            googleConsentPayload(
                cookiePreferences
            );

        if (mode === 'default') {
            nextPayload.wait_for_update = 500;
        }

        gtag(
            'consent',
            mode,
            nextPayload
        );

        const tagId =
            googleTagId();

        if (
            !tagId ||
            !(
                cookiePreferences.analytics ||
                cookiePreferences.marketing
            )
        ) {
            return;
        }

        ensureGoogleTagLoaded();

        if (googleTagConfigured) {
            return;
        }

        gtag(
            'js',
            new Date()
        );

        gtag(
            'config',
            tagId,
            {
                anonymize_ip: true
            }
        );

        googleTagConfigured =
            true;
    }

    function persistConsent(
        nextPreferences
    ) {
        const normalizedPreferences =
            normalizeCookiePreferences(
                nextPreferences
            );

        const nextRecord =
            createCookieConsentRecord(
                normalizedPreferences
            );

        consentRecord.value =
            nextRecord;

        try {
            localStorage.setItem(
                COOKIE_CONSENT_STORAGE_KEY,
                serializeCookieConsentRecord(
                    nextRecord
                )
            );
        } catch {
            /* noop */
        }

        applyGoogleConsent(
            normalizedPreferences,
            'update'
        );
    }

    function initializeCookieConsent() {
        if (initialized) {
            return;
        }

        initialized = true;

        const gtag =
            ensureGtagStub();

        if (gtag) {
            applyGoogleConsent(
                DEFAULT_COOKIE_PREFERENCES,
                'default'
            );
        }

        let storedRecord = null;

        try {
            storedRecord =
                parseCookieConsentRecord(
                    localStorage.getItem(
                        COOKIE_CONSENT_STORAGE_KEY
                    )
                );
        } catch {
            storedRecord = null;
        }

        if (storedRecord) {
            consentRecord.value =
                storedRecord;

            applyGoogleConsent(
                storedRecord.preferences,
                'update'
            );
        } else {
            isSheetOpen.value =
                true;
        }

        const windowObject =
            getWindowObject();

        if (windowObject) {
            windowObject.HumanitasCookies = {
                openSettings,
                getPreferences() {
                    return {
                        ...preferences.value
                    };
                }
            };
        }

        isReady.value = true;
    }

    function openSettings() {
        isSheetOpen.value = true;
    }

    function closeSettings() {
        isSheetOpen.value = false;
    }

    function acceptAll() {
        persistConsent({
            analytics: true,
            marketing: true
        });

        isSheetOpen.value = false;
    }

    function rejectOptional() {
        persistConsent({
            analytics: false,
            marketing: false
        });

        isSheetOpen.value = false;
    }

    function savePreferences(
        nextPreferences
    ) {
        persistConsent(
            nextPreferences
        );

        isSheetOpen.value = false;
    }

    return {
        isReady,
        isSheetOpen,
        hasStoredConsent,
        preferences,
        initializeCookieConsent,
        openSettings,
        closeSettings,
        acceptAll,
        rejectOptional,
        savePreferences
    };
}

export function useCookieConsent() {
    instance ??=
        createCookieConsent();

    return instance;
}