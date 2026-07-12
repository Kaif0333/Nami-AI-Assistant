import { lookup } from "node:dns/promises";
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

export const RESEARCH_DNS_RESOLVER = Symbol("RESEARCH_DNS_RESOLVER");

export type ResearchDnsResolver = (hostname: string) => Promise<readonly string[]>;

export function validateResearchUrls(urls: string[]): string[] {
  const normalizedUrls = urls.map(normalizePublicResearchUrl);
  return [...new Set(normalizedUrls)].slice(0, MAX_RESEARCH_URLS);
}

export async function validatePublicResearchUrls(
  urls: string[],
  resolver: ResearchDnsResolver = resolveResearchHostname
): Promise<string[]> {
  const normalizedUrls = validateResearchUrls(urls);

  await Promise.all(
    normalizedUrls.map(async (value) => {
      const hostname = new URL(value).hostname;
      let addresses: readonly string[];

      try {
        addresses = await resolver(hostname);
      } catch {
        throw urlNotAllowed();
      }

      if (
        addresses.length === 0 ||
        addresses.some((address) => !isPublicResearchAddress(address))
      ) {
        throw urlNotAllowed();
      }
    })
  );

  return normalizedUrls;
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

async function resolveResearchHostname(hostname: string): Promise<string[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });

  return records.map((record) => record.address);
}

export function isPublicResearchAddress(address: string) {
  if (isIP(address) === 4) {
    return isPublicIpv4Address(address);
  }

  if (isIP(address) === 6) {
    return isPublicIpv6Address(address);
  }

  return false;
}

function isPublicIpv4Address(address: string) {
  const [first, second, third, fourth] = address.split(".").map(Number);

  return !(
    first === 0 ||
    first === 10 ||
    (first === 100 && second >= 64 && second <= 127) ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0 && fourth !== 9 && fourth !== 10) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 88 && third === 99) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
}

function isPublicIpv6Address(address: string) {
  if (address.includes(".")) {
    return false;
  }

  const parts = parseIpv6Address(address);

  if (!parts) {
    return false;
  }

  if (parts.slice(0, 5).every((part) => part === 0) && parts[5] === 0xffff) {
    return isPublicIpv4Address(
      `${parts[6]! >> 8}.${parts[6]! & 0xff}.${parts[7]! >> 8}.${parts[7]! & 0xff}`
    );
  }

  return !(
    hasIpv6Prefix(parts, [0, 0, 0, 0, 0, 0, 0, 0], 128) ||
    hasIpv6Prefix(parts, [0, 0, 0, 0, 0, 0, 0, 1], 128) ||
    hasIpv6Prefix(parts, [0x64, 0xff9b, 1], 48) ||
    hasIpv6Prefix(parts, [0x100, 0, 0, 0], 64) ||
    hasIpv6Prefix(parts, [0x2001, 0], 23) ||
    hasIpv6Prefix(parts, [0x2001, 0xdb8], 32) ||
    hasIpv6Prefix(parts, [0x2002], 16) ||
    hasIpv6Prefix(parts, [0x3ffe], 16) ||
    hasIpv6Prefix(parts, [0xfc00], 7) ||
    hasIpv6Prefix(parts, [0xfe80], 10) ||
    hasIpv6Prefix(parts, [0xff00], 8)
  );
}

function parseIpv6Address(address: string) {
  const halves = address.toLowerCase().split("::");

  if (halves.length > 2) {
    return undefined;
  }

  const leftParts = halves[0] ? halves[0].split(":") : [];
  const rightParts = halves[1] ? halves[1].split(":") : [];
  const inputParts = [...leftParts, ...rightParts];
  const values = inputParts.map((part) => Number.parseInt(part, 16));

  if (
    values.some(
      (part, index) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 0xffff ||
        inputParts[index]!.length > 4
    ) ||
    (!address.includes("::") && values.length !== 8) ||
    values.length > 8
  ) {
    return undefined;
  }

  return address.includes("::")
    ? [
        ...values.slice(0, leftParts.length),
        ...Array(8 - values.length).fill(0),
        ...values.slice(leftParts.length)
      ]
    : values;
}

function hasIpv6Prefix(address: number[], prefix: number[], bits: number) {
  const fullParts = Math.floor(bits / 16);
  const partialBits = bits % 16;

  if (address.slice(0, fullParts).some((part, index) => part !== prefix[index])) {
    return false;
  }

  if (partialBits === 0) {
    return true;
  }

  const mask = (0xffff << (16 - partialBits)) & 0xffff;
  return (address[fullParts]! & mask) === (prefix[fullParts]! & mask);
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
