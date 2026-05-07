import type { RenderedItem } from "./types.js";

const RARITY_COLOURS: Record<string, string> = {
  common: "#aaaaaa",
  uncommon: "#1eff00",
  rare: "#0070dd",
  "very-rare": "#a335ee",
  legendary: "#ff8000",
};

function rarityColour(key: string): string {
  return RARITY_COLOURS[key] ?? "#ffffff";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDescription(text: string): string {
  // Convert double newlines to paragraph breaks, escape HTML
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${escapeHtml(para.trim())}</p>`)
    .join("\n");
}

function buildStatsTable(item: RenderedItem["item"]): string {
  const rows: string[] = [];

  const add = (label: string, value: string | number | boolean | null | undefined) => {
    if (value === null || value === undefined || value === "") return;
    rows.push(`
      <tr>
        <td class="stat-label">${escapeHtml(label)}</td>
        <td class="stat-value">${escapeHtml(String(value))}</td>
      </tr>`);
  };

  add("Rarity", item.rarity.name);
  add("Category", item.category.name);

  if (item.weapon) {
    add("Weapon Type", item.weapon.name);
    add("Weapon Class", item.weapon.is_martial ? "Martial" : "Simple");
    if (item.weapon.damage_dice) {
      const dmgStr = item.weapon.damage_type
        ? `${item.weapon.damage_dice} ${item.weapon.damage_type.name}`
        : item.weapon.damage_dice;
      add("Damage", dmgStr);
    }
    const propNames = item.weapon.properties
      .map((p) => {
        const name = p.property.name;
        return p.detail ? `${name} (${p.detail})` : name;
      })
      .filter(Boolean);
    if (propNames.length > 0) {
      add("Properties", propNames.join(", "));
    }
  }

  if (item.armor) {
    add("Armor Type", item.armor.name);
    add("Armor Class", item.armor.ac_display);
    add("Armor Category", item.armor.category.charAt(0).toUpperCase() + item.armor.category.slice(1));
    if (item.armor.strength_score_required) {
      add("Str Required", `${item.armor.strength_score_required}`);
    }
    add("Stealth Disadvantage", item.armor.grants_stealth_disadvantage ? "Yes" : "No");
  }

  const weight = parseFloat(item.weight);
  if (!isNaN(weight) && weight > 0) {
    add("Weight", `${weight} ${item.weight_unit}`);
  }

  add("Requires Attunement", item.requires_attunement ? "Yes" : "No");
  if (item.attunement_detail) {
    add("Attunement Detail", item.attunement_detail);
  }

  if (rows.length === 0) return "";
  return `
    <table class="stats-table">
      <tbody>
        ${rows.join("")}
      </tbody>
    </table>`;
}

export function renderPage(data: RenderedItem): string {
  const { item, generatedDescription, imageFilename, categoryLabel } = data;
  const colour = rarityColour(item.rarity.key);
  const statsTable = buildStatsTable(item);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(item.name)} — Magical Item</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #0d0d0f;
      color: #e8d9b5;
      font-family: 'Georgia', 'Times New Roman', serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem 4rem;
    }

    header {
      text-align: center;
      margin-bottom: 2.5rem;
    }

    header h1 {
      font-size: clamp(1.4rem, 4vw, 2.2rem);
      letter-spacing: 0.06em;
      color: #f5e6c0;
      text-shadow: 0 0 18px rgba(200,160,60,0.45);
      margin-bottom: 0.5rem;
    }

    .badges {
      display: flex;
      gap: 0.6rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .badge {
      font-family: 'Arial', sans-serif;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0.25rem 0.7rem;
      border-radius: 3px;
      border: 1px solid currentColor;
    }

    .badge-category {
      color: #9b8a6a;
      border-color: #9b8a6a44;
      background: #1a1610;
    }

    .badge-rarity {
      border-color: ${colour}66;
      color: ${colour};
      background: ${colour}11;
    }

    .card {
      width: 100%;
      max-width: 780px;
      background: #12110e;
      border: 1px solid #2a2418;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 8px 48px rgba(0,0,0,0.7), 0 0 0 1px #1c1810;
    }

    .item-image-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 1 / 1;
      overflow: hidden;
      background: #0a0908;
    }

    .item-image-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.4s ease;
    }

    .item-image-wrap img:hover {
      transform: scale(1.02);
    }

    .item-image-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 35%;
      background: linear-gradient(to top, #12110e, transparent);
      pointer-events: none;
    }

    .card-body {
      padding: 2rem;
    }

    .section-heading {
      font-family: 'Arial', sans-serif;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #6a5c3a;
      margin-bottom: 0.9rem;
      padding-bottom: 0.4rem;
      border-bottom: 1px solid #1e1b14;
    }

    .description {
      line-height: 1.8;
      color: #d4c49a;
      font-size: 0.97rem;
      margin-bottom: 2.2rem;
    }

    .description p + p {
      margin-top: 1rem;
    }

    .stats-table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'Arial', sans-serif;
      font-size: 0.85rem;
    }

    .stats-table tr:nth-child(even) {
      background: #17150f;
    }

    .stat-label {
      color: #8a7a58;
      font-weight: 600;
      padding: 0.5rem 0.7rem;
      width: 40%;
      letter-spacing: 0.03em;
    }

    .stat-value {
      color: #e8d9b5;
      padding: 0.5rem 0.7rem;
    }

    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, #2a2418, transparent);
      margin: 2rem 0;
    }

    footer {
      margin-top: 2.5rem;
      text-align: center;
      font-family: 'Arial', sans-serif;
      font-size: 0.72rem;
      color: #3a3020;
      letter-spacing: 0.06em;
    }

    footer a {
      color: #5a4d2f;
      text-decoration: none;
    }

    .refresh-btn {
      display: inline-block;
      margin-top: 1.5rem;
      padding: 0.65rem 2rem;
      background: transparent;
      border: 1px solid #4a3f26;
      color: #9b8a5a;
      font-family: 'Arial', sans-serif;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      text-decoration: none;
      border-radius: 3px;
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s, background 0.2s;
    }

    .refresh-btn:hover {
      border-color: ${colour}88;
      color: ${colour};
      background: ${colour}0d;
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(item.name)}</h1>
    <div class="badges">
      <span class="badge badge-category">${escapeHtml(categoryLabel)}</span>
      <span class="badge badge-rarity">${escapeHtml(item.rarity.name)}</span>
    </div>
  </header>

  <div class="card">
    <div class="item-image-wrap">
      <img
        src="/images/${encodeURIComponent(imageFilename)}"
        alt="${escapeHtml(item.name)}"
        loading="eager"
      />
      <div class="item-image-overlay"></div>
    </div>

    <div class="card-body">
      <div class="section-heading">Description</div>
      <div class="description">
        ${formatDescription(generatedDescription)}
      </div>

      ${statsTable ? `<div class="divider"></div>
      <div class="section-heading">Statistics</div>
      ${statsTable}` : ""}
    </div>
  </div>

  <a href="/" class="refresh-btn">&#8635; Discover Another Item</a>

  <footer>
    <p>Item data sourced from <a href="https://open5e.com" target="_blank" rel="noopener noreferrer">Open5e</a> · D&amp;D 5e SRD · Images generated by DALL-E 3</p>
  </footer>
</body>
</html>`;
}

export function renderLoadingPage(itemName: string, requestId: string): string {
  // requestId is validated server-side before being passed here, but we also
  // only embed it as a JSON string so no HTML injection is possible.
  const safeRequestId = JSON.stringify(requestId);
  const safeItemName = escapeHtml(itemName);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Conjuring ${safeItemName}…</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0d0d0f; color: #e8d9b5;
      font-family: Georgia, 'Times New Roman', serif;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      min-height: 100vh; gap: 1.5rem; padding: 2rem;
      text-align: center;
    }
    h1 { font-size: clamp(1.2rem, 3vw, 1.8rem); color: #f5e6c0; letter-spacing: 0.06em; }
    .subtitle { color: #8a7a58; font-family: Arial, sans-serif; font-size: 0.85rem; letter-spacing: 0.04em; }
    .orb {
      width: 80px; height: 80px;
      border-radius: 50%;
      border: 2px solid #4a3f2600;
      border-top-color: #c0a050;
      border-right-color: #c0a05066;
      animation: spin 1.4s linear infinite;
      box-shadow: 0 0 24px #c0a05033, inset 0 0 16px #c0a05022;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    #status { font-family: Arial, sans-serif; font-size: 0.78rem; color: #5a4d2f; min-height: 1.2em; }
  </style>
</head>
<body>
  <div class="orb"></div>
  <h1>Conjuring ${safeItemName}…</h1>
  <p class="subtitle">The arcane scribes are at work. This takes about 20 seconds.</p>
  <p id="status">Consulting the tomes…</p>
  <script>
    const requestId = ${safeRequestId};
    const statusEl = document.getElementById('status');
    const messages = [
      'Consulting the tomes…',
      'Weaving the enchantment…',
      'Illuminating the scroll…',
      'Binding the magic…',
      'Almost ready…',
    ];
    let msgIndex = 0;
    function nextMessage() {
      msgIndex = (msgIndex + 1) % messages.length;
      statusEl.textContent = messages[msgIndex];
    }
    const msgInterval = setInterval(nextMessage, 4000);

    async function poll() {
      try {
        const r = await fetch('/api/status/' + encodeURIComponent(requestId));
        if (!r.ok) { setTimeout(poll, 2000); return; }
        const data = await r.json();
        if (data.ready && data.html) {
          clearInterval(msgInterval);
          document.open();
          document.write(data.html);
          document.close();
        } else if (data.error) {
          clearInterval(msgInterval);
          statusEl.textContent = 'Error: ' + data.error;
        } else {
          setTimeout(poll, 2000);
        }
      } catch {
        setTimeout(poll, 3000);
      }
    }
    setTimeout(poll, 3000);
  </script>
</body>
</html>`;
}

export function renderErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Error — Magical Item Generator</title>
  <style>
    body {
      background: #0d0d0f; color: #e8d9b5;
      font-family: Georgia, serif;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 100vh; padding: 2rem;
      text-align: center;
    }
    h1 { color: #c0392b; margin-bottom: 1rem; }
    p { color: #8a7a58; font-family: Arial, sans-serif; font-size: 0.9rem; max-width: 480px; }
    a {
      display: inline-block; margin-top: 1.5rem; padding: 0.6rem 1.8rem;
      border: 1px solid #4a3f26; color: #9b8a5a;
      font-family: Arial, sans-serif; font-size: 0.78rem;
      text-decoration: none; border-radius: 3px;
    }
  </style>
</head>
<body>
  <h1>The arcane ritual failed...</h1>
  <p>${escapeHtml(message)}</p>
  <a href="/">Try Again</a>
</body>
</html>`;
}
