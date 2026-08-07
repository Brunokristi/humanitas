<script setup>
import AppShell from './components/structure/AppShell.vue'
import { usePublicSiteStore } from './stores/publicSite'

const publicSiteStore = usePublicSiteStore()

publicSiteStore.load()
</script>

<template>
    <AppShell />
</template>