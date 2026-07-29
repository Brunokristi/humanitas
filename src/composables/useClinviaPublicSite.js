import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { usePublicSiteStore } from '../stores/publicSite'

export function useClinviaPublicSite() {
    const publicSiteStore = usePublicSiteStore()
    const {
        footerData,
        loading,
        error,
        endpoint,
        loaded
    } = storeToRefs(publicSiteStore)

    const logoFallbackFailed = ref(false)
    const fallbackLogoUrl = '/images/humanitas_logo.png'

    const data = computed(() => {
        return footerData.value ?? null
    })

    const logoUrl = computed(() => {
        const remoteLogo = data.value?.publicSite?.logoUrl

        if (!remoteLogo || logoFallbackFailed.value) {
            return fallbackLogoUrl
        }

        return remoteLogo
    })

    async function load() {
        logoFallbackFailed.value = false

        return publicSiteStore.load()
    }

    function markLogoFallbackFailed() {
        logoFallbackFailed.value = true
    }

    onMounted(() => {
        if (!loaded.value && !loading.value) {
            load()
        }
    })

    return {
        data,
        loading,
        error,
        endpoint,
        logoUrl,
        fallbackLogoUrl,
        load,
        markLogoFallbackFailed
    }
}
