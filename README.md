# NOV

A single-owner store in the style of Selar or Gumroad, built for selling from Ghana.

- The **owner** (the only account that can sign in) creates ebooks, other digital downloads and physical items, and publishes them.
- Every published product gets a short link, `https://your-site/p/<product>`, with **Copy link** and **Share on WhatsApp** buttons.
- **Buyers** open the link on their phone, see a focused page for that one product, and pay as a guest in GH₵ (Mobile Money or card via Paystack). They don't need an account.
- **Digital** buyers get download buttons straight away, plus a link by email. **Physical** buyers enter a delivery address. The owner sees the order in the admin and marks it shipped.

Stack: Next.js 16, Prisma 7, PostgreSQL, Paystack (Flutterwave optional), Resend for email, and Cloudflare R2 for files in production.

---

## Run it locally

### 1. What you need

- **Node.js 20 or newer**. Check with `node -v`.
- **A PostgreSQL database**. Pick one:
  - **Neon (free, nothing to install):** create a project at [neon.tech](https://neon.tech) and copy its connection string.
  - **Docker:** `docker run --name nov-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16`
  - **Postgres installed on your machine:** create a database called `nov_dev`.

### 2. Install

```bash
git clone https://github.com/Ayamgenerationalthinker/NOV.git
cd NOV
npm install
```

### 3. Configure

```bash
cp .env.example .env
```

Open `.env` and set at least these:

| Variable | What to put |
| --- | --- |
| `DATABASE_URL` | Your Postgres connection string. The default works with the Docker command above. |
| `AUTH_SECRET` | A long random string. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `INITIAL_ADMIN_EMAIL` | The email you'll sign in with. |
| `INITIAL_ADMIN_PASSWORD` | Your password (at least 12 characters). |
| `PAYMENT_SIMULATION` | Leave as `true` to test purchases without any Paystack keys. |

Every variable is explained in `.env.example`.

### 4. Create the tables and your admin login

```bash
npx prisma db push      # creates the tables
npm run prisma:seed     # creates your owner account from INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD
```

The seed refuses to run if the email or password is missing; there is no default password. If you forget your password, change `INITIAL_ADMIN_PASSWORD` and run `npm run prisma:seed` again.

### 5. Start

```bash
npm run dev
```

Open <http://localhost:3000/login> and sign in with your owner email and password. You'll land in the admin at `/admin`. Nobody else can register or sign in. Buyers never need an account.

---

## Try the whole flow

1. **Create an ebook.** In the admin, go to **Products → New product → Digital**. Add a title, price in GH₵, cover image, description and "what you get" lines, choose the PDF buyers will receive, then tap **Publish**.
2. **Create a physical item.** Go to **New product → Physical**. Add a title, price, photos, description and a stock quantity. Or tick **This product has options** and give each size or colour its own stock. Then tap **Publish**.
3. **Share it.** After publishing (and in the product list) you'll see **Copy link** and **Share on WhatsApp**. Open the link in a private/incognito window: that's what buyers see.
4. **Buy as a guest.** Tap **Buy now**, fill in name, email and phone (plus a delivery address for physical items), then **Pay**.
   - With `PAYMENT_SIMULATION=true` and no Paystack key, the payment is simulated and you land on the success page.
   - With Paystack test keys (see below), you go through Paystack's test checkout.
5. **Get the goods.** The success page shows **Download** buttons for the ebook. The "receipt with download link" email is printed in the terminal running `npm run dev` until you add a `RESEND_API_KEY`. In the admin product list, the physical item's stock goes down by the quantity bought.
6. **Ship it.** Go to **Admin → Orders → To ship**, tap **Mark shipped**, and optionally add a courier and tracking number.
7. **Drafts are private.** A product saved with **Save draft** shows "not found" at its link until you publish it.

### Test with real Paystack test mode (Mobile Money / card)

1. In your Paystack dashboard, switch to **Test mode** and copy the **test** secret and public keys.
2. In `.env`, set `PAYSTACK_SECRET_KEY=sk_test_...` and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...`, and clear `PAYMENT_SIMULATION`.
3. Restart `npm run dev`. Buying now opens Paystack's test checkout. Use the test Mobile Money or card details Paystack shows in its test-mode docs.
4. Webhooks (optional locally) need a public URL. See the next section. Point the Paystack webhook to `<your public URL>/api/webhooks/paystack`.

### See the WhatsApp preview card from your laptop

WhatsApp, Instagram and Facebook fetch the preview from **their** servers, so they can't see `localhost`. Expose your dev server with a tunnel:

```bash
npx cloudflared tunnel --url http://localhost:3000     # or: ngrok http 3000
```

Set `NEXT_PUBLIC_APP_URL` in `.env` to the `https://…` address it prints, restart `npm run dev`, then copy a product link again and paste it into WhatsApp. Two things to know:
- The preview only shows an image if the product has a cover image (or a photo).
- WhatsApp caches previews, so after changing a cover, share a fresh link.

### Checks

```bash
npx tsc --noEmit   # type check
npm test           # unit tests
```

---

## Good to know

- **Payments:** Paystack is the default. An order is marked paid only after the payment is re-checked with the gateway, and only if the reference, amount (in GH₵) and order all match. Simulated payments are impossible in production, even if `PAYMENT_SIMULATION` is set.
- **Stock:** placing an order holds the stock for 30 minutes while the buyer pays. The stock only goes down for good once payment is confirmed. Abandoned checkouts release their hold automatically.
- **Files and images:** without R2 settings, uploads are stored on your computer (`public/uploads` for images, `.private_storage` for paid files). That's fine for local use, but hosting on Vercel needs Cloudflare R2 (or S3), because Vercel doesn't keep uploaded files.
- **Database changes:** the project uses `npx prisma db push` (there are no migration files yet).

## Project layout

```
prisma/            schema.prisma, seed.ts (creates the owner account)
src/app/p/[slug]   product landing page (the shareable link)
src/app/(storefront)/checkout   guest checkout and success page
src/app/(admin)/admin           owner admin (products, orders, …)
src/app/api/       API routes (admin/*, checkout, payments, webhooks, downloads)
src/services/      business logic (product, order, payment, inventory, email, storage)
src/lib/           env config, product link + purchase helpers, validators
tests/unit/        Vitest tests
```

More background is in [`docs/`](docs/). Some of those documents describe older designs.
