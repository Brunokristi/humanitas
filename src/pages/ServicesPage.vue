<script setup>
import ContactPage from './ContactPage.vue';

const props = defineProps({
    expanded: {
        type: Boolean,
        default: false
    },

    transitioning: {
        type: Boolean,
        default: false
    }
});
</script>

<template>
    <ContactPage
        :expanded="props.expanded"
        :transitioning="props.transitioning"
    />
</template>
