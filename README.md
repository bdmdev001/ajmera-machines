This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment configuration

All secrets/config are read from environment variables — **nothing is hardcoded**.
Next.js loads `.env` automatically, so no `dotenv` package is needed.

1. Copy the template and fill in real values:

   ```bash
   cp .env.example .env
   ```

2. Variables:

   | Variable | What it is | Where to get it |
   | --- | --- | --- |
   | `MONGODB_URI` | MongoDB Atlas connection string | Atlas → **Connect** → **Drivers**. URL-encode special chars in the password (`@` → `%40`). Keep the `/<dbname>` segment. |
   | `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials | Cloudinary dashboard → **Account Details** |
   | `CLOUDINARY_URL` | Single-string form of the above (optional convenience) | Cloudinary dashboard |
   | `CLOUDINARY_UPLOAD_FOLDER` | Folder new uploads land in (default `ajmera/machines`) | your choice |
   | `PORT` / `NODE_ENV` | Dev server port / environment | — |
   | `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Admin login credentials | your choice |
   | `ADMIN_SESSION_TOKEN` | Secret value stored in the admin session cookie (was previously hardcoded) | generate with `openssl rand -hex 32` |

   > `.env` is git-ignored; `.env.example` (placeholders only) is committed.

3. **MongoDB Atlas — one-time setup**
   - Create a cluster, a **Database User**, and under **Network Access** add your
     IP (or `0.0.0.0/0` for dev). Without this, connections time out with an
     *"IP that isn't whitelisted"* error.

### Architecture notes
- **DB connection:** `src/lib/dbConnect.ts` (cached Mongoose connection, logs
  success/failure). This is the Next.js equivalent of a `config/db.js`.
- **Models:** `src/models/Product.ts` and `src/models/Enquiry.ts` (Mongoose,
  typed, validated, `timestamps: true`). This is a catalogue + enquiry site, so
  there is no `Orders` model, and admin auth is env-based (no `Users` collection).
- **Image uploads:** `src/lib/cloudinary.ts` streams uploads to Cloudinary via
  the SDK; only the `secure_url` + `public_id` are stored in MongoDB
  (`images[]` / `imagePublicIds[]`). `src/lib/images.ts#imageUrl()` renders
  either a Cloudinary URL (new) or a legacy `/public/machines` filename (old).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
