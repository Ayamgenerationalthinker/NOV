# Audit checklist check (3 November 2026)

This report goes through the checklist in section 10 of *Tomevari UI/UX Audit & Improvement Plan* (27 October 2026) against branch `redesign/storefront`.

**Where it was tested:** a local copy with a throwaway database that holds the 12 live guides, using simulated payments. Production was not touched.

**Status key:**
- **Pass:** tested and working.
- **Code:** confirmed by reading the code and its tests.
- **Owner:** needs the owner's input or a real-world test.

## Analytics and acquisition

| Item | Status | Notes |
|---|---|---|
| Date range and timezone confirmed | Pass | The Visitors page shows Today, 7, 30 and 90 days in Africa/Accra time. |
| Unique visitors, visits, views, de-duplication | Code | An anonymous visitor ID and a 30-minute session ID are kept. A buyer's own receipt counts the purchase once. |
| Owner traffic and bots excluded | Code | Bot user agents are dropped. The signed-in owner and the owner pages are never counted. |
| Funnel events | Pass | `page_view`, `buy_click`, `checkout_submit`, `purchase` and the new `download` event are recorded. Payment truth stays on the server (verified orders). |
| UTM tags recorded | Code | `utm_source` is stored as the visit source, falling back to the referring site. |
| Device, product and source views | Pass | The Visitors page shows top pages, sources, countries and devices. |

## Homepage and discovery

| Item | Status | Notes |
|---|---|---|
| First screen says what is sold and who it helps | Pass | The hero names PDF guides and the four audiences, priced in GH₵. |
| Primary and secondary actions distinct | Pass | A solid blue "Explore the guides" button sits beside an outline "Browse by goal" button. |
| Browse by goal | Pass | Five goal tiles link to filtered shop pages; Freelancing shows 2 guides. |
| Cards show cover, outcome, price, one action | Pass | Each card has the cover, a one-line outcome, the audience, the price and "View guide". |
| Search and filters, useful empty results | Pass | "meal" finds 1 guide. No match shows "Show all guides", which resets to 12. |
| Testimonials genuine | Owner | Only stories the owner publishes appear. The owner must confirm each published one is real and given with permission. |

## Product pages

| Item | Status | Notes |
|---|---|---|
| First screen: audience, benefit, format, price | Pass | Title, outcome, audience, GH₵ price, Buy, then format and file size. |
| Sample pages or table of contents | Owner | A "Look inside" section appears once gallery images are added. None of the guides has any yet. |
| Scannable, realistic descriptions | Owner | Includes a limitations line. Several "What you get" lists repeat marketing text. |
| Reference prices accurate | Pass | No crossed-out prices are in use. |
| Delivery, support and refund terms easy to find | Pass | Shown beside Buy, with a link to the FAQ. |
| Buy gives predictable feedback | Pass | The line under Buy explains the next step, and a buy bar appears on phones. |

## Payment and delivery

| Item | Status | Notes |
|---|---|---|
| Amount, currency, product and reference match | Code | The server checks the amount and currency against the order and the stored transaction before marking it paid. |
| Payment verified server-side and through a signed webhook | Code | Paystack webhooks are checked with HMAC-SHA512 and a timing-safe comparison. Success is re-verified with Paystack. |
| Duplicate webhooks and double taps make no duplicates | Pass | A double tap on Pay made one checkout call. Duplicate webhooks are acknowledged and ignored. |
| Failed, cancelled, pending and delayed payments recover safely | Pass | All five states were shown on an unpaid order. "Please don't pay again" hides Try again. |
| Receipt page cannot mark an order paid | Code | The receipt only asks the server to re-verify with Paystack. |
| Only paid orders can download | Pass | A paid order downloaded the PDF. An unknown order returned 404, and unpaid orders return 403. |
| Download and email failure recoverable | Owner | The receipt page shows downloads and a support line. Email sending (Resend) is still not set up. |

## Mobile, accessibility, performance, SEO

| Item | Status | Notes |
|---|---|---|
| Main journeys work on desktop and mobile | Pass | Tested at 1440, 390 and 360 px wide. |
| No horizontal overflow or clipped controls | Pass | No page scrolls sideways at any of those widths. |
| Keyboard, focus, labels, contrast, errors | Pass | 2px focus ring. Contrast is AA (lowest text pair 5.26:1). Errors use `role="alert"`. Status is shown in words, not colour alone. |
| Performance measured | Pass | Covers are now resized and compressed. Phone image weight went from about 7.4 MB to under 30 KB per page. Field Core Web Vitals still need measuring on the live site. |
| Images sized and compressed, heavy scripts removed | Pass | The three.js home scenes, GSAP and Lenis were removed. Covers go through the Next.js image optimiser. |
| Unique titles, headings, metadata, crawlable content | Pass | Each page has one h1 and its own title and canonical. Product pages carry Product structured data (name, GH₵ price, availability). |
| Sitemap, canonical URLs, robots | Pass | New `/sitemap.xml` lists home, the shop and all 12 guides. New `/robots.txt` keeps checkout, sign-in and admin out of search. |

## Owner jobs tested end to end

- Sign in works; a wrong password is refused, and signed-out visitors are sent to sign-in.
- All 14 owner screens load.
- A new coupon worked at checkout (GH₵25.00 became GH₵22.50), and an invalid code shows a message.
- Unpublishing a guide removed it from the shop (12 to 11, and its page returned 404). Publishing brought it back.
- A new guide saved as a draft shows in the admin but never in the shop.
- A paid order appears in Orders and on the dashboard.
- A reader story was submitted, published, and then shown on Home.

## Fixed during this check

- Added `/sitemap.xml`, `/robots.txt` and Product structured data.
- Added the `download` visitor event.
- Covers are now resized for each screen.
- Coupon amounts are labelled in GH₵, where they used to say "$".
- Fallback currency is GH₵ (was USD).

## Still needs the owner

- Make one real low-value Mobile Money purchase on the live site to confirm Paystack, the receipt and the download.
- Set up email sending (Resend) so receipts and download links are emailed.
- Add real sample pages to guides, and review long "What you get" lists.
- Fix three product details:
  - "Beginner Money Management Kit": the title says money, but the content is general management.
  - "(USD Edition)": the name says USD, but the price is in GH₵.
  - Better AI Prompting Guide's web address is `/p/hjbhv`.
- Confirm that published testimonials are real.
- Download links work for anyone who has the order's unique receipt link. That is normal for guest checkout, but a signed, expiring link sent by email would be stronger.
