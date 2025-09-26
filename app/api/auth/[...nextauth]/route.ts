// /app/api/auth/[...nextauth]/route.ts ver.3 - 固定ID版

import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import type { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // 既存のデータベースIDと一致させる
      if (session?.user) {
        session.user.id = '065c6f7d-8f75-485c-a77c-bba493443e1e';
      }
      return session
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST, authOptions }
