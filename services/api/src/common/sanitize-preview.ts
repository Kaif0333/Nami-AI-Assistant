const SECRET_KEY_PATTERN =
  /(api[_-]?key|secret|token|password|credential|authorization|cookie)/i;

export function sanitizePreview<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePreview(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? "[redacted]" : sanitizePreview(item)
      ])
    ) as T;
  }

  if (typeof value === "string" && looksLikeSecret(value)) {
    return "[redacted]" as T;
  }

  return value;
}

export function containsSecretLikeValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsSecretLikeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(
      ([key, item]) =>
        SECRET_KEY_PATTERN.test(key) || containsSecretLikeValue(item)
    );
  }

  return typeof value === "string" && looksLikeSecret(value);
}

function looksLikeSecret(value: string) {
  return (
    /sk-[A-Za-z0-9_-]{10,}/.test(value) ||
    /ghp_[A-Za-z0-9_]{10,}/.test(value) ||
    /xox[baprs]-[A-Za-z0-9-]{10,}/.test(value) ||
    /(api[_ -]?key|secret|token|password)\s*[:=]\s*\S+/i.test(value)
  );
}
