# Yacob Tech

Technology & Software Solutions.

## Production stack
- React 19 + Vite + TypeScript
- Framer Motion + Lucide React
- Vercel deployment and serverless API
- Supabase Auth + PostgreSQL + Row Level Security
- GitHub source control

## Production architecture
The frontend is deployed from the main branch to Vercel. Public content is served through the Vercel API backed by Supabase. Administrator operations require a Supabase session and the configured ADMIN_EMAIL allowlist.

## Required environment variables
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SERVICE_ROLE_KEY (required for secure server-side administrative writes)
- ADMIN_EMAIL
- RESEND_API_KEY (optional, for inquiry email notifications)

Never expose SUPABASE_SERVICE_ROLE_KEY to browser/client code.

## Development
```bash
npm install
npm run dev
```
