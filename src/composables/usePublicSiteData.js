import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { usePublicSiteStore } from '../stores/publicSite';

export function usePublicSiteData(branchSlug = 'humanitas') {
    const publicSiteStore = usePublicSiteStore();
    const {
        company,
        branches,
        loading,
        error,
        loaded
    } = storeToRefs(publicSiteStore);

    const branch = computed(() => {
        return (
            branches.value.find((item) => {
                return item.slug === branchSlug;
            }) ??
            branches.value[0] ??
            null
        );
    });

    onMounted(() => {
        if (!loaded.value && !loading.value) {
            publicSiteStore.load();
        }
    });

    const services = computed(() => {
        return (branch.value?.services ?? []).map((service) => {
            return {
                id: service.id,
                name: service.name,
                slug: service.slug,

                shortDescription:
                    service.shortDescription ??
                    service.description ??
                    '',

                description:
                    service.description ??
                    service.shortDescription ??
                    '',

                durationSessions:
                    Number(
                        service.durationSessions ?? 1
                    ),

                durationMinutes:
                    service.durationMinutes
                        ? Number(service.durationMinutes)
                        : null,

                insuranceAmount:
                    service.insuranceAmount !== null
                        ? Number(service.insuranceAmount)
                        : null,

                insuranceNote:
                    service.insuranceNote ?? null,

                selfPayAmount:
                    service.selfPayAmount !== null
                        ? Number(service.selfPayAmount)
                        : null,

                selfPayNote:
                    service.selfPayNote ?? null,

                category: service.category
                    ? {
                        id: service.category.id,
                        name: service.category.name,
                        slug: service.category.slug
                    }
                    : null,

                information:
                    service.information ?? [],

                necessities:
                    service.necessities ?? [],

                steps:
                    service.steps ?? [],

                tags:
                    service.tags ?? [],

                files:
                    service.files ?? [],

                icon:
                    service.icon ?? null,

                featuredImage:
                    service.featuredImage ?? null,

                isActive:
                    Boolean(service.isActive)
            };
        });
    });

    const employees = computed(() => {
        return (branch.value?.employees ?? []).map((employee) => {
            return {
                id: employee.id,
                slug: employee.slug,

                firstName:
                    employee.firstName ?? '',

                lastName:
                    employee.lastName ?? '',

                titleBefore:
                    employee.titleBefore ?? null,

                titleAfter:
                    employee.titleAfter ?? null,

                position:
                    employee.position ?? null,

                bio:
                    employee.bio ?? null,

                email:
                    employee.email ?? null,

                phone:
                    employee.phone ?? null,

                photoUrl:
                    employee.photoUrl ?? null,

                isActive:
                    Boolean(employee.isActive)
            };
        });
    });

    const contacts = computed(() => {
        return (branch.value?.contacts ?? []).map((contact) => {
            return {
                id: contact.id,
                type: contact.type,
                label: contact.label,
                value: contact.value,

                isPrimary:
                    Boolean(contact.isPrimary)
            };
        });
    });

    const openingHours = computed(() => {
        return (branch.value?.openingHours ?? []).map((entry) => {
            return {
                id: entry.id,

                dayOfWeek:
                    Number(entry.dayOfWeek),

                isClosed:
                    Boolean(entry.isClosed),

                note:
                    entry.note ?? null,

                intervals:
                    (entry.intervals ?? []).map((interval) => {
                        return {
                            opensAt:
                                interval.opensAt ?? null,

                            closesAt:
                                interval.closesAt ?? null
                        };
                    })
            };
        });
    });

    const branchInfo = computed(() => {
        if (!branch.value) {
            return null;
        }

        return {
            id: branch.value.id,
            name: branch.value.name,
            slug: branch.value.slug,
            type: branch.value.type,

            description:
                branch.value.description ?? '',

            website:
                branch.value.website ?? null,

            address: {
                line1:
                    branch.value.address?.line1 ??
                    null,

                line2:
                    branch.value.address?.line2 ??
                    null,

                city:
                    branch.value.address?.city ??
                    null,

                postalCode:
                    branch.value.address?.postalCode ??
                    null,

                country:
                    branch.value.address?.country ??
                    null,

                latitude:
                    branch.value.address?.latitude
                        ? Number(branch.value.address.latitude)
                        : null,

                longitude:
                    branch.value.address?.longitude
                        ? Number(branch.value.address.longitude)
                        : null
            }
        };
    });

    const companyInfo = computed(() => {
        if (!company.value) {
            return null;
        }

        return {
            id: company.value.id,
            slug: company.value.slug,

            legalName:
                company.value.legalName,

            email:
                company.value.email,

            phone:
                company.value.phone,

            website:
                company.value.website,

            address: {
                line1:
                    company.value.address?.line1,

                line2:
                    company.value.address?.line2,

                city:
                    company.value.address?.city,

                postalCode:
                    company.value.address?.postalCode,

                region:
                    company.value.address?.region,

                country:
                    company.value.address?.country
            }
        };
    });

    return {
        loading,
        error,
        load: publicSiteStore.load,

        company: companyInfo,
        branch: branchInfo,

        branches,
        services,
        employees,
        contacts,
        openingHours
    };
}