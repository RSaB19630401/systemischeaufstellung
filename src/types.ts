/* ─── Core Data Types ─── */

export type ConstellationTypeId =
  | 'family'
  | 'organization'
  | 'structural'
  | 'symptom'
  | 'custom';

export interface ConstellationTypeInfo {
  id: ConstellationTypeId;
  label: string;
  icon: string;
  desc: string;
}

export type EmotionKey =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'anxious'
  | 'confused'
  | 'hopeful';

export interface EmotionInfo {
  color: string;
  label: string;
}

export type RelationshipType =
  | 'close'
  | 'distant'
  | 'conflict'
  | 'cutoff'
  | 'enmeshed';

export interface RelationshipStyle {
  stroke: string;
  dash: string;
  width: number;
  label: string;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  emotion: EmotionKey;
  color: string;
}

export interface Relationship {
  id: string;
  fromId: string;
  toId: string;
  type: RelationshipType;
  label?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  display: string;
}

export interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

/* ─── AI Response Types ─── */

export interface CoachResponse {
  message: string;
  updates: ConstellationUpdate[];
}

export type ConstellationUpdate =
  | { action: 'add_person'; person: Person }
  | { action: 'move_person'; id: string; x: number; y: number }
  | { action: 'update_person'; id: string; changes: Partial<Person> }
  | { action: 'remove_person'; id: string }
  | { action: 'add_relationship'; relationship: Relationship }
  | { action: 'remove_relationship'; id: string };

/* ─── Animation Tracking ─── */

export type AnimationType = 'appear' | 'move' | 'emotion' | 'new-relationship' | 'remove';

export interface RecentUpdate {
  targetId: string;
  type: AnimationType;
  timestamp: number;
}

/* ─── Export/Import ─── */

export interface ConstellationExport {
  type: ConstellationTypeId;
  persons: Person[];
  relationships: Relationship[];
  chatMessages: ChatMessage[];
  apiMessages: ApiMessage[];
  exportedAt: string;
}
