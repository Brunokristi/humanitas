function nullableNumber(value) {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return null;
    }

    const number = Number(value);

    return Number.isNaN(number)
        ? null
        : number;
}

function normalizeCategory(category) {
    if (!category) {
        return null;
    }

    return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description:
            category.description ?? null,
        icon:
            category.icon ?? null,
        sortOrder:
            Number(category.sort_order ?? 0),
        isActive:
            Boolean(category.is_active)
    };
}

function normalizeInformationItem(item) {
    return {
        id: item.id,
        text: item.text,
        sortOrder:
            Number(item.sort_order ?? 0),
        isActive:
            Boolean(item.is_active)
    };
}

function normalizeStep(step) {
    return {
        id: step.id,
        number:
            Number(step.number ?? 0),
        title:
            step.title ?? null,
        text:
            step.text ?? '',
        sortOrder:
            Number(step.sort_order ?? 0),
        isActive:
            Boolean(step.is_active)
    };
}

function normalizeFile(file) {
    return {
        id: file.id,
        label:
            file.label ?? null,
        path:
            file.file_path ?? null,
        originalName:
            file.original_name ?? null,
        mimeType:
            file.mime_type ?? null,
        size:
            nullableNumber(file.size),
        sortOrder:
            Number(file.sort_order ?? 0),
        isActive:
            Boolean(file.is_active)
    };
}

function normalizeService(service) {
    return {
        id: service.id,

        name:
            service.name ?? '',

        slug:
            service.slug ?? '',

        shortDescription:
            service.short_description ??
            '',

        description:
            service.description ??
            '',

        icon:
            service.icon ?? null,

        featuredImage:
            service.featured_image_path ??
            null,

        durationSessions:
            nullableNumber(
                service.duration_sessions
            ),

        durationMinutes:
            nullableNumber(
                service.duration_minutes
            ),

        insuranceAmount:
            nullableNumber(
                service.insurance_amount
            ),

        insuranceNote:
            service.insurance_note ??
            null,

        selfPayAmount:
            nullableNumber(
                service.self_pay_amount
            ),

        selfPayNote:
            service.self_pay_note ??
            null,

        isActive:
            Boolean(service.is_active),

        sortOrder:
            Number(
                service.sort_order ?? 0
            ),

        category:
            normalizeCategory(
                service.category
            ),

        information:
            (service.information ?? [])
                .map(
                    normalizeInformationItem
                ),

        necessities:
            (service.necessities ?? [])
                .map(
                    normalizeInformationItem
                ),

        steps:
            (service.steps ?? [])
                .map(normalizeStep),

        tags:
            service.tags ?? [],

        files:
            (service.files ?? [])
                .map(normalizeFile)
    };
}

function normalizeEmployee(employee) {
    return {
        id: employee.id,

        slug:
            employee.slug ?? '',

        firstName:
            employee.first_name ??
            '',

        lastName:
            employee.last_name ??
            '',

        titleBefore:
            employee.title_before ??
            null,

        titleAfter:
            employee.title_after ??
            null,

        position:
            employee.position ??
            null,

        bio:
            employee.bio ??
            null,

        email:
            employee.email ??
            null,

        phone:
            employee.phone ??
            null,

        photoPath:
            employee.photo_path ??
            null,

        photoUrl:
            employee.photo_url ??
            null,

        isActive:
            Boolean(
                employee.is_active
            ),

        sortOrder:
            Number(
                employee.sort_order ?? 0
            ),

        branchRole:
            employee.pivot?.role ??
            null
    };
}

function normalizeContact(contact) {
    return {
        id: contact.id,

        type:
            contact.type ?? '',

        label:
            contact.label ?? '',

        value:
            contact.value ?? '',

        isPrimary:
            Boolean(
                contact.is_primary
            ),

        sortOrder:
            Number(
                contact.sort_order ?? 0
            )
    };
}

function normalizeOpeningInterval(interval) {
    return {
        id: interval.id,

        opensAt:
            interval.opens_at
                ?.slice(0, 5) ??
            null,

        closesAt:
            interval.closes_at
                ?.slice(0, 5) ??
            null,

        sortOrder:
            Number(
                interval.sort_order ?? 0
            )
    };
}

function normalizeOpeningHours(entry) {
    return {
        id: entry.id,

        dayOfWeek:
            Number(entry.day_of_week),

        isClosed:
            Boolean(entry.is_closed),

        note:
            entry.note ?? null,

        sortOrder:
            Number(
                entry.sort_order ?? 0
            ),

        intervals:
            (entry.intervals ?? [])
                .map(
                    normalizeOpeningInterval
                )
    };
}

function normalizeBranch(branch) {
    return {
        id: branch.id,

        name:
            branch.name ?? '',

        slug:
            branch.slug ?? '',

        type:
            branch.type ?? null,

        description:
            branch.description ??
            '',

        website:
            branch.website ?? null,

        address: {
            line1:
                branch.address_line_1 ??
                null,

            line2:
                branch.address_line_2 ??
                null,

            city:
                branch.city ??
                null,

            postalCode:
                branch.postal_code ??
                null,

            country:
                branch.country ??
                null,

            latitude:
                nullableNumber(
                    branch.latitude
                ),

            longitude:
                nullableNumber(
                    branch.longitude
                )
        },

        contacts:
            (branch.contacts ?? [])
                .map(normalizeContact),

        openingHours:
            (branch.opening_hours ?? [])
                .map(
                    normalizeOpeningHours
                ),

        employees:
            (branch.employees ?? [])
                .map(normalizeEmployee),

        services:
            (branch.services ?? [])
                .map(normalizeService)
    };
}

function pickCompanyIdentifier(company, candidates) {
    const branchCompanySources =
        Array.isArray(company?.branches)
            ? company.branches
                .map((branch) => {
                    return branch?.company;
                })
                .filter(Boolean)
            : [];

    const nestedCompanyCandidates = [
        company?.company,
        company?.data?.company,
        company?.companyData,
        company?.company_data,
        company?.organization,
        company?.organizationData,
        company?.organization_data
    ].filter(Boolean);

    const sources = [
        company,
        company?.identification,
        company?.identifiers,
        company?.ids,
        company?.company,
        company?.company?.identification,
        company?.company?.identifiers,
        company?.company?.ids,
        company?.data,
        company?.data?.identification,
        company?.data?.identifiers,
        company?.data?.ids,
        company?.company_data,
        company?.company_data?.identification,
        company?.company_data?.identifiers,
        company?.company_data?.ids,
        ...nestedCompanyCandidates,
        ...nestedCompanyCandidates
            .map((nestedCompany) => {
                return nestedCompany?.identification;
            })
            .filter(Boolean),
        ...nestedCompanyCandidates
            .map((nestedCompany) => {
                return nestedCompany?.identifiers;
            })
            .filter(Boolean),
        ...nestedCompanyCandidates
            .map((nestedCompany) => {
                return nestedCompany?.ids;
            })
            .filter(Boolean),
        ...branchCompanySources,
        ...branchCompanySources
            .map((nestedCompany) => {
                return nestedCompany?.identification;
            })
            .filter(Boolean),
        ...branchCompanySources
            .map((nestedCompany) => {
                return nestedCompany?.identifiers;
            })
            .filter(Boolean),
        ...branchCompanySources
            .map((nestedCompany) => {
                return nestedCompany?.ids;
            })
            .filter(Boolean)
    ].filter(Boolean);

    for (const source of sources) {
        for (const key of candidates) {
            const value = source[key];

            if (
                value !== null &&
                value !== undefined &&
                value !== ''
            ) {
                return String(value);
            }
        }
    }

    return null;
}

export function normalizeCompany(company) {
    if (!company) {
        return null;
    }

    return {
        id: company.id,

        name:
            company.name ??
            null,

        slug:
            company.slug ?? '',

        legalName:
            company.legal_name ??
            '',

        ico: pickCompanyIdentifier(company, [
            'ico',
            'company_id_number',
            'company_ico',
            'ico_number',
            'registration_number'
        ]),

        dic: pickCompanyIdentifier(company, [
            'dic',
            'tax_id',
            'company_dic',
            'dic_number',
            'tin'
        ]),

        taxId: pickCompanyIdentifier(company, [
            'tax_id',
            'dic',
            'company_dic',
            'dic_number',
            'tin'
        ]),

        icDph: pickCompanyIdentifier(company, [
            'ic_dph',
            'icdph',
            'vat_id',
            'vat_number',
            'company_vat_id'
        ]),

        email:
            company.email ?? null,

        phone:
            company.phone ?? null,

        website:
            company.website ?? null,

        address: {
            line1:
                company.address_line_1 ??
                null,

            line2:
                company.address_line_2 ??
                null,

            city:
                company.city ??
                null,

            postalCode:
                company.postal_code ??
                null,

            region:
                company.region ??
                null,

            country:
                company.country ??
                null
        },

        registeredAddress: {
            line1:
                company.address_line_1 ??
                null,

            line2:
                company.address_line_2 ??
                null,

            city:
                company.city ??
                null,

            postalCode:
                company.postal_code ??
                null,

            region:
                company.region ??
                null,

            country:
                company.country ??
                null
        },

        branches:
            (company.branches ?? [])
                .map(normalizeBranch)
    };
}