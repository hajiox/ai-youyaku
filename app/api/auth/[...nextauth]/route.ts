// app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { SupabaseAdapter } from "@next-auth/supabase-adapter"; // ★ Supabaseアダプターをインポート
import { supabase } from "@/lib/supabaseClient"; // ★ Supabaseクライアントをインポート (パスが正しいか確認)
import jwt from "jsonwebtoken"; // ★ JWTの型や関数を使う場合 (今回は直接は使わないが、参考として)

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY as string, // ★ 重要：サービスロールキーが必要
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
    }),
  ],
  session: {
    strategy: "jwt", // JWTセッション戦略を推奨 (アダプター使用時も)
  },
  callbacks: {
    async session({ session, token }) {
      // JWTトークンからSupabaseのユーザーID (sub) をセッションのuser.idに割り当てる
      if (token.sub && session.user) {
        session.user.id = token.sub; // token.sub が Supabase の user.id (UUID) になる
      }
      // 他にセッションに追加したい情報があればここで行う
      // 例: session.user.role = token.role; (もしJWTにroleを含めていれば)
      return session;
    },
    async jwt({ token, user, account, profile }) {
      // ユーザーがサインインしたとき (user オブジェクトが存在するとき)
      // または、アダプターがユーザー情報をDBに保存/更新した後に、
      // JWTトークンに必要な情報（特にSupabaseのユーザーID）を格納する。
      // Supabaseアダプターを使用すると、user.id にはSupabaseのusersテーブルのUUIDが自動的に入るはず。
      if (user) {
        token.id = user.id; // SupabaseユーザーのUUID
        // token.sub = user.id; // JWTのsubjectとしても設定されることが多い
      }
      // OAuthプロバイダからのアクセストークンなどをJWTに含めたい場合はここ
      // if (account) {
      //   token.accessToken = account.access_token;
      // }
      return token;
    },
  },
  secret: process.env.AUTH_SECRET as string, // これはNextAuth.js自体のシークレット
  // pages: { // 必要に応じてカスタムページを指定
  //   signIn: '/auth/signin',
  //   // signOut: '/auth/signout',
  //   // error: '/auth/error', // Error code passed in query string as ?error=
  //   // verifyRequest: '/auth/verify-request', // (e.g. for email verification)
  //   // newUser: '/auth/new-user' // New users will be directed here on first sign in (leave the property out to disable)
  // }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
