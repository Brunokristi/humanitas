<script setup>
import Button from './Button.vue';

const props = defineProps({
    service: {
        type: Object,
        required: true
    }
});

const emit = defineEmits([
    'open'
]);

function trimText(
    value,
    maxLength
) {
    const text =
        String(
            value ?? ''
        ).trim();

    if (!text) {
        return '';
    }

    if (
        text.length <=
        maxLength
    ) {
        return text;
    }

    return `${text
        .slice(
            0,
            maxLength
        )
        .trim()}...`;
}

function rawServiceDescription() {
    return (
        props.service?.description ??
        props.service?.shortDescription ??
        props.service?.short_description ??
        ''
    );
}

function serviceTitle() {
    return trimText(
        props.service?.name,
        80
    );
}

function serviceDescription() {
    return trimText(
        rawServiceDescription(),
        80
    );
}

function serviceDurationLabel() {
    const minutes =
        props.service?.durationMinutes ??
        props.service?.duration_minutes;

    const sessions =
        props.service?.durationSessions ??
        props.service?.duration_sessions;

    if (!minutes) {
        return null;
    }

    if (
        sessions &&
        sessions > 1
    ) {
        return `${sessions} × ${minutes} min`;
    }

    return `${minutes} min`;
}

function selfPayPrice() {
    return (
        props.service?.selfPayAmount ??
        props.service?.self_pay_amount ??
        null
    );
}

function hasSelfPayPrice() {
    return (
        selfPayPrice() !==
        null
    );
}
</script>

<template>
    <div
        class="
            flex
            h-full
            w-full
            flex-col
        "
    >
        <!-- Title -->
        <div
            class="
                min-h-[5.5rem]
                shrink-0
            "
        >
            <h3
                class="
                    text-regular
                    line-clamp-3
                    text-xl
                    font-bold
                    leading-[1.3]
                    text-green
                "
            >
                {{ serviceTitle() }}
            </h3>
        </div>

        <!-- Description -->
        <div
            class="
                min-h-[3rem]
                shrink-0
            "
        >
            <p
                v-if="
                    serviceDescription()
                "
                class="
                    text-regular
                    line-clamp-2
                    text-sm
                    leading-6
                    text-green
                "
            >
                {{ serviceDescription() }}
            </p>
        </div>

        <!-- Metadata -->
        <div
            class="
                mt-5
                flex
                min-h-[4.25rem]
                shrink-0
                flex-col
                gap-3
            "
        >
            <div
                class="
                    min-h-5
                    shrink-0
                "
            >
                <div
                    v-if="
                        serviceDurationLabel()
                    "
                    class="
                        border-l-2
                        border-green
                        pl-3
                    "
                >
                    <p
                        class="
                            text-regular
                            font-bold
                            leading-5
                            text-green
                        "
                    >
                        {{
                            serviceDurationLabel()
                        }}
                    </p>
                </div>
            </div>

            <div
                class="
                    min-h-5
                    shrink-0
                "
            >
                <div
                    v-if="
                        hasSelfPayPrice()
                    "
                    class="
                        border-l-2
                        border-green
                        pl-3
                    "
                >
                    <p
                        class="
                            text-regular
                            font-bold
                            leading-5
                            text-green
                        "
                    >
                        {{ selfPayPrice() }}
                        €
                    </p>
                </div>
            </div>
        </div>

        <!-- CTA -->
        <div
            class="
                mt-auto
                flex
                w-full
                shrink-0
                justify-center
                pt-2
            "
        >
            <Button
                background-image=""
                background-color="var(--color-green)"
                text-color="var(--color-baige)"
                @click.stop="
                    emit(
                        'open'
                    )
                "
            >
                Viac o službe
            </Button>
        </div>
    </div>
</template>