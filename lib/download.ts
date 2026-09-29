// RFC 6266 / 5987: keep the original Unicode name, with an ASCII fallback.
export function attachmentHeader(name: string) {
  const safe =
    Array.from(name, (char) =>
      char.charCodeAt(0) < 32 ||
      char.charCodeAt(0) === 127 ||
      '/\\'.includes(char)
        ? '_'
        : char,
    ).join('') || 'download';
  const ascii = safe.replace(/[^\x20-\x7e]|["\\]/g, '_');
  const encoded = encodeURIComponent(safe).replace(
    /[!'()*]/g,
    (char) => '%' + char.charCodeAt(0).toString(16).toUpperCase(),
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
