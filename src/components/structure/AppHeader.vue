<script setup>
import {
    computed
} from 'vue';

import { storeToRefs } from 'pinia';

import { usePublicSiteStore } from '../../stores/publicSite';

const publicSiteStore =
    usePublicSiteStore();

const {
    company,
    currentBranch
} = storeToRefs(
    publicSiteStore
);

const displayedName = computed(() => {
    return (
        currentBranch.value?.name ??
        company.value?.name ??
        company.value?.legalName ??
        company.value?.legal_name ??
        'Humanitas'
    );
});

const displayedLogo = computed(() => {
    const path =
        currentBranch.value?.logoUrl ??
        currentBranch.value?.logo_url ??
        company.value?.logoUrl ??
        company.value?.logo_url;

    if (!path) {
        return '/images/humanitas_logo.svg';
    }

    if (
        path.startsWith('http://') ||
        path.startsWith('https://')
    ) {
        return path;
    }

    const apiBaseUrl =
        import.meta.env.VITE_CLINVIA_API_URL ??
        'https://clinvia.studiokristian.com';

    return `${apiBaseUrl}${
        path.startsWith('/')
            ? path
            : `/${path}`
    }`;
});
</script>

<template>
    <header
        class="
            pointer-events-none
            top-0
            bg-transparent
            p-5
        "
    >
        <div
            class="
                flex
                w-full
                items-center
                justify-center
            "
        >
            <RouterLink
                to="/"
                aria-label="Prejsť na domovskú stránku"
                class="
                    pointer-events-auto
                    flex
                    items-center
                    gap-1
                "
            >
                <img
                    :src="displayedLogo"
                    :alt="displayedName"
                    class="
                        h-10
                        w-auto
                        max-w-10
                        object-contain
                    "
                >

                <span
                    class="
                        heading
                        uppercase
                        text-green
                    "
                >
                    {{ displayedName }}
                </span>
            </RouterLink>
        </div>
    </header>
</template>