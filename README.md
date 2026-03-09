# AI記事要約.com

This project is a Next.js application that summarizes articles using the Google Gemini API (Gemini 2.5 Flash). It supports generating summaries tailored for X, Instagram, and Threads, along with an admin dashboard for link and product management. The database is hosted on Supabase (`oem-btob` project).

## Important Security Note

APIs for mutating data in Supabase (e.g., `/api/manual-products`, `/api/registered-links`) rely on the `SUPABASE_SERVICE_ROLE_KEY` through the `supabaseAdmin` client. **Never** expose this key to the frontend.
Direct Row Level Security (RLS) policies for `anon` users have been removed to prevent unauthorized data manipulation.

## Environment Variables

Create a `.env.local` file in the project root and add the following variables:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth secret and URL
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000

# Supabase (Configured to oem-btob project)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Admin Dashboard Auth
ADMIN_AUTH_TOKEN=your-random-admin-token
ADMIN_PASSWORD=your-secure-admin-password

# Amazon Product Advertising API (Optional)
AMAZON_ACCESS_KEY_ID=your-amazon-access-key
AMAZON_SECRET_ACCESS_KEY=your-amazon-secret-key
AMAZON_PARTNER_TAG=your-partner-tag-22
```

## Database Schema (oem-btob)

The following custom tables are used:
- `registered_links`: Storing generated and registered links with OGP info.
- `manual_products`: Hand-picked products to display alongside summaries.
- `user_tone_samples`: Custom user tone presets for the AI.

To set up a fresh DB, run the `supabase_migration.sql` and `supabase_security_fix.sql` in the Supabase SQL Editor.
