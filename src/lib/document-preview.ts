export function demoDocumentPreview(input: {
  title: string;
  name: string;
  subtitle?: string;
  lines?: string[];
}) {
  const lines = input.lines || [];
  const lineMarkup = lines
    .map(
      (line, index) =>
        `<text x="40" y="${210 + index * 28}" font-size="16" fill="#334155">${escapeXml(line)}</text>`
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
    <rect width="640" height="420" rx="18" fill="#f8fafc"/>
    <rect x="0" y="0" width="640" height="72" fill="#12355B"/>
    <text x="40" y="46" font-size="22" font-family="Arial, sans-serif" fill="#ffffff" font-weight="700">${escapeXml(input.title)}</text>
    <text x="40" y="120" font-size="13" fill="#64748b" font-family="Arial, sans-serif">DEMO DOCUMENT — not a government or bureau extract</text>
    <text x="40" y="168" font-size="26" fill="#0f172a" font-family="Arial, sans-serif" font-weight="700">${escapeXml(input.name)}</text>
    <text x="40" y="196" font-size="15" fill="#475569" font-family="Arial, sans-serif">${escapeXml(input.subtitle || "")}</text>
    ${lineMarkup}
    <rect x="40" y="360" width="180" height="28" rx="8" fill="#e2e8f0"/>
    <text x="52" y="379" font-size="12" fill="#334155" font-family="Arial, sans-serif">LendFlow simulated check</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
