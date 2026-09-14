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

You can start editing the page by modifying `src/app/(public)/page.tsx`. The page auto-updates as you edit the file.

## Source structure

- `src/app`: App Router routes, layouts, global styles, and favicon. The existing homepage lives in `(public)` and still serves `/`.
- `(auth)` and `(customer)`: route groups reserved for future authentication and customer pages. `staff`, `manager`, and `admin` reserve role-specific URL paths.
- `src/components/{ui,layout,common,feedback}`: shared presentation components.
- `src/features/{auth,movie,cinema,showtime,seat,booking,concession,payment,ticket,check-in}`: future domain-specific code.
- `src/lib/{api,auth,utils,constants}`: shared infrastructure and helpers.
- `src/hooks`, `src/types`, `src/config`, and `src/mocks`: shared hooks, types, configuration, and mock data.
- `public/images/{movies,cinemas,concessions}` and `public/icons`: future static assets. Existing SVG URLs are unchanged.

Use `@/` for source imports; it resolves to `src/`. Keep configuration and `.env.local` at the frontend root. `.env.local` is ignored by Git and no environment variables are required yet.

Empty folders contain `.gitkeep` files so Git retains the structure. Reserved routes have no `page.tsx` yet and do not expose new pages. Group layouts only return their children. Loading, error, and not-found files are deferred to preserve the existing framework behavior during this structural refactor.

Validate with `pnpm lint` and `pnpm exec next typegen`, followed by `pnpm exec tsc --noEmit`. Start development with `pnpm dev`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
