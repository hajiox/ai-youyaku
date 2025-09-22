export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  const {
    AMAZON_ACCESS_KEY_ID,
    AMAZON_SECRET_ACCESS_KEY,
    AMAZON_PARTNER_TAG,
    AMAZON_MARKETPLACE,
  } = process.env;

  const id = (AMAZON_ACCESS_KEY_ID || "").trim();
  const secret = (AMAZON_SECRET_ACCESS_KEY || "").trim();
  const tag = (AMAZON_PARTNER_TAG || "").trim();
  const marketplace = (AMAZON_MARKETPLACE || "www.amazon.co.jp").trim();

  return NextResponse.json({
    // ここだけで個人情報は出さない（プレフィックスだけ）
    hasId: Boolean(id),
    idPrefix: id ? id.slice(0, 4) : null,
    hasSecret: Boolean(secret),
    secretLen: secret ? secret.length : 0,
    hasTag: Boolean(tag),
    tag,
    marketplace,
    notes: [
      "hasId/hasSecret/hasTag が全て true になること",
      "tag は -22 を含む JP 用トラッキングID",
      "marketplace は www.amazon.co.jp でOK",
    ],
  });
}
