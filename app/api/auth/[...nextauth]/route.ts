// app/api/auth/[...nextauth]/route.ts
// NextAuth + Supabase Adapter 設定ファイル（Next 15 / App Router）
// --------------------------------------------------------------
// 変更ポイント:
// 1. 環境変数名を NextAuth / Supabase-Adapter が参照する正しい名前に統一
//    - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
//    - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
//    - NEXTAUTH_SECRET
// 2. `supabaseClient` はここでは未使用なのでインポートを削除
// 3. `process.env.<VAR>!` を使い、存在しない場合はビルド時に型エラー
// --------------------------------------------------------------


import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { SupabaseAdapter } from "@next-auth/supabase-adapter";

export const authOptions: NextAuthOptions = {
  // Supabase Adapter の設定
  adapter: SupabaseAdapter({
    // ※ クライアントサイドから見えない環境変数名を使用
    url: process.env.SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),

  // OAuth プロバイダー
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  // JWT ベースのセッション
  session: {
    strategy: "jwt",
  },

  // コールバックで Supabase UUID をセッションに載せる
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        // Supabase users テーブルの UUID
        token.id = user.id;
      }
      return token;
    },
  },

  // NextAuth 自体の暗号化キー
  secret: process.env.NEXTAUTH_SECRET!,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
