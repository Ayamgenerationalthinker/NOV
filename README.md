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
npm run db:migrate      # creates the tables
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

## Put it online (Vercel)

The repo is ready for Vercel. Every deploy runs `npm run vercel-build`, which:
1. applies the database migrations;
2. creates or updates your owner account from `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`;
3. builds the site.

One-time setup in the Vercel dashboard (**your project → Storage** and **→ Settings → Environment Variables**):

1. **Database:** Storage → **Create Database → Neon (Postgres)** → connect it to this project (all environments). This sets `DATABASE_URL` automatically.
2. **File storage:** Storage → **Create → Blob**, choose **Private**, and connect it to this project. This sets `BLOB_READ_WRITE_TOKEN`. Images and ebooks upload straight from your browser to it, so large files work.
3. **Environment variables:** add these (Production and Preview):

   | Name | Value |
   | --- | --- |
   | `AUTH_SECRET` | A long random string, 64 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `INITIAL_ADMIN_EMAIL` | Your login email. |
   | `INITIAL_ADMIN_PASSWORD` | Your password (12+ characters). Changing it and redeploying resets your password. |
   | `PAYSTACK_SECRET_KEY` | `sk_test_…` to take test payments, `sk_live_…` for real money. |
   | `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | The matching `pk_test_…` / `pk_live_…`. |
   | `RESEND_API_KEY` *(optional)* | From resend.com, so buyers get receipt emails. Without it, the download link is still shown on the success page. |
   | `EMAIL_FROM` *(optional)* | For example `NOV <orders@your-domain.com>` (a domain verified in Resend). |

   You don't need `NEXT_PUBLIC_APP_URL`: share links use your Vercel domain automatically. Set it only if you add a custom domain, for example `https://shop.example.com`.
4. **Deploy:** Deployments → the latest one → **Redeploy**. Then open `https://<your-site>/login`.
5. **Paystack webhook** *(recommended)*: in Paystack → Settings → API Keys & Webhooks, set the webhook URL to `https://<your-site>/api/webhooks/paystack`.

`PAYMENT_SIMULATION` does nothing on Vercel: real (test or live) Paystack keys are required to take payments.

---

## Good to know

- **Payments:** Paystack is the default. An order is marked paid only after the payment is re-checked with the gateway, and only if the reference, amount (in GH₵) and order all match. Simulated payments are impossible in production, even if `PAYMENT_SIMULATION` is set.
- **Stock:** placing an order holds the stock for 30 minutes while the buyer pays. The stock only goes down for good once payment is confirmed. Abandoned checkouts release their hold automatically.
- **Files and images:** locally, uploads are stored on your computer (`public/uploads` for images, `.private_storage` for paid files). On Vercel they go to a private Vercel Blob store (see below). Paid files are only ever reachable through short-lived download links.
- **Database changes:** tables are created by migrations in `prisma/migrations` (`npm run db:migrate`). Vercel runs them automatically on every deploy.

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
