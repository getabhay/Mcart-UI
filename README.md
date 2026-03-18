This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Deploy on AWS Amplify

This repo includes `amplify.yml` for Amplify Hosting. The recommended flow is:

1. In AWS Amplify Console, connect this GitHub repo and select `main`.
2. Set env vars in Amplify:
   - `SEARCH_SERVICE_BASE_URL`
   - `PRODUCT_SERVICE_BASE_URL`
   - Verify with `https://<your-app>/api/envcheck` after deploy.
3. Enable branch protection in GitHub to require 1 approval + `CI / build` before merge.

Amplify will auto-deploy on each merge to `main`.
