# Nova v2 — working site (redesign)

This is the Claude Design redesign built into a fully working site.
Your original site in `../../nova-events` is unchanged.

## Open it
Double-click `index.html`. It opens directly in your browser — no server needed.
(Needs an internet connection for the fonts, Unsplash photos and maps.)

## What's new vs. v1
- New look: Bricolage Grotesque headings + Figtree text, night-blue hero, #007bff buttons, #0066d6 for small blue text (better contrast).
- Header: flat nav, Explore / Cities menus with SVG icons, outline "Create event", ink "Sign up". Bird mark moved to footer, organiser banner and confirmation.
- Home: What / Where / When search, rotating headline, shuffling featured deck, 8 category tiles, numbered Trending row, "This week" bento, filter pills + Show more, city cards, organiser banner, newsletter.
- Search: date pills, removable filter chips, multi-select categories with counts, price/format toggles, grid/list, Show more; on phones a filter bottom sheet.
- Event page: big photo with Save/Share, ticket card pinned beside the content, key-facts grid, sticky section tabs, map + directions, FAQ, organiser card, phone buy bar.
- Checkout: stepper, fees shown per ticket, phone number asked once with MTN/Airtel auto-detect, email typo fix, big MoMo/Airtel choices, approve-on-phone countdown, ticket-style confirmation with WhatsApp share.
- Phones: bottom tab bar (Explore, Search, Tickets, Account).

Everything from v1 still works: accounts, likes, follows, tickets + QR, cancel, create/edit events, dashboard, check-in, CSV export.

## Files
- `index.html` — page shell
- `css/styles.css` (v1 base) + `css/v2.css` (redesign)
- `js/v2.js` — redesigned Home, Search, Event, Checkout + event card
- `js/views.js`, `app.js`, `store.js`, `ui.js`, `data.js`, `confetti.js` — shared logic
- `logo.jpg`, `logo2.png` — replace with licensed versions before launch (same file names)

Demo only: data is stored in the browser and payments are simulated.
