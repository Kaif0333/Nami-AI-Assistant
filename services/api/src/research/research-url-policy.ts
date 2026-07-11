import { isIP } from "node:net";

import { BadRequestException } from "@nestjs/common";

import { RESEARCH_URL_NOT_ALLOWED_MESSAGE } from "./research-provider.types";

const MAX_RESEARCH_URLS = 5;
const allowedProtocols = new Set(["http:", "https:"]);
const allowedPorts = new Set(["", "80", "443"]);
const blockedHostnameSuffixes = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".home",
  ".corp"
];

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

  if (
    !allowedProtocols.has(url.protocol) ||
    !allowedPorts.has(url.port) ||
    Boolean(url.username || url.password) ||
    hostname === "localhost" ||
    !hostname.includes(".") ||
    blockedHostnameSuffixes.some((suffix) => hostname.endsWith(suffix)) ||
    isIP(hostname) !== 0
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
