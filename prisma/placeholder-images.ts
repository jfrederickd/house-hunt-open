// Generates the fictional placeholder "listing photos" used by the seed, so the
// demo is fully self-contained (no network image dependency) and works out of
// the box on a fresh clone — even though /public/uploads is gitignored.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// [filename, sky-top, sky-bottom, wall, roof, label]
const HOUSES: [string, string, string, string, string, string][] = [
  ["rimu-ave.svg", "#bae6fd", "#e0f2fe", "#f8fafc", "#0f766e", "14 Rimu Avenue"],
  ["kauri-st.svg", "#fde68a", "#fef9c3", "#fef3c7", "#b45309", "28 Kauri Street"],
  ["kowhai-lane.svg", "#c7d2fe", "#eef2ff", "#fafaf9", "#4338ca", "9 Kowhai Lane"],
  ["totara-st.svg", "#a7f3d0", "#ecfdf5", "#f1f5f9", "#15803d", "6 Totara Street"],
  ["harbour-esplanade.svg", "#bfdbfe", "#dbeafe", "#f8fafc", "#1d4ed8", "3/21 Harbour Esplanade"],
];

function svg(skyTop: string, skyBottom: string, wall: string, roof: string, label: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${skyTop}"/>
      <stop offset="1" stop-color="${skyBottom}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#sky)"/>
  <circle cx="660" cy="120" r="52" fill="#fff7cc" opacity="0.9"/>
  <!-- distant hills -->
  <path d="M0 420 Q200 340 400 410 T800 400 V600 H0 Z" fill="#cbd5e1" opacity="0.55"/>
  <!-- ground -->
  <rect y="440" width="800" height="160" fill="#86b87a"/>
  <rect y="528" width="800" height="72" fill="#6f9f64"/>
  <!-- house body -->
  <rect x="250" y="300" width="300" height="200" fill="${wall}" stroke="#0f172a" stroke-opacity="0.12"/>
  <!-- roof -->
  <path d="M230 305 L400 200 L570 305 Z" fill="${roof}"/>
  <!-- door -->
  <rect x="370" y="400" width="60" height="100" fill="${roof}" opacity="0.85"/>
  <circle cx="420" cy="452" r="4" fill="#fde68a"/>
  <!-- windows -->
  <rect x="285" y="345" width="64" height="56" fill="#bfe3ff" stroke="#0f172a" stroke-opacity="0.15"/>
  <rect x="451" y="345" width="64" height="56" fill="#bfe3ff" stroke="#0f172a" stroke-opacity="0.15"/>
  <line x1="317" y1="345" x2="317" y2="401" stroke="#0f172a" stroke-opacity="0.12"/>
  <line x1="483" y1="345" x2="483" y2="401" stroke="#0f172a" stroke-opacity="0.12"/>
  <!-- tree -->
  <rect x="135" y="430" width="16" height="60" fill="#7c5a3a"/>
  <circle cx="143" cy="415" r="42" fill="#5b9f4e"/>
  <!-- label chip -->
  <rect x="24" y="544" rx="8" width="${label.length * 11 + 28}" height="34" fill="#0f172a" opacity="0.72"/>
  <text x="38" y="567" font-family="system-ui, sans-serif" font-size="18" fill="#ffffff">${label}</text>
</svg>
`;
}

/** Write all placeholder images into `outDir` (created if missing). */
export function writePlaceholderImages(outDir: string): string[] {
  mkdirSync(outDir, { recursive: true });
  const written: string[] = [];
  for (const [file, skyTop, skyBottom, wall, roof, label] of HOUSES) {
    writeFileSync(join(outDir, file), svg(skyTop, skyBottom, wall, roof, label), "utf-8");
    written.push(file);
  }
  return written;
}
