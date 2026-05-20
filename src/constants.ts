import type { ConstellationTypeInfo, EmotionKey, EmotionInfo, RelationshipType, RelationshipStyle } from './types';

export const CONSTELLATION_TYPES: ConstellationTypeInfo[] = [
  { id: 'family', label: 'Familienaufstellung', icon: '👨‍👩‍👧‍👦', desc: 'Familiäre Beziehungen und Dynamiken erkunden' },
  { id: 'organization', label: 'Organisationsaufstellung', icon: '🏢', desc: 'Teams, Rollen und Strukturen sichtbar machen' },
  { id: 'structural', label: 'Strukturaufstellung', icon: '🔷', desc: 'Abstrakte Themen und innere Anteile aufstellen' },
  { id: 'symptom', label: 'Symptomaufstellung', icon: '🩺', desc: 'Körperliche oder seelische Symptome erkunden' },
  { id: 'custom', label: 'Freie Aufstellung', icon: '✨', desc: 'Eigenes Thema ohne feste Struktur' },
];

export const EMOTIONS: Record<EmotionKey, EmotionInfo> = {
  neutral: { color: '#8B95A5', label: 'Neutral' },
  happy: { color: '#5AAE6D', label: 'Zufrieden' },
  sad: { color: '#5B89C4', label: 'Traurig' },
  angry: { color: '#D45B5B', label: 'Wütend' },
  anxious: { color: '#C9943E', label: 'Ängstlich' },
  confused: { color: '#9B7DC4', label: 'Verwirrt' },
  hopeful: { color: '#4DBAB0', label: 'Hoffnungsvoll' },
};

export const REL_STYLES: Record<RelationshipType, RelationshipStyle> = {
  close: { stroke: '#5AAE6D', dash: 'none', width: 2.5, label: 'Eng' },
  distant: { stroke: '#8B95A5', dash: '8,6', width: 1.5, label: 'Distanziert' },
  conflict: { stroke: '#D45B5B', dash: '4,3', width: 2.5, label: 'Konflikt' },
  cutoff: { stroke: '#2C2C2C', dash: '3,8', width: 1.5, label: 'Abgebrochen' },
  enmeshed: { stroke: '#9B7DC4', dash: 'none', width: 4, label: 'Verstrickt' },
};

export const ROLE_COLORS = [
  '#E8927C', '#7CB5E8', '#7CE8A6', '#E8D77C', '#C47CE8',
  '#7CE8D4', '#E87CA8', '#A8E87C', '#E8B07C', '#7C8BE8',
];
