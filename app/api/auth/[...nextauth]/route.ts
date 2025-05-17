// app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from "next-auth" // NextAuthOptions をインポート
import GoogleProvider from "next-auth/providers/google"

export const authOptions: NextAuthOptions = { // ★型アサーションを追加
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
    }),
  ],
  secret: process.env.AUTH_SECRET as string,
  session: { // ★ セッション戦略をjwtに指定 (デフォルトかもしれませんが明示)
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) { // ★ user, account パラメータを追加
      // Googleログイン時 (初回サインイン時など) にuserオブジェクトが存在する
      if (account && user) {
        token.id = user.id; // JWTにユーザーIDを追加
        // 必要であれば、アクセストークンなどもJWTに保存できる
        // token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // JWTの情報をセッションオブジェクトにコピーする
      if (token && session.user) {
        (session.user as any).id = token.id; // セッションのuserオブジェクトにIDを追加
        // session.accessToken = token.accessToken; // 必要であればアクセストークンも
      }
      return session;
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
