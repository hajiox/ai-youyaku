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
```

These variables are required for Google login and API requests to work correctly. After setting them, restart the development server.
