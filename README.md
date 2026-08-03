# Card Interface Prototype

Small standalone frontend prototype for testing an experimental card-based website interface.

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

### Contact Form (PHP API)

The contact form submits to `/api/contact.php`.
In local development this is proxied by Vite to a local PHP server.

1. Copy the env file and fill mail settings:

```bash
cp .env.example .env
```

Required keys:

- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_ENCRYPTION`
- `MAIL_FROM_ADDRESS`
- `MAIL_FROM_NAME`
- `CONTACT_MAIL_TO`

Optional dev API URL (default is already set):

- `VITE_CONTACT_API_URL=http://127.0.0.1:8080`

2. Start the PHP API server in one terminal:

```bash
npm run dev:api
```

3. Start Vite in another terminal:

```bash
npm run dev
```

## Production Build

```bash
npm run build
```

## Interface States

- `stacked`: Apple Wallet-like vertical stack with visible card tops.
- `scattered`: cards spread with deterministic horizontal offsets and rotation.
- `browsing`: front card can be swiped horizontally; next card is subtly revealed.
- `expanded`: active card grows into a page-like card while shell UI remains behind.

## Main Components

- `src/components/AppShell.vue`: global shell, background layer, and keyboard Escape handling.
- `src/components/AppHeader.vue`: top-left logo placeholder and top-right menu button.
- `src/components/AppFooter.vue`: minimal footer anchored near the bottom.
- `src/components/CardStage.vue`: renders and orders cards, wires events to state.
- `src/components/PageCard.vue`: shared card element for preview and expanded states.
- `src/components/CardPreview.vue`: compact card preview content.
- `src/components/CardExpandedContent.vue`: scrollable expanded card content.

## Card Data

Edit page/card content in `src/data/pages.js`.

## Animation Timing

Adjust state transition timing in `src/composables/useCardStack.js`:

- `transitionMs()` controls global transition duration.
- `discardFrontCard()` controls swipe-away timing.

Drag thresholds are in `src/composables/useCardDrag.js` and configured from `src/composables/useCardStack.js`.

## Known Limitations

- The prototype uses placeholder content and minimal localization strategy.
- No persistence for per-user card order; order resets on hard reload.
- Gestures are tuned for 3 cards; adding many cards may require tuning offsets and depth behavior.
- Expanded-card downward drag is intentionally limited to the top handle and only when content is at scroll top.
