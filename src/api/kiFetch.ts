// Zugangscode für die KI-Funktionen.
// Wird beim ersten KI-Aufruf abgefragt und im Browser gespeichert (einmal pro Gerät/Browser).
// Ist der Code falsch, wird er gelöscht und neu abgefragt.
const KI_CODE_KEY = "ki-zugangscode";

function kiCode(nochmal: boolean): string {
  let c = "";
  try { c = nochmal ? "" : (localStorage.getItem(KI_CODE_KEY) || ""); } catch (e) { /* kein Speicher */ }
  if (!c) {
    c = (window.prompt(nochmal
      ? "Der Zugangscode war falsch. Bitte erneut eingeben:"
      : "Bitte den Zugangscode für die KI-Funktionen eingeben:") || "").trim();
    if (c) { try { localStorage.setItem(KI_CODE_KEY, c); } catch (e) { /* kein Speicher */ } }
  }
  return c;
}

export async function kiFetch(url: string, init?: RequestInit): Promise<Response> {
  init = init || {};
  for (let versuch = 0; versuch < 2; versuch++) {
    const code = kiCode(versuch > 0);
    if (!code) break;
    const res = await fetch(url, Object.assign({}, init, {
      headers: Object.assign({}, (init.headers as Record<string, string>) || {}, { "X-Access-Code": code }),
    }));
    if (res.status !== 401) return res;
    let abgelehnt = false;
    try { const j = await res.clone().json(); abgelehnt = j.type === "access_denied" || (j.error || {}).type === "access_denied"; } catch (e) { /* kein JSON */ }
    if (!abgelehnt) return res;
    try { localStorage.removeItem(KI_CODE_KEY); } catch (e) { /* kein Speicher */ }
  }
  return new Response(JSON.stringify({ error: { type: "access_denied", message: "Ohne gültigen Zugangscode ist die KI-Funktion nicht verfügbar." } }),
    { status: 401, headers: { "Content-Type": "application/json" } });
}
