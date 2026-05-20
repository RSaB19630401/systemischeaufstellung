import type {
  ConstellationTypeId, Person, Relationship,
  ChatMessage, ApiMessage, ConstellationExport,
} from '../types';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/* ─── JSON ─── */

export function exportJSON(
  type: ConstellationTypeId,
  persons: Person[],
  relationships: Relationship[],
  chatMessages: ChatMessage[],
  apiMessages: ApiMessage[],
) {
  const data: ConstellationExport = {
    type, persons, relationships, chatMessages, apiMessages,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `aufstellung-${timestamp()}.json`);
}

export function parseImportJSON(text: string): ConstellationExport | null {
  try {
    const data = JSON.parse(text);
    if (data.type && Array.isArray(data.persons)) return data as ConstellationExport;
    return null;
  } catch {
    return null;
  }
}

/* ─── SVG ─── */

export function exportSVG() {
  const svgEl = document.querySelector<SVGSVGElement>('.whiteboard-svg');
  if (!svgEl) return;
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  // Embed fonts
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap');`;
  clone.insertBefore(style, clone.firstChild);
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
  downloadBlob(blob, `aufstellung-${timestamp()}.svg`);
}

/* ─── PNG ─── */

export function exportPNG() {
  const svgEl = document.querySelector<SVGSVGElement>('.whiteboard-svg');
  if (!svgEl) return;

  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap');`;
  clone.insertBefore(style, clone.firstChild);

  const svgData = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  const canvas = document.createElement('canvas');
  const scale = 3; // high-res
  canvas.width = 1200 * scale;
  canvas.height = 1200 * scale;
  const ctx = canvas.getContext('2d')!;

  img.onload = () => {
    ctx.fillStyle = '#FFF8F0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (blob) downloadBlob(blob, `aufstellung-${timestamp()}.png`);
    }, 'image/png');
  };

  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

/* ─── PDF (simple HTML-based) ─── */

export function exportPDF(
  type: ConstellationTypeId,
  persons: Person[],
  relationships: Relationship[],
  chatMessages: ChatMessage[],
) {
  const svgEl = document.querySelector<SVGSVGElement>('.whiteboard-svg');
  const svgMarkup = svgEl ? new XMLSerializer().serializeToString(svgEl) : '';

  const chatHTML = chatMessages
    .filter(m => m.role !== 'system')
    .map(m => {
      const who = m.role === 'user' ? 'Ich' : 'Coach';
      return `<p><strong>${who}:</strong> ${m.display.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');

  const personsHTML = persons
    .map(p => `<li><strong>${p.name}</strong> (${p.role}) – ${p.emotion}</li>`)
    .join('');

  const relsHTML = relationships
    .map(r => {
      const from = persons.find(p => p.id === r.fromId)?.name || '?';
      const to = persons.find(p => p.id === r.toId)?.name || '?';
      return `<li>${from} ↔ ${to}: ${r.type}${r.label ? ` (${r.label})` : ''}</li>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Aufstellungsbericht</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #3A3028; }
    h1 { font-size: 2rem; border-bottom: 2px solid #E0D5C5; padding-bottom: 8px; }
    h2 { color: #6B5E50; margin-top: 32px; }
    .svg-container { text-align: center; margin: 24px 0; }
    .svg-container svg { max-width: 100%; height: auto; border: 1px solid #E0D5C5; border-radius: 8px; }
    .chat p { margin: 8px 0; line-height: 1.6; }
    .meta { color: #8B7E6E; font-size: 0.85rem; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Aufstellungsbericht</h1>
  <p class="meta">Typ: ${type} | Erstellt: ${new Date().toLocaleDateString('de-DE')}</p>

  <h2>Aufstellungsbild</h2>
  <div class="svg-container">${svgMarkup}</div>

  <h2>Beteiligte</h2>
  <ul>${personsHTML || '<li>Keine Personen</li>'}</ul>

  <h2>Beziehungen</h2>
  <ul>${relsHTML || '<li>Keine Beziehungen</li>'}</ul>

  <h2>Gesprächsverlauf</h2>
  <div class="chat">${chatHTML || '<p>Kein Verlauf</p>'}</div>

  <p class="meta" style="margin-top:40px; border-top:1px solid #E0D5C5; padding-top:12px;">
    Hinweis: Diese Aufstellung wurde mit KI-Unterstützung erstellt und ersetzt keine professionelle Beratung oder Therapie.
  </p>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
}
