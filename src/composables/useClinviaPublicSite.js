import { computed, onMounted, ref } from 'vue'
import {
    buildClinviaPublicEndpoint,
    normalizeClinviaPublicFooterData
} from '../utils/clinviaFooter'

export function useClinviaPublicSite() {
    const data = ref(null)
    const loading = ref(true)
    const error = ref(null)
    const logoFallbackFailed = ref(false)

    const endpoint = computed(() => {
        const companyIdentifier =
            import.meta.env.VITE_CLINVIA_COMPANY_ID ||
            import.meta.env.VITE_CLINVIA_COMPANY_SLUG ||
            import.meta.env.VITE_CLINVIA_COMPANY_IDENTIFIER

        if (!companyIdentifier) {
            return null
        }

        if (import.meta.env.DEV) {
            return `/clinvia-proxy/public/companies/${encodeURIComponent(companyIdentifier)}`
        }

        return buildClinviaPublicEndpoint(
            import.meta.env.VITE_CLINVIA_API_URL,
            companyIdentifier
        )
    })

    const branchIdentifier = computed(() => {
        return (
            import.meta.env.VITE_CLINVIA_BRANCH_ID ||
            import.meta.env.VITE_CLINVIA_BRANCH_SLUG ||
            import.meta.env.VITE_CLINVIA_BRANCH_IDENTIFIER ||
            null
        )
    })

    const fallbackLogoUrl = '/images/humanitas_logo.png'

    const logoUrl = computed(() => {
        const remoteLogo = data.value?.publicSite?.logoUrl

        if (!remoteLogo || logoFallbackFailed.value) {
            return fallbackLogoUrl
        }

        return remoteLogo
    })

    async function load() {
        loading.value = true
        error.value = null
        logoFallbackFailed.value = false

        const apiKey = import.meta.env.VITE_CLINVIA_API_KEY
        const requestUrl = endpoint.value

        if (!requestUrl) {
            data.value = null
            loading.value = false
            return
        }

        try {
            const response = await fetch(requestUrl, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    ...(!import.meta.env.DEV && apiKey
                        ? {
                            'X-API-Key': apiKey
                        }
                        : {})
                }
            })

            if (!response.ok) {
                throw new Error(`Clinvia request failed with status ${response.status}`)
            }

            const payload = await response.json()
            data.value = normalizeClinviaPublicFooterData(payload, {
                branchIdentifier: branchIdentifier.value
            })
        } catch (fetchError) {
            data.value = null
            error.value = fetchError instanceof Error
                ? fetchError.message
                : 'Údaje sa nepodarilo načítať.'
        } finally {
            loading.value = false
        }
    }

    function markLogoFallbackFailed() {
        logoFallbackFailed.value = true
    }

    onMounted(() => {
        load()
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
