import type { NextRequest } from "next/server";

const ADMIN_AUTH_COOKIE = "admin_auth";

export const getAdminAuthToken = () => {
  const token = process.env.ADMIN_AUTH_TOKEN;
  if (!token) {
    throw new Error("Missing ADMIN_AUTH_TOKEN environment variable.");
  }
  return token;
};

export const getAdminAuthCookieName = () => ADMIN_AUTH_COOKIE;

export const isAdminRequest = (req: NextRequest) => {
  const token = getAdminAuthToken();
  const cookieValue = req.cookies.get(ADMIN_AUTH_COOKIE)?.value;
  return cookieValue === token;
};
