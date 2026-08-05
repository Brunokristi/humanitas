import test from 'node:test'
import assert from 'node:assert/strict'
import {
    buildClinviaPublicEndpoint,
    formatAddress,
    formatOpeningHours,
    normalizeClinviaPublicFooterData
} from '../src/utils/clinviaFooter.js'

const samplePayload = {
    data: {
        legal_name: 'Klinická psychológia s.r.o.',
        email: 'klinickapsychologialc@gmail.com',
        phone: '+421 944 094 090',
        website: 'www.klinickapsychologialucenec.sk',
        address_line_1: 'K. Kuzmányho 7',
        city: 'Lučenec',
        postal_code: '984 01',
        country: 'Slovensko',
        branches: [
            {
                id: 1,
                name: 'Fallback branch',
                slug: 'fallback-branch',
                address_line_1: 'Fallback 1',
                city: 'Fallback city',
                postal_code: '000 00',
                country: 'Slovensko',
                contacts: [],
                opening_hours: []
            },
            {
                id: 2,
                name: 'Humanitas',
                slug: 'humanitas',
                description: 'Ambulancia klinickej a dopravnej psychológie.',
                address_line_1: 'Hviezdoslavova 8',
                city: 'Rimavská Sobota',
                postal_code: '979 01',
                country: 'Slovensko',
                contacts: [
                    {
                        type: 'phone',
                        value: '+421 948 569 112',
                        is_primary: true,
                        sort_order: 0
                    },
                    {
                        type: 'email',
                        value: 'klinickapsychologiars@gmail.com',
                        is_primary: false,
                        sort_order: 0
                    }
                ],
                opening_hours: [
                    {
                        day_of_week: 1,
                        is_closed: false,
                        intervals: [
                            {
                                opens_at: '07:30:00',
                                closes_at: '12:00:00'
                            },
                            {
                                opens_at: '12:30:00',
                                closes_at: '16:00:00'
                            }
                        ]
                    },
                    {
                        day_of_week: 7,
                        is_closed: true,
                        intervals: []
                    }
                ]
            }
        ]
    }
}

test('builds the Clinvia public endpoint from the configured base URL and company ID', () => {
    assert.equal(
        buildClinviaPublicEndpoint('https://clinvia.studiokristian.com', 1),
        'https://clinvia.studiokristian.com/public/companies/1'
    )

    assert.equal(
        buildClinviaPublicEndpoint('https://clinvia.studiokristian.com/api', 'klinicka-psychologia-sro'),
        'https://clinvia.studiokristian.com/public/companies/klinicka-psychologia-sro'
    )
})

test('normalizes the public footer payload with all required visible fields', () => {
    const normalized = normalizeClinviaPublicFooterData(samplePayload, {
        branchIdentifier: '2'
    })

    assert.equal(normalized.company.name, null)
    assert.equal(normalized.company.legalName, 'Klinická psychológia s.r.o.')
    assert.equal(normalized.company.ico, null)
    assert.equal(normalized.company.dic, null)
    assert.equal(normalized.company.icDph, null)
    assert.deepEqual(normalized.company.registeredAddress.lines, [
        'K. Kuzmányho 7',
        '984 01 Lučenec',
        'Slovensko'
    ])

    assert.equal(normalized.branch.name, 'Humanitas')
    assert.equal(normalized.branch.description, 'Ambulancia klinickej a dopravnej psychológie.')
    assert.equal(normalized.branch.email, 'klinickapsychologiars@gmail.com')
    assert.equal(normalized.branch.phone, '+421 948 569 112')
    assert.deepEqual(normalized.branch.address.lines, [
        'Hviezdoslavova 8',
        '979 01 Rimavská Sobota',
        'Slovensko'
    ])
    assert.equal(normalized.branch.openingHours[0].label, 'Pondelok')
    assert.equal(normalized.branch.openingHours[0].schedule, '07:30 – 12:00, 12:30 – 16:00')
    assert.equal(normalized.branch.openingHours[1].schedule, 'Zatvorené')

    assert.equal(normalized.publicSite.privacyUrl, null)
    assert.equal(normalized.publicSite.termsUrl, null)
    assert.equal(normalized.publicSite.cookiesUrl, null)
    assert.deepEqual(normalized.publicSite.socials, [])
})

test('maps alternate company id fields used by Clinvia payloads', () => {
    const normalized = normalizeClinviaPublicFooterData({
        data: {
            legal_name: 'Test Company s.r.o.',
            company_id_number: '12345678',
            tax_id: '9876543210',
            vat_id: 'SK1234567890',
            branches: [
                {
                    id: 2,
                    name: 'Humanitas'
                }
            ]
        }
    }, {
        branchIdentifier: '2'
    })

    assert.equal(normalized.company.ico, '12345678')
    assert.equal(normalized.company.dic, '9876543210')
    assert.equal(normalized.company.icDph, 'SK1234567890')
})

test('maps nested company identifier fields when ids are not top-level', () => {
    const normalized = normalizeClinviaPublicFooterData({
        data: {
            legal_name: 'Nested IDs s.r.o.',
            identification: {
                company_ico: '22223333',
                company_dic: '4455667788',
                company_vat_id: 'SK4455667788'
            },
            branches: [
                {
                    id: 2,
                    name: 'Humanitas'
                }
            ]
        }
    }, {
        branchIdentifier: '2'
    })

    assert.equal(normalized.company.ico, '22223333')
    assert.equal(normalized.company.dic, '4455667788')
    assert.equal(normalized.company.icDph, 'SK4455667788')
})

test('also reads identifiers from common nested company wrappers', () => {
    const normalized = normalizeClinviaPublicFooterData({
        data: {
            legal_name: 'Wrapped IDs s.r.o.',
            company: {
                identification: {
                    company_ico: '33334444',
                    company_dic: '5566778899',
                    company_vat_id: 'SK5566778899'
                }
            },
            branches: [
                {
                    id: 2,
                    name: 'Humanitas'
                }
            ]
        }
    }, {
        branchIdentifier: '2'
    })

    assert.equal(normalized.company.ico, '33334444')
    assert.equal(normalized.company.dic, '5566778899')
    assert.equal(normalized.company.icDph, 'SK5566778899')
})

test('falls back to first branch when selected branch is missing', () => {
    const normalized = normalizeClinviaPublicFooterData(samplePayload, {
        branchIdentifier: '999'
    })

    assert.equal(normalized.branch.name, 'Fallback branch')
})

test('keeps nullable fields safe when Clinvia returns partial data', () => {
    const normalized = normalizeClinviaPublicFooterData({
        company: {
            name: 'Partial Company'
        },
        branch: {},
        public_site: {}
    })

    assert.equal(normalized.company.name, 'Partial Company')
    assert.equal(normalized.company.legalName, null)
    assert.deepEqual(normalized.company.registeredAddress.lines, [])
    assert.equal(normalized.branch.name, null)
    assert.deepEqual(normalized.branch.openingHours, [])
    assert.equal(normalized.publicSite.logoUrl, null)
})

test('formats addresses and opening hours safely when optional pieces are missing', () => {
    assert.deepEqual(formatAddress({ city: 'Fiľakovo' }).lines, ['Fiľakovo'])
    assert.deepEqual(formatOpeningHours([{ day: 'sunday', is_closed: true }])[0], {
        day: 'sunday',
        label: 'Nedeľa',
        isClosed: true,
        opensAt: null,
        closesAt: null,
        schedule: 'Zatvorené'
    })
})
