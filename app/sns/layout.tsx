// /app/sns/layout.tsx ver.1
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SNS投稿最適化ツール | AI記事要約.com",
  description: "1つの素材から4つのSNSに最適化された投稿を自動生成",
};

export default function SNSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
