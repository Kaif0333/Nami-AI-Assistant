import { isIP } from "node:net";

import { BadRequestException } from "@nestjs/common";

import { RESEARCH_URL_NOT_ALLOWED_MESSAGE } from "./research-provider.types";

const MAX_RESEARCH_URLS = 5;
const allowedProtocols = new Set(["http:", "https:"]);
const allowedPorts = new Set(["", "80", "443"]);
const maxUrlDecodeRounds = 4;
const blockedHostnameSuffixes = [
  ".test",
  ".example",
  ".invalid",
  ".localhost",
  ".localdomain",
  ".local",
  ".internal",
  ".lan",
  ".home",
  ".corp",
  ".home.arpa",
  ".onion",
  ".nip.io",
  ".sslip.io",
  ".localtest.me",
  ".lvh.me",
  ".vcap.me",
  ".localhost.direct",
  ".local.gd",
  ".traefik.me"
];
const secretLikeResearchPathPattern =
  /(?:^|[\\/])(?:api[_-]?key|secrets?|(?:access[_-]?)?tokens?|passwords?|credentials?|authorization|cookie)(?:[\\/:=]|$)/i;
const secretLikeResearchValuePattern =
  /(sk-[A-Za-z0-9_-]{10,}|ghp_[A-Za-z0-9_]{10,}|xox[baprs]-[A-Za-z0-9-]{10,}|(api[_ -]?key|secret|token|password|credential|authorization|cookie)\s*[:=]\s*\S+)/i;

export function validateResearchUrls(urls: string[]): string[] {
  const normalizedUrls = urls.map(normalizePublicResearchUrl);
  return [...new Set(normalizedUrls)].slice(0, MAX_RESEARCH_URLS);
}

function normalizePublicResearchUrl(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw urlNotAllowed();
  }

  const hostname = url.hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .toLowerCase();
  const decodedPathname = decodeUrlComponent(url.pathname);
  const decodedQuery = decodeUrlComponent(url.search);
  const decodedFragment = decodeUrlComponent(url.hash);

  if (
    !allowedProtocols.has(url.protocol) ||
    !allowedPorts.has(url.port) ||
    Boolean(url.username || url.password) ||
    hostname === "localhost" ||
    !hostname.includes(".") ||
    blockedHostnameSuffixes.some(
      (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix)
    ) ||
    isIP(hostname) !== 0 ||
    !decodedPathname ||
    decodedQuery === undefined ||
    decodedFragment === undefined ||
    [hostname, decodedPathname, decodedQuery, decodedFragment].some(
      isSecretLikeResearchValue
    ) ||
    secretLikeResearchPathPattern.test(decodedPathname)
  ) {
    throw urlNotAllowed();
  }

  url.search = "";
  url.hash = "";

  return url.toString();
}

function isSecretLikeResearchValue(value: string) {
  return secretLikeResearchValuePattern.test(value);
}

function decodeUrlComponent(value: string) {
  let decoded = value;

  for (let round = 0; round < maxUrlDecodeRounds; round += 1) {
    try {
      const next = decodeURIComponent(decoded);

      if (next === decoded) {
        return decoded;
      }

      decoded = next;
    } catch {
      return undefined;
    }
  }

  return /%[0-9A-Fa-f]{2}/.test(decoded) ? undefined : decoded;
}

function urlNotAllowed() {
  return new BadRequestException({
    code: "RESEARCH_URL_NOT_ALLOWED",
    message: RESEARCH_URL_NOT_ALLOWED_MESSAGE,
    details: {}
  });
}
