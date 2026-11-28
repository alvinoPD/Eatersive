/** Avatar inisial sebagai data URI, tanpa file gambar tambahan. */
export function initialsAvatar(name: string): string {
  const initial = (name.trim().charAt(0) || '?').replace(/[<>&"']/g, '').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="#dbe7ff"/><text x="32" y="41" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#2862ed" text-anchor="middle">${initial}</text></svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
