import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import { normalizeCompany } from '../normalizers/clinvia';
import {
    buildClinviaPublicEndpoint,
    normalizeClinviaPublicFooterData
} from '../utils/clinviaFooter';

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
                    return branch.id === configuredBranchId;
                }) ??
                branches.value[0] ??
                null
            );
        });

        const otherBranches = computed(() => {
            return branches.value.filter((branch) => {
                return branch.id !== currentBranch.value?.id;
            });
        });

        const services = computed(() => {
            return currentBranch.value?.services ?? [];
        });

        const employees = computed(() => {
            return currentBranch.value?.employees ?? [];
        });

        const contacts = computed(() => {
            return currentBranch.value?.contacts ?? [];
        });

        const openingHours = computed(() => {
            return currentBranch.value?.openingHours ?? [];
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
                    return contact.type === 'phone';
                }) ??
                contacts.value.find((contact) => {
                    return contact.type === 'email';
                }) ??
                contacts.value[0] ??
                null
            );
        });

        function getBranchById(id) {
            return branches.value.find((branch) => {
                return branch.id === Number(id);
            }) ?? null;
        }

        function getBranchBySlug(slug) {
            return branches.value.find((branch) => {
                return branch.slug === slug;
            }) ?? null;
        }

        function getServiceById(id) {
            return services.value.find((service) => {
                return service.id === Number(id);
            }) ?? null;
        }

        function getServiceBySlug(slug) {
            return services.value.find((service) => {
                return service.slug === slug;
            }) ?? null;
        }

        function getEmployeeById(id) {
            return employees.value.find((employee) => {
                return employee.id === Number(id);
            }) ?? null;
        }

        async function load() {
            if (loaded.value && company.value) {
                return company.value;
            }

            if (loadPromise) {
                return loadPromise;
            }

            loading.value = true;
            error.value = null;

            const requestUrl = endpoint.value;

            if (!requestUrl) {
                payload.value = null;
                company.value = null;
                footerData.value = null;
                loading.value = false;
                loaded.value = false;
                return null;
            }

            loadPromise = fetch(requestUrl, {
                headers: {
                    Accept: 'application/json',
                    ...(!import.meta.env.DEV && apiKey
                        ? {
                            'X-API-Key': apiKey
                        }
                        : {})
                }
            })
                .then(async (response) => {
                    if (!response.ok) {
                        throw new Error(
                            `Clinvia API returned ${response.status}`
                        );
                    }

                    const responseData =
                        await response.json();

                    payload.value = responseData;

                    const rawCompany =
                        responseData?.data ??
                        responseData;

                    company.value = normalizeCompany(
                        rawCompany
                    );

                    footerData.value =
                        normalizeClinviaPublicFooterData(
                            responseData,
                            {
                                branchIdentifier:
                                    configuredBranchIdentifier
                            }
                        );

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