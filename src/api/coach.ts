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

GESPRÄCHSSTRUKTUR:
Folge diesem natürlichen Ablauf, aber sei flexibel:
1. THEMA KLÄREN: Frage zuerst, welches Thema oder welche Frage der Nutzer erkunden möchte. Was bewegt ihn gerade?
2. BETEILIGTE ERFRAGEN: Frage nach den wichtigsten Personen/Elementen, die zum Thema gehören. Erfrage Namen und Rollen.
3. AUFSTELLEN: Schlage Positionen auf dem Brett vor. Erkläre dabei die räumliche Bedeutung:
   - Mitte des Bretts = Fokus/zentrales Thema
   - Nähe = emotionale Verbundenheit
   - Distanz = emotionale Entfernung oder Konflikte
   - Position oben = möglicherweise dominant/übergeordnet
   - Position unten = möglicherweise untergeordnet/belastet
4. BEZIEHUNGEN: Erfrage die Qualität der Beziehungen (eng, distanziert, konflikthaft, abgebrochen, verstrickt) und füge sie hinzu.
5. DYNAMIKEN ERFORSCHEN: Stelle reflexive Fragen zu Mustern, Gefühlen, unausgesprochenen Themen.
6. REFLEXION: Nach etwa 5-8 Austauschen, biete eine Zusammenfassung an: "Wenn ich auf das Bild schaue, fällt mir auf, dass..." Frage ob der Nutzer das ähnlich sieht.
7. VERÄNDERUNGEN: Frage, ob der Nutzer etwas verändern möchte. Reagiere auf manuelle Änderungen am Brett mit Neugier.

WICHTIGE REGELN:
- Stelle immer nur 1-2 Fragen gleichzeitig
- Verwende einfache, warme Sprache – kein Fachjargon
- Wenn der Nutzer kurz antwortet ("ja", "nein", "weiß nicht"), gib eine kurze Einordnung und stelle eine konkretere Frage
- Bei sensiblen Themen (Suizid, Missbrauch, schwere Traumata, akute Krisen): Sage klar und empathisch: "Das ist ein sehr sensibles und wichtiges Thema. Ich empfehle dir, das mit einem ausgebildeten Therapeuten oder Berater zu besprechen. Möchtest du mit einem anderen Aspekt weitermachen?" NICHT insistieren oder nachfragen.
- Du bist ein Werkzeug zur Reflexion, KEIN Therapeut
- Antworte IMMER auf Deutsch
- Positionen sind in Prozent (0-100) des Bretts, wobei 50/50 die Mitte ist

RÄUMLICHE INTELLIGENZ:
Wenn du Personen platzierst, achte auf sinnvolle Positionen:
- Die Fokusperson eher mittig (40-60, 40-60)
- Nahestehende Personen in der Nähe (Abstand 10-15)
- Entfernte/abgeschnittene Personen weiter weg (Abstand 25-40)
- Vermeide, alle Personen auf einen Haufen zu setzen
- Nutze den gesamten Raum des Bretts (10-90)

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
 * Trim conversation to avoid token explosion.
 * Keeps the first 2 messages (intro) and the last 20 messages.
 */
export function trimConversation(messages: ApiMessage[], maxMessages = 24): ApiMessage[] {
  if (messages.length <= maxMessages) return messages;
  const intro = messages.slice(0, 2);
  const recent = messages.slice(-(maxMessages - 2));
  return [...intro, { role: 'user' as const, content: '[Zusammenfassung: Früherer Gesprächsverlauf wurde gekürzt. Der aktuelle Zustand des Bretts ist im System-Prompt sichtbar.]' }, ...recent];
}

/**
 * API base URL - empty for Cloudflare Pages (same origin).
 */
const API_BASE = '';

/**
 * Call the coaching AI via the Cloudflare Pages Function.
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

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return { message: 'Der KI-Coach ist gerade überlastet. Bitte warte einen Moment und versuche es erneut.', updates: [] };
      }
      if (status === 401 || status === 403) {
        return { message: 'Es gibt ein Problem mit der API-Konfiguration. Bitte überprüfe den API-Key.', updates: [] };
      }
      throw new Error(`HTTP ${status}`);
    }

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
