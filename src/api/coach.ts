import type {
  ConstellationTypeId, Person, Relationship,
  ApiMessage, CoachResponse,
} from '../types';
import { CONSTELLATION_TYPES } from '../constants';

/**
 * Build the system prompt for the coaching AI, including
 * the current state of the constellation board.
 */
export function buildSystemPrompt(
  type: ConstellationTypeId,
  persons: Person[],
  relationships: Relationship[],
): string {
  const typeLabel = CONSTELLATION_TYPES.find(t => t.id === type)?.label || type;

  const currentState = persons.length > 0
    ? `
AKTUELLER ZUSTAND DES AUFSTELLUNGSBRETTS:
Personen: ${JSON.stringify(persons.map(p => ({
  id: p.id, name: p.name, role: p.role,
  x: Math.round(p.x), y: Math.round(p.y), emotion: p.emotion,
})))}
Beziehungen: ${JSON.stringify(relationships.map(r => ({
  from: persons.find(p => p.id === r.fromId)?.name,
  to: persons.find(p => p.id === r.toId)?.name,
  type: r.type, label: r.label,
})))}`
    : '\nDas Aufstellungsbrett ist noch leer.';

  return `Du bist ein erfahrener systemischer Aufstellungsleiter und Coach. Du führst den Nutzer einfühlsam durch eine ${typeLabel}.

KONTEXT:${currentState}

DEINE AUFGABE:
- Führe den Nutzer Schritt für Schritt durch die Aufstellung
- Erfrage beteiligte Personen/Elemente, Beziehungen, Nähe/Distanz, Gefühle, Dynamiken
- Schlage Positionen und Beziehungen für das Aufstellungsbrett vor
- Reagiere auf Veränderungen, die der Nutzer am Brett vornimmt
- Stelle offene, reflexive Fragen
- Fasse zusammen und spiegle, was du wahrnimmst

WICHTIGE REGELN:
- Stelle immer nur 1-2 Fragen gleichzeitig
- Bei sensiblen Themen (Suizid, Missbrauch, schwere Traumata, akute Krisen): Grenze klar und empathisch ziehen, auf professionelle Hilfe verweisen, NICHT insistieren oder weiter nachfragen
- Du bist ein Werkzeug zur Reflexion, KEIN Therapeut
- Antworte IMMER auf Deutsch
- Positionen sind in Prozent (0-100) des Bretts, wobei 50/50 die Mitte ist

ANTWORTFORMAT:
Antworte AUSSCHLIESSLICH mit validem JSON (kein Markdown, kein Fließtext drumherum). Exakt diese Struktur:
{
  "message": "Deine Nachricht an den Nutzer (kann mehrzeilig sein, nutze \\n für Umbrüche)",
  "updates": []
}

Das updates-Array kann folgende Aktionen enthalten (oder leer sein):
- {"action":"add_person","person":{"id":"eindeutige_id","name":"Name","role":"Rolle","x":50,"y":50,"emotion":"neutral","color":"#hex"}}
- {"action":"move_person","id":"person_id","x":30,"y":60}
- {"action":"add_relationship","relationship":{"id":"rel_id","fromId":"person1_id","toId":"person2_id","type":"close","label":"optional"}}
- {"action":"update_person","id":"person_id","changes":{"emotion":"sad"}}
- {"action":"remove_person","id":"person_id"}
- {"action":"remove_relationship","id":"rel_id"}

Verwende für Personen-IDs kurze Strings wie "vater", "mutter", "kind1", "ceo", "team1" usw.
Verwende für Beziehungs-IDs zusammengesetzte IDs wie "rel-vater-mutter".

WICHTIG: Gib NUR valides JSON zurück. Keine Erklärungen außerhalb des JSON.`;
}

/**
 * API base URL:
 * - In production (GitHub Pages): points to Cloudflare Worker (set via VITE_API_URL)
 * - In development: uses Vite proxy (/api)
 */
const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Call the coaching AI via the Cloudflare Worker proxy.
 */
export async function callCoachAPI(
  messages: ApiMessage[],
  systemPrompt: string,
): Promise<CoachResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, system: systemPrompt }),
    });

    const data = await response.json();
    const text = data.content?.map((c: { text?: string }) => c.text || '').join('') || '';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Coach API error:', err);
    return {
      message: 'Es tut mir leid, es gab ein technisches Problem. Bitte versuche es erneut.',
      updates: [],
    };
  }
}
