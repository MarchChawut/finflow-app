import "server-only";
import sharp from "sharp";

// LINE requires an exact 2500x1686 (or 2500x843) PNG for a rich menu image.
// Generated as SVG → PNG via sharp rather than hand-designed, per the Phase 3
// scope note: nobody has produced a real graphic asset for this yet. Text-
// rendering (incl. Thai glyphs) confirmed working via sharp/libvips on this
// machine before building this out — worth re-checking if this is ever run
// on a different OS/container that might lack a Thai-capable font.
const WIDTH = 2500;
const HEIGHT = 1686;
const COLUMNS = 2;
const ROWS = 3;
const COLUMN_WIDTH = WIDTH / COLUMNS;
const ROW_HEIGHT = HEIGHT / ROWS;

type Zone = {
  label: string;
  color: string;
  icon: "pencil" | "chart" | "home" | "target" | "calculator" | "bot";
  row: number;
  col: number;
};

// 3 rows x 2 columns, top-to-bottom / left-to-right — matches the requested
// layout (row1 = daily usage, row2 = family/planning, row3 = tools/settings).
const ZONES: Zone[] = [
  { label: "บันทึกจดเงิน", color: "#00c73c", icon: "pencil", row: 0, col: 0 },
  { label: "ภาพรวมบัญชี", color: "#7c5cfc", icon: "chart", row: 0, col: 1 },
  { label: "บัญชีครอบครัว", color: "#f59e42", icon: "home", row: 1, col: 0 },
  { label: "เป้าหมายการออม", color: "#38b6e0", icon: "target", row: 1, col: 1 },
  { label: "เครื่องมือการเงิน", color: "#3b4cca", icon: "calculator", row: 2, col: 0 },
  { label: "AI โค้ช/ตั้งค่า", color: "#9aa5b1", icon: "bot", row: 2, col: 1 },
];

function iconSvg(icon: Zone["icon"], cx: number, cy: number): string {
  const s = 90; // icon "radius" scale
  switch (icon) {
    case "chart":
      return `
        <rect x="${cx - s}" y="${cy}" width="${s * 0.5}" height="${s}" rx="8" fill="white" opacity="0.9"/>
        <rect x="${cx - s * 0.2}" y="${cy - s * 0.6}" width="${s * 0.5}" height="${s * 1.6}" rx="8" fill="white"/>
        <rect x="${cx + s * 0.5}" y="${cy - s * 0.3}" width="${s * 0.5}" height="${s * 1.3}" rx="8" fill="white" opacity="0.9"/>
      `;
    case "target":
      return `
        <circle cx="${cx}" cy="${cy}" r="${s}" fill="none" stroke="white" stroke-width="14"/>
        <circle cx="${cx}" cy="${cy}" r="${s * 0.55}" fill="none" stroke="white" stroke-width="14"/>
        <circle cx="${cx}" cy="${cy}" r="${s * 0.15}" fill="white"/>
      `;
    case "pencil":
      return `
        <rect x="${cx - s * 0.9}" y="${cy - s * 0.15}" width="${s * 1.5}" height="${s * 0.3}" rx="6" fill="white" transform="rotate(-40 ${cx} ${cy})"/>
        <path d="M ${cx + s * 0.65} ${cy - s * 0.8} l ${s * 0.35} ${s * 0.35} l -${s * 0.18} ${s * 0.18} l -${s * 0.35} -${s * 0.35} Z" fill="white" transform="rotate(-40 ${cx} ${cy})"/>
      `;
    case "home":
      return `
        <path d="M ${cx - s} ${cy + s * 0.2} L ${cx} ${cy - s} L ${cx + s} ${cy + s * 0.2} L ${cx + s * 0.7} ${cy + s * 0.2} L ${cx + s * 0.7} ${cy + s} L ${cx - s * 0.7} ${cy + s} L ${cx - s * 0.7} ${cy + s * 0.2} Z" fill="white"/>
      `;
    case "calculator":
      return `
        <rect x="${cx - s * 0.7}" y="${cy - s}" width="${s * 1.4}" height="${s * 2}" rx="16" fill="none" stroke="white" stroke-width="14"/>
        <rect x="${cx - s * 0.45}" y="${cy - s * 0.7}" width="${s * 0.9}" height="${s * 0.4}" rx="4" fill="white"/>
        <circle cx="${cx - s * 0.35}" cy="${cy + s * 0.15}" r="9" fill="white"/>
        <circle cx="${cx}" cy="${cy + s * 0.15}" r="9" fill="white"/>
        <circle cx="${cx + s * 0.35}" cy="${cy + s * 0.15}" r="9" fill="white"/>
        <circle cx="${cx - s * 0.35}" cy="${cy + s * 0.5}" r="9" fill="white"/>
        <circle cx="${cx}" cy="${cy + s * 0.5}" r="9" fill="white"/>
        <circle cx="${cx + s * 0.35}" cy="${cy + s * 0.5}" r="9" fill="white"/>
      `;
    case "bot":
      return `
        <rect x="${cx - s * 0.75}" y="${cy - s * 0.5}" width="${s * 1.5}" height="${s * 1.2}" rx="20" fill="none" stroke="white" stroke-width="14"/>
        <circle cx="${cx - s * 0.3}" cy="${cy}" r="12" fill="white"/>
        <circle cx="${cx + s * 0.3}" cy="${cy}" r="12" fill="white"/>
        <rect x="${cx - s * 0.15}" y="${cy - s * 0.9}" width="${s * 0.3}" height="${s * 0.35}" rx="6" fill="white"/>
      `;
  }
}

function buildSvg(): string {
  const cells = ZONES.map((zone) => {
    const x0 = zone.col * COLUMN_WIDTH;
    const y0 = zone.row * ROW_HEIGHT;
    const cx = x0 + COLUMN_WIDTH / 2;
    const cy = y0 + ROW_HEIGHT * 0.4;
    return `
      <g>
        <rect x="${x0}" y="${y0}" width="${COLUMN_WIDTH}" height="${ROW_HEIGHT}" fill="${zone.color}"/>
        ${iconSvg(zone.icon, cx, cy)}
        <text
          x="${cx}"
          y="${y0 + ROW_HEIGHT * 0.72}"
          font-family="sans-serif"
          font-size="60"
          font-weight="bold"
          fill="white"
          text-anchor="middle"
        >${zone.label}</text>
      </g>
    `;
  });

  const dividers = [
    // vertical divider (between the 2 columns)
    `<line x1="${COLUMN_WIDTH}" y1="0" x2="${COLUMN_WIDTH}" y2="${HEIGHT}" stroke="white" stroke-width="4" opacity="0.3"/>`,
    // horizontal dividers (between the 3 rows)
    `<line x1="0" y1="${ROW_HEIGHT}" x2="${WIDTH}" y2="${ROW_HEIGHT}" stroke="white" stroke-width="4" opacity="0.3"/>`,
    `<line x1="0" y1="${ROW_HEIGHT * 2}" x2="${WIDTH}" y2="${ROW_HEIGHT * 2}" stroke="white" stroke-width="4" opacity="0.3"/>`,
  ];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    ${cells.join("\n")}
    ${dividers.join("\n")}
  </svg>`;
}

export async function generateRichMenuPng(): Promise<Buffer> {
  return sharp(Buffer.from(buildSvg())).png().toBuffer();
}

// Exported for the create-rich-menu request's `areas` (tap zone bounds) —
// kept alongside the image so the two never drift apart.
export const RICH_MENU_SIZE = { width: WIDTH, height: HEIGHT };
export const RICH_MENU_COLUMN_WIDTH = COLUMN_WIDTH;
export const RICH_MENU_ROW_HEIGHT = ROW_HEIGHT;
