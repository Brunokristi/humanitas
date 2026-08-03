import {
    computed,
    ref
} from 'vue';
import { defineStore } from 'pinia';

import { normalizeCompany } from '../normalizers/clinvia';
import {
    buildClinviaPublicEndpoint,
    normalizeClinviaPublicFooterData
} from '../utils/clinviaFooter';

function resolveBranchSlug(
    rawCompany,
    configuredIdentifier
) {
    const branches =
        rawCompany?.branches;

    if (
        !Array.isArray(branches) ||
        !branches.length
    ) {
        return null;
    }

    const normalizedIdentifier =
        String(
            configuredIdentifier ?? ''
        ).trim();

    if (!normalizedIdentifier) {
        return (
            branches[0]?.slug ??
            null
        );
    }

    const branchById = branches.find((branch) => {
        return (
            String(branch.id) ===
            normalizedIdentifier
        );
    });

    if (branchById?.slug) {
        return branchById.slug;
    }

    const branchBySlug = branches.find((branch) => {
        return (
            String(branch.slug) ===
            normalizedIdentifier
        );
    });

    return (
        branchBySlug?.slug ??
        normalizedIdentifier
    );
}

function pickFirstDefined(...values) {
    for (const value of values) {
        if (
            value !== null &&
            value !== undefined &&
            value !== ''
        ) {
            return value;
        }
    }

    return null;
}

function formatAddress(address) {
    if (!address) {
        return null;
    }

    if (typeof address === 'string') {
        return address;
    }

    if (typeof address !== 'object') {
        return String(address);
    }

    const street = pickFirstDefined(
        address.street,
        address.streetAddress,
        address.street_address,
        address.address
    );

    const postalCode = pickFirstDefined(
        address.postalCode,
        address.postal_code,
        address.zip,
        address.zipCode
    );

    const city = pickFirstDefined(
        address.city,
        address.locality,
        address.town
    );

    const country = pickFirstDefined(
        address.country,
        address.countryName,
        address.country_name
    );

    const cityPart = [
        postalCode,
        city
    ]
        .filter(Boolean)
        .join(' ');

    const formattedAddress = [
        street,
        cityPart,
        country
    ]
        .filter(Boolean)
        .join(', ');

    return formattedAddress || null;
}

async function fetchBranchCompanyIdentifiers(branchSlug) {
    if (!branchSlug) {
        return null;
    }

    if (typeof DOMParser === 'undefined') {
        return null;
    }

    const response = await fetch(
        `/clinvia-proxy/p/${encodeURIComponent(branchSlug)}`,
        {
            headers: {
                Accept: 'text/html'
            }
        }
    );

    if (!response.ok) {
        return null;
    }

    const html =
        await response.text();

    const parsedDocument =
        new DOMParser().parseFromString(
            html,
            'text/html'
        );

    const payloadAttribute =
        parsedDocument
            .querySelector('#app')
            ?.getAttribute('data-page');

    if (!payloadAttribute) {
        return null;
    }

    let pagePayload;

    try {
        pagePayload = JSON.parse(
            payloadAttribute
        );
    } catch {
        return null;
    }

    const companyFromBranchPage =
        pagePayload?.props?.branch
            ?.company;

    if (
        !companyFromBranchPage ||
        typeof companyFromBranchPage !== 'object'
    ) {
        return null;
    }

    return {
        ico: pickFirstDefined(
            companyFromBranchPage.ico,
            companyFromBranchPage.company_id_number
        ),

        dic: pickFirstDefined(
            companyFromBranchPage.dic,
            companyFromBranchPage.tax_id
        ),

        taxId: pickFirstDefined(
            companyFromBranchPage.tax_id,
            companyFromBranchPage.dic
        ),

        icDph: pickFirstDefined(
            companyFromBranchPage.ic_dph,
            companyFromBranchPage.vat_id
        )
    };
}

export const usePublicSiteStore = defineStore(
    'publicSite',
    () => {
        const payload = ref(null);
        const company = ref(null);
        const footerData = ref(null);

        const loading = ref(false);
        const loaded = ref(false);
        const error = ref(null);

        let loadPromise = null;

        const companySlug =
            import.meta.env.VITE_CLINVIA_COMPANY_ID ??
            import.meta.env.VITE_CLINVIA_COMPANY_SLUG ??
            import.meta.env.VITE_CLINVIA_COMPANY_IDENTIFIER ??
            null;

        const configuredBranchIdentifier =
            import.meta.env.VITE_CLINVIA_BRANCH_ID ??
            import.meta.env.VITE_CLINVIA_BRANCH_SLUG ??
            import.meta.env.VITE_CLINVIA_BRANCH_IDENTIFIER ??
            null;

        const configuredBranchId = Number(
            configuredBranchIdentifier
        );

        const apiKey =
            import.meta.env.VITE_CLINVIA_API_KEY;

        const endpoint = computed(() => {
            if (!companySlug) {
                return null;
            }

            if (import.meta.env.DEV) {
                return `/clinvia-proxy/public/companies/${encodeURIComponent(companySlug)}`;
            }

            return buildClinviaPublicEndpoint(
                import.meta.env.VITE_CLINVIA_API_URL,
                companySlug
            );
        });

        const branches = computed(() => {
            return company.value?.branches ?? [];
        });

        const currentBranch = computed(() => {
            return (
                branches.value.find((branch) => {
                    return (
                        branch.id ===
                        configuredBranchId
                    );
                }) ??
                branches.value[0] ??
                null
            );
        });

        const otherBranches = computed(() => {
            return branches.value.filter((branch) => {
                return (
                    branch.id !==
                    currentBranch.value?.id
                );
            });
        });

        const services = computed(() => {
            return (
                currentBranch.value?.services ??
                []
            );
        });

        const employees = computed(() => {
            return (
                currentBranch.value?.employees ??
                []
            );
        });

        const contacts = computed(() => {
            return (
                currentBranch.value?.contacts ??
                []
            );
        });

        const openingHours = computed(() => {
            return (
                currentBranch.value?.openingHours ??
                []
            );
        });

        const serviceCategories = computed(() => {
            const categories = new Map();

            services.value.forEach((service) => {
                if (!service.category) {
                    return;
                }

                categories.set(
                    service.category.id,
                    service.category
                );
            });

            return Array.from(
                categories.values()
            );
        });

        const primaryContact = computed(() => {
            return (
                contacts.value.find((contact) => {
                    return contact.isPrimary;
                }) ??
                contacts.value.find((contact) => {
                    return (
                        contact.type ===
                        'phone'
                    );
                }) ??
                contacts.value.find((contact) => {
                    return (
                        contact.type ===
                        'email'
                    );
                }) ??
                contacts.value[0] ??
                null
            );
        });

        const emailContact = computed(() => {
            return (
                contacts.value.find((contact) => {
                    return (
                        contact.type ===
                        'email'
                    );
                }) ??
                null
            );
        });

        const phoneContact = computed(() => {
            return (
                contacts.value.find((contact) => {
                    return (
                        contact.type ===
                        'phone'
                    );
                }) ??
                null
            );
        });

        const privacyPolicy = computed(() => {
            const operatorName = pickFirstDefined(
                company.value?.legalName,
                company.value?.legal_name,
                company.value?.name,
                footerData.value?.company?.name,
                'Prevádzkovateľ webovej stránky'
            );

            const operatorAddress = formatAddress(
                pickFirstDefined(
                    company.value?.registeredAddress,
                    company.value?.registered_address,
                    company.value?.address,
                    footerData.value?.company
                        ?.registeredAddress
                )
            );

            const operatorIco = pickFirstDefined(
                company.value?.ico,
                footerData.value?.company?.ico
            );

            const operatorDic = pickFirstDefined(
                company.value?.dic,
                company.value?.taxId,
                footerData.value?.company?.dic
            );

            const operatorEmail = pickFirstDefined(
                emailContact.value?.value,
                emailContact.value?.email,
                emailContact.value?.label,
                company.value?.email,
                footerData.value?.company?.email
            );

            const operatorPhone = pickFirstDefined(
                phoneContact.value?.value,
                phoneContact.value?.phone,
                phoneContact.value?.label,
                company.value?.phone,
                footerData.value?.company?.phone
            );

            const operatorDetails = [
                operatorName,
                operatorAddress
                    ? `Sídlo: ${operatorAddress}`
                    : null,
                operatorIco
                    ? `IČO: ${operatorIco}`
                    : null,
                operatorDic
                    ? `DIČ: ${operatorDic}`
                    : null,
            ].filter(Boolean);

            return {
                title:
                    'Ochrana osobných údajov',

                updatedAt:
                    '2. augusta 2026',

                intro:
                    'Informácie o spracúvaní, používaní a ochrane vašich osobných údajov.',

                operator: {
                    name:
                        operatorName,

                    address:
                        operatorAddress,

                    ico:
                        operatorIco,

                    dic:
                        operatorDic,

                    email:
                        operatorEmail,

                    phone:
                        operatorPhone
                },

                sections: [
                    {
                        id:
                            'privacy-operator',

                        title:
                            'Prevádzkovateľ',

                        paragraphs: [
                            'Prevádzkovateľom tejto webovej stránky a prevádzkovateľom osobných údajov je:',

                            operatorDetails.join('\n')
                        ]
                    },

                    {
                        id:
                            'privacy-data',

                        title:
                            'Aké osobné údaje spracúvame',

                        paragraphs: [
                            'Spracúvame osobné údaje, ktoré nám poskytnete prostredníctvom kontaktného formulára, e-mailom, telefonicky alebo pri inej vzájomnej komunikácii.'
                        ],

                        items: [
                            'meno a priezvisko',
                            'e-mailová adresa',
                            'telefónne číslo',
                            'obsah správy alebo požiadavky',
                            'ďalšie údaje, ktoré nám dobrovoľne poskytnete'
                        ]
                    },

                    {
                        id:
                            'privacy-purpose',

                        title:
                            'Účel spracúvania',

                        paragraphs: [
                            'Osobné údaje spracúvame najmä na účely prijatia a vybavenia vašej požiadavky, odpovedania na otázky, komunikácie týkajúcej sa poskytovaných služieb a plnenia povinností vyplývajúcich z právnych predpisov.'
                        ]
                    },

                    {
                        id:
                            'privacy-legal-basis',

                        title:
                            'Právny základ spracúvania',

                        paragraphs: [
                            'Osobné údaje spracúvame najmä na základe vykonania opatrení pred uzatvorením zmluvy, plnenia zmluvy, splnenia zákonnej povinnosti alebo oprávneného záujmu prevádzkovateľa na komunikácii s osobami, ktoré ho kontaktujú.'
                        ]
                    },

                    {
                        id:
                            'privacy-storage',

                        title:
                            'Doba uchovávania',

                        paragraphs: [
                            'Osobné údaje uchovávame iba počas doby potrebnej na vybavenie vašej požiadavky, vzájomnú komunikáciu a splnenie zákonných povinností. Po zániku účelu spracúvania údaje vymažeme alebo anonymizujeme, pokiaľ právne predpisy nevyžadujú ich ďalšie uchovávanie.'
                        ]
                    },

                    {
                        id:
                            'privacy-recipients',

                        title:
                            'Príjemcovia osobných údajov',

                        paragraphs: [
                            'Osobné údaje môžu byť v nevyhnutnom rozsahu sprístupnené poskytovateľom technických, hostingových, e-mailových alebo iných podporných služieb, ktorí pre nás zabezpečujú prevádzku webovej stránky a komunikáciu.'
                        ]
                    },

                    {
                        id:
                            'privacy-rights',

                        title:
                            'Vaše práva',

                        paragraphs: [
                            'V súvislosti so spracúvaním osobných údajov máte v rozsahu stanovenom platnými právnymi predpismi nasledujúce práva:'
                        ],

                        items: [
                            'právo na prístup k osobným údajom',
                            'právo na opravu nesprávnych alebo neúplných údajov',
                            'právo na vymazanie osobných údajov',
                            'právo na obmedzenie spracúvania',
                            'právo namietať proti spracúvaniu',
                            'právo na prenosnosť údajov',
                            'právo odvolať súhlas, ak je spracúvanie založené na súhlase',
                            'právo podať návrh na začatie konania na Úrade na ochranu osobných údajov Slovenskej republiky'
                        ]
                    },

                    {
                        id:
                            'privacy-security',

                        title:
                            'Ochrana osobných údajov',

                        paragraphs: [
                            'Prijímame primerané technické a organizačné opatrenia na ochranu osobných údajov pred stratou, zneužitím, neoprávneným prístupom, zverejnením alebo poškodením.'
                        ]
                    },

                    {
                        id:
                            'privacy-contact',

                        title:
                            'Kontakt',

                        paragraphs: [
                            operatorEmail
                                ? `V prípade otázok alebo žiadostí týkajúcich sa ochrany osobných údajov nás môžete kontaktovať na e-mailovej adrese ${operatorEmail}.`
                                : 'V prípade otázok alebo žiadostí týkajúcich sa ochrany osobných údajov nás môžete kontaktovať prostredníctvom kontaktných údajov uvedených na tejto webovej stránke.'
                        ]
                    },

                    {
                        id:
                            'privacy-changes',

                        title:
                            'Zmeny týchto informácií',

                        paragraphs: [
                            'Tieto informácie môžeme primerane aktualizovať najmä v prípade zmeny spôsobu spracúvania osobných údajov, používaných služieb alebo platných právnych predpisov. Aktuálna verzia je vždy zverejnená na tejto webovej stránke.'
                        ]
                    }
                ]
            };
        });

        function getBranchById(id) {
            return (
                branches.value.find((branch) => {
                    return (
                        branch.id ===
                        Number(id)
                    );
                }) ??
                null
            );
        }

        function getBranchBySlug(slug) {
            return (
                branches.value.find((branch) => {
                    return branch.slug === slug;
                }) ??
                null
            );
        }

        function getServiceById(id) {
            return (
                services.value.find((service) => {
                    return (
                        service.id ===
                        Number(id)
                    );
                }) ??
                null
            );
        }

        function getServiceBySlug(slug) {
            return (
                services.value.find((service) => {
                    return service.slug === slug;
                }) ??
                null
            );
        }

        function getEmployeeById(id) {
            return (
                employees.value.find((employee) => {
                    return (
                        employee.id ===
                        Number(id)
                    );
                }) ??
                null
            );
        }

        async function load() {
            if (
                loaded.value &&
                company.value
            ) {
                return company.value;
            }

            if (loadPromise) {
                return loadPromise;
            }

            loading.value = true;
            error.value = null;

            const requestUrl =
                endpoint.value;

            if (!requestUrl) {
                payload.value = null;
                company.value = null;
                footerData.value = null;
                loading.value = false;
                loaded.value = false;

                return null;
            }

            loadPromise = fetch(
                requestUrl,
                {
                    headers: {
                        Accept:
                            'application/json',

                        ...(
                            !import.meta.env.DEV &&
                                apiKey
                                ? {
                                    'X-API-Key':
                                        apiKey
                                }
                                : {}
                        )
                    }
                }
            )
                .then(async (response) => {
                    if (!response.ok) {
                        throw new Error(
                            `Clinvia API returned ${response.status}`
                        );
                    }

                    const responseData =
                        await response.json();

                    payload.value =
                        responseData;

                    const rawCompany =
                        responseData?.data ??
                        responseData;

                    const normalizedCompany =
                        normalizeCompany(
                            rawCompany
                        );

                    const normalizedFooterData =
                        normalizeClinviaPublicFooterData(
                            responseData,
                            {
                                branchIdentifier:
                                    configuredBranchIdentifier
                            }
                        );

                    let branchPageIdentifiers =
                        null;

                    if (
                        import.meta.env.DEV &&
                        !pickFirstDefined(
                            normalizedCompany?.ico,
                            normalizedCompany?.dic,
                            normalizedFooterData?.company?.ico,
                            normalizedFooterData?.company?.dic
                        )
                    ) {
                        const branchSlug =
                            resolveBranchSlug(
                                rawCompany,
                                configuredBranchIdentifier
                            );

                        try {
                            branchPageIdentifiers =
                                await fetchBranchCompanyIdentifiers(
                                    branchSlug
                                );
                        } catch {
                            branchPageIdentifiers =
                                null;
                        }
                    }

                    footerData.value =
                        normalizedFooterData;

                    company.value = {
                        ...normalizedCompany,

                        ico:
                            normalizedCompany?.ico ??
                            normalizedFooterData
                                ?.company
                                ?.ico ??
                            branchPageIdentifiers
                                ?.ico ??
                            null,

                        dic:
                            normalizedCompany?.dic ??
                            normalizedFooterData
                                ?.company
                                ?.dic ??
                            branchPageIdentifiers
                                ?.dic ??
                            null,

                        taxId:
                            normalizedCompany?.taxId ??
                            normalizedFooterData
                                ?.company
                                ?.dic ??
                            branchPageIdentifiers
                                ?.taxId ??
                            null,

                        icDph:
                            normalizedCompany?.icDph ??
                            normalizedFooterData
                                ?.company
                                ?.icDph ??
                            branchPageIdentifiers
                                ?.icDph ??
                            null,

                        registeredAddress:
                            normalizedCompany
                                ?.registeredAddress ??
                            normalizedFooterData
                                ?.company
                                ?.registeredAddress ??
                            null
                    };

                    loaded.value = true;

                    return company.value;
                })
                .catch((loadError) => {
                    payload.value = null;
                    company.value = null;
                    footerData.value = null;
                    loaded.value = false;

                    error.value =
                        loadError instanceof Error
                            ? loadError.message
                            : 'Nepodarilo sa načítať údaje.';

                    throw loadError;
                })
                .finally(() => {
                    loading.value = false;
                    loadPromise = null;
                });

            return loadPromise;
        }

        async function reload() {
            loaded.value = false;
            payload.value = null;
            company.value = null;
            footerData.value = null;

            return load();
        }

        return {
            payload,
            company,
            footerData,
            endpoint,

            branches,
            currentBranch,
            otherBranches,

            services,
            serviceCategories,

            employees,
            contacts,
            openingHours,

            primaryContact,
            emailContact,
            phoneContact,

            privacyPolicy,

            loading,
            loaded,
            error,

            load,
            reload,

            getBranchById,
            getBranchBySlug,

            getServiceById,
            getServiceBySlug,

            getEmployeeById
        };
    }
);