# AI記事要約.com

This project is a Next.js application that summarizes articles using OpenAI. It also supports Google login via NextAuth and stores user data in Supabase.

## Environment variables

Create a `.env.local` file in the project root and add the following variables:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth secret and URL
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Amazon Product Advertising API
AMAZON_ACCESS_KEY_ID=your-amazon-access-key
AMAZON_SECRET_ACCESS_KEY=your-amazon-secret-key
AMAZON_PARTNER_TAG=your-partner-tag-22
NEXT_PUBLIC_AMAZON_PARTNER_TAG=your-partner-tag-22
# Optional overrides (defaults target Amazon.co.jp)
# AMAZON_API_REGION=us-west-2
# AMAZON_API_HOST=webservices.amazon.co.jp
# AMAZON_MARKETPLACE=www.amazon.co.jp
```

These variables are required for Google login and API requests to work correctly. The Amazon settings enable the product showcase that appears next to the summaries.
After setting them, restart the development server.
