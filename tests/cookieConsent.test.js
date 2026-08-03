import test from 'node:test'
import assert from 'node:assert/strict'

import {
    COOKIE_CONSENT_VERSION,
    createCookieConsentRecord,
    normalizeCookiePreferences,
    parseCookieConsentRecord,
    serializeCookieConsentRecord
} from '../src/utils/cookieConsent.js'

test('normalizes cookie preferences with necessary always enabled', () => {
    assert.deepEqual(
        normalizeCookiePreferences({
            necessary: false,
            analytics: 1,
            marketing: 0
        }),
        {
            necessary: true,
            analytics: true,
            marketing: false
        }
    )
})

test('creates and parses a versioned cookie consent record', () => {
    const record = createCookieConsentRecord({
        analytics: true,
        marketing: false
    }, '2026-08-02T00:00:00.000Z')

    assert.equal(record.version, COOKIE_CONSENT_VERSION)
    assert.deepEqual(record.preferences, {
        necessary: true,
        analytics: true,
        marketing: false
    })

    const serialized = serializeCookieConsentRecord(record)
    const parsed = parseCookieConsentRecord(serialized)

    assert.deepEqual(parsed, record)
})

test('rejects invalid or outdated cookie consent payloads', () => {
    assert.equal(parseCookieConsentRecord('not-json'), null)
    assert.equal(parseCookieConsentRecord(JSON.stringify({ version: 999 })), null)
})