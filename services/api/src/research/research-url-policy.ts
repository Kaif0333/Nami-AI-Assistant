import { BlockList, isIP } from "node:net";

import { BadRequestException } from "@nestjs/common";

import { RESEARCH_URL_NOT_ALLOWED_MESSAGE } from "./research-provider.types";

const MAX_RESEARCH_URLS = 5;
const allowedProtocols = new Set(["http:", "https:"]);
const allowedPorts = new Set(["", "80", "443"]);
const blockedAddresses = new BlockList();

blockedAddresses.addSubnet("0.0.0.0", 8, "ipv4");
blockedAddresses.addSubnet("10.0.0.0", 8, "ipv4");
blockedAddresses.addSubnet("100.64.0.0", 10, "ipv4");
blockedAddresses.addSubnet("127.0.0.0", 8, "ipv4");
blockedAddresses.addSubnet("169.254.0.0", 16, "ipv4");
blockedAddresses.addSubnet("172.16.0.0", 12, "ipv4");
blockedAddresses.addSubnet("192.168.0.0", 16, "ipv4");
blockedAddresses.addSubnet("224.0.0.0", 4, "ipv4");
blockedAddresses.addAddress("::1", "ipv6");
blockedAddresses.addSubnet("fc00::", 7, "ipv6");
blockedAddresses.addSubnet("fe80::", 10, "ipv6");

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
  const addressFamily = isIP(hostname);

  if (
    !allowedProtocols.has(url.protocol) ||
    !allowedPorts.has(url.port) ||
    Boolean(url.username || url.password) ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    (addressFamily === 4 && blockedAddresses.check(hostname, "ipv4")) ||
    (addressFamily === 6 && blockedAddresses.check(hostname, "ipv6"))
  ) {
    throw urlNotAllowed();
  }

  return url.toString();
}

function urlNotAllowed() {
  return new BadRequestException({
    code: "RESEARCH_URL_NOT_ALLOWED",
    message: RESEARCH_URL_NOT_ALLOWED_MESSAGE,
    details: {}
  });
}
