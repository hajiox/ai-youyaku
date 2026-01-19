import dns from "node:dns/promises";
import net from "node:net";

const isPrivateIpv4 = (ip: string) => {
  const [a, b] = ip.split(".").map((octet) => Number(octet));
  if ([a, b].some((octet) => Number.isNaN(octet))) return true;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
};

const isPrivateIpv6 = (ip: string) => {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80")
  );
};

const isPrivateIp = (ip: string) => {
  const ipVersion = net.isIP(ip);
  if (ipVersion === 4) return isPrivateIpv4(ip);
  if (ipVersion === 6) return isPrivateIpv6(ip);
  return true;
};

const isDisallowedHostname = (hostname: string) => {
  const lower = hostname.toLowerCase();
  return (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal")
  );
};

export const assertSafeUrl = async (rawUrl: string) => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (error) {
    return { ok: false, error: "Invalid URL format" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, error: "Only http/https URLs are allowed" };
  }

  if (isDisallowedHostname(parsed.hostname)) {
    return { ok: false, error: "Hostname is not allowed" };
  }

  const ipVersion = net.isIP(parsed.hostname);
  if (ipVersion) {
    if (isPrivateIp(parsed.hostname)) {
      return { ok: false, error: "Private IPs are not allowed" };
    }
    return { ok: true, url: parsed };
  }

  try {
    const records = await dns.lookup(parsed.hostname, { all: true });
    if (records.length === 0) {
      return { ok: false, error: "Hostname could not be resolved" };
    }
    for (const record of records) {
      if (isPrivateIp(record.address)) {
        return { ok: false, error: "Hostname resolves to a private IP" };
      }
    }
  } catch (error) {
    return { ok: false, error: "Hostname could not be resolved" };
  }

  return { ok: true, url: parsed };
};
