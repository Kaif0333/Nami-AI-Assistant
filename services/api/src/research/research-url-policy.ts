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
blockedAddresses.addSubnet("192.0.0.0", 24, "ipv4");
blockedAddresses.addSubnet("192.0.2.0", 24, "ipv4");
blockedAddresses.addSubnet("192.31.196.0", 24, "ipv4");
blockedAddresses.addSubnet("192.52.193.0", 24, "ipv4");
blockedAddresses.addSubnet("192.88.99.0", 24, "ipv4");
blockedAddresses.addSubnet("192.175.48.0", 24, "ipv4");
blockedAddresses.addSubnet("192.168.0.0", 16, "ipv4");
blockedAddresses.addSubnet("198.18.0.0", 15, "ipv4");
blockedAddresses.addSubnet("198.51.100.0", 24, "ipv4");
blockedAddresses.addSubnet("203.0.113.0", 24, "ipv4");
blockedAddresses.addSubnet("224.0.0.0", 4, "ipv4");
blockedAddresses.addSubnet("240.0.0.0", 4, "ipv4");
blockedAddresses.addAddress("::", "ipv6");
blockedAddresses.addAddress("::1", "ipv6");
blockedAddresses.addSubnet("100::", 64, "ipv6");
blockedAddresses.addSubnet("2001::", 23, "ipv6");
blockedAddresses.addSubnet("2001:db8::", 32, "ipv6");
blockedAddresses.addSubnet("fc00::", 7, "ipv6");
blockedAddresses.addSubnet("fe80::", 10, "ipv6");
blockedAddresses.addSubnet("ff00::", 8, "ipv6");

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
  const mappedIpv4Address =
    addressFamily === 6 ? ipv4FromMappedIpv6(hostname) : undefined;

  if (
    !allowedProtocols.has(url.protocol) ||
    !allowedPorts.has(url.port) ||
    Boolean(url.username || url.password) ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    (addressFamily === 4 && blockedAddresses.check(hostname, "ipv4")) ||
    (addressFamily === 6 && blockedAddresses.check(hostname, "ipv6")) ||
    (mappedIpv4Address !== undefined &&
      blockedAddresses.check(mappedIpv4Address, "ipv4"))
  ) {
    throw urlNotAllowed();
  }

  return url.toString();
}

function ipv4FromMappedIpv6(address: string): string | undefined {
  const [beforeCompression, afterCompression = ""] = address.split("::");
  const leadingGroups = beforeCompression ? beforeCompression.split(":") : [];
  const trailingGroups = afterCompression ? afterCompression.split(":") : [];
  const missingGroups = 8 - leadingGroups.length - trailingGroups.length;

  if (missingGroups < 0 || address.split("::").length > 2) {
    return undefined;
  }

  const groups = [
    ...leadingGroups,
    ...Array.from({ length: missingGroups }, () => "0"),
    ...trailingGroups
  ];

  if (
    groups.length !== 8 ||
    !groups.slice(0, 5).every((group) => Number.parseInt(group, 16) === 0) ||
    Number.parseInt(groups[5] ?? "", 16) !== 0xffff
  ) {
    return undefined;
  }

  const highWord = Number.parseInt(groups[6] ?? "", 16);
  const lowWord = Number.parseInt(groups[7] ?? "", 16);

  if (Number.isNaN(highWord) || Number.isNaN(lowWord)) {
    return undefined;
  }

  return [highWord >> 8, highWord & 0xff, lowWord >> 8, lowWord & 0xff].join(
    "."
  );
}

function urlNotAllowed() {
  return new BadRequestException({
    code: "RESEARCH_URL_NOT_ALLOWED",
    message: RESEARCH_URL_NOT_ALLOWED_MESSAGE,
    details: {}
  });
}
