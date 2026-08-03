export const COOKIE_CONSENT_STORAGE_KEY =
    'humanitas-cookie-consent';

export const COOKIE_CONSENT_VERSION = 1;

export const DEFAULT_COOKIE_PREFERENCES = Object.freeze({
    necessary: true,
    analytics: false,
    marketing: false
});

export function normalizeCookiePreferences(preferences = {}) {
    return {
        necessary: true,
        analytics: Boolean(
            preferences.analytics
        ),
        marketing: Boolean(
            preferences.marketing
        )
    };
}

export function createCookieConsentRecord(
    preferences,
    updatedAt =
        new Date().toISOString()
) {
    return {
        version:
            COOKIE_CONSENT_VERSION,
        updatedAt,
        preferences:
            normalizeCookiePreferences(
                preferences
            )
    };
}

export function parseCookieConsentRecord(
    value
) {
    if (!value) {
        return null;
    }

    let parsedValue = value;

    if (
        typeof value ===
        'string'
    ) {
        try {
            parsedValue = JSON.parse(
                value
            );
        } catch {
            return null;
        }
    }

    if (
        !parsedValue ||
        typeof parsedValue !==
        'object'
    ) {
        return null;
    }

    if (
        parsedValue.version !==
        COOKIE_CONSENT_VERSION
    ) {
        return null;
    }

    return createCookieConsentRecord(
        parsedValue.preferences,
        parsedValue.updatedAt
    );
}

export function serializeCookieConsentRecord(
    record
) {
    const normalizedRecord =
        record?.preferences
            ? createCookieConsentRecord(
                record.preferences,
                record.updatedAt
            )
            : createCookieConsentRecord(
                record
            );

    return JSON.stringify(
        normalizedRecord
    );
}