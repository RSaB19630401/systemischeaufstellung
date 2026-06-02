import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  ConstellationTypeId, Person, Relationship,
  ChatMessage, ApiMessage, ConstellationExport, ConstellationUpdate,
  RecentUpdate,
} from './types';
import { CONSTELLATION_TYPES, EMOTIONS, ROLE_COLORS } from './constants';
import { buildSystemPrompt, callCoachAPI, trimConversation } from './api/coach';
import { exportJSON, exportSVG, exportPNG, exportPDF, parseImportJSON } from './utils/export';

import WelcomeScreen from './components/WelcomeScreen';
import ChatPanel from './components/ChatPanel';
import Whiteboard from './components/Whiteboard';
import PersonDetail from './components/PersonDetail';
import Toolbar from './components/Toolbar';
import Legend from './components/Legend';
import AddPersonModal from './components/AddPersonModal';

type Phase = 'welcome' | 'app';
type MobileView = 'chat' | 'board';

const STORAGE_KEY = 'systemische-aufstellung-autosave';

function loadAutosave(): {
  phase: Phase; type: ConstellationTypeId;
  persons: Person[]; relationships: Relationship[];
  chatMessages: ChatMessage[]; apiMessages: ApiMessage[];
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.phase === 'app' && data.type && Array.isArray(data.persons)) return data;
    return null;
  } catch { return null; }
}

export default function App() {
  const saved = useRef(loadAutosave());

  const [phase, setPhase] = useState<Phase>(saved.current?.phase || 'welcome');
  const [constellationType, setConstellationType] = useState<ConstellationTypeId>(
    saved.current?.type || 'family'
  );
  const [persons, setPersons] = useState<Person[]>(saved.current?.persons || []);
  const [relationships, setRelationships] = useState<Relationship[]>(saved.current?.relationships || []);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(saved.current?.chatMessages || []);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>(saved.current?.apiMessages || []);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>('chat');
  const [recentUpdates, setRecentUpdates] = useState<RecentUpdate[]>([]);
  const [boardChangeHint, setBoardChangeHint] = useState(0);
  const [showAddPerson, setShowAddPerson] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorIndex = useRef(0);

  // Refs to avoid stale closures
  const personsRef = useRef(persons);
  const apiMessagesRef = useRef(apiMessages);
  useEffect(() => { personsRef.current = persons; }, [persons]);
  useEffect(() => { apiMessagesRef.current = apiMessages; }, [apiMessages]);

  // Clear board hint when switching to board
  useEffect(() => {
    if (mobileView === 'board') setBoardChangeHint(0);
  }, [mobileView]);

  /* ─── Autosave ─── */
  useEffect(() => {
    if (phase !== 'app') return;
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          phase, type: constellationType, persons, relationships, chatMessages, apiMessages,
        }));
      } catch { /* storage full or unavailable */ }
    }, 500); // debounce
    return () => clearTimeout(timeout);
  }, [phase, constellationType, persons, relationships, chatMessages, apiMessages]);

  const nextColor = () => ROLE_COLORS[colorIndex.current++ % ROLE_COLORS.length];

  const trackUpdate = useCallback((targetId: string, type: RecentUpdate['type']) => {
    const update: RecentUpdate = { targetId, type, timestamp: Date.now() };
    setRecentUpdates(prev => [...prev.filter(u => u.targetId !== targetId || u.type !== type), update]);
    setTimeout(() => {
      setRecentUpdates(prev => prev.filter(u => u !== update));
    }, 1200);
  }, []);

  /* ─── Apply board updates from AI ─── */
  const applyUpdates = useCallback((updates: ConstellationUpdate[]) => {
    if (!updates || !Array.isArray(updates) || updates.length === 0) return;
    let changeCount = 0;
    updates.forEach(u => {
      switch (u.action) {
        case 'add_person':
          if (u.person) {
            setPersons(prev => {
              if (prev.find(p => p.id === u.person.id)) return prev;
              return [...prev, { ...u.person, color: u.person.color || nextColor() }];
            });
            trackUpdate(u.person.id, 'appear');
            changeCount++;
          }
          break;
        case 'move_person':
          setPersons(prev => prev.map(p => p.id === u.id ? { ...p, x: u.x, y: u.y } : p));
          trackUpdate(u.id, 'move');
          changeCount++;
          break;
        case 'update_person':
          setPersons(prev => prev.map(p => p.id === u.id ? { ...p, ...u.changes } : p));
          if (u.changes.emotion) trackUpdate(u.id, 'emotion');
          changeCount++;
          break;
        case 'remove_person':
          trackUpdate(u.id, 'remove');
          setTimeout(() => {
            setPersons(prev => prev.filter(p => p.id !== u.id));
            setRelationships(prev => prev.filter(r => r.fromId !== u.id && r.toId !== u.id));
          }, 500);
          changeCount++;
          break;
        case 'add_relationship':
          if (u.relationship) {
            setRelationships(prev => {
              if (prev.find(r => r.id === u.relationship.id)) return prev;
              return [...prev, u.relationship];
            });
            trackUpdate(u.relationship.id, 'new-relationship');
            changeCount++;
          }
          break;
        case 'remove_relationship':
          trackUpdate(u.id, 'remove');
          setTimeout(() => {
            setRelationships(prev => prev.filter(r => r.id !== u.id));
          }, 500);
          changeCount++;
          break;
      }
    });
    // Mobile hint
    setBoardChangeHint(prev => prev + changeCount);
  }, [trackUpdate]);

  /* ─── Send user message to AI ─── */
  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { role: 'user', content: text, display: text };
    setChatMessages(prev => [...prev, userMsg]);

    // Use ref for current apiMessages to avoid stale closure
    const currentApiMsgs = apiMessagesRef.current;
    const newApiMsgs: ApiMessage[] = [...currentApiMsgs, { role: 'user', content: text }];
    setApiMessages(newApiMsgs);
    setIsLoading(true);

    const trimmed = trimConversation(newApiMsgs);
    const systemPrompt = buildSystemPrompt(constellationType, personsRef.current, relationships);
    const result = await callCoachAPI(trimmed, systemPrompt);

    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: JSON.stringify(result),
      display: result.message || '...',
    };
    setChatMessages(prev => [...prev, assistantMsg]);
    setApiMessages(prev => [...prev, { role: 'assistant', content: result.message }]);
    applyUpdates(result.updates);
    setIsLoading(false);
  }, [constellationType, relationships, applyUpdates]);

  /* ─── Board interaction handlers ─── */
  const handleMovePerson = useCallback((id: string, x: number, y: number, finished = false) => {
    setPersons(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
    if (finished) {
      const person = personsRef.current.find(p => p.id === id);
      if (person) {
        setChatMessages(prev => [...prev, {
          role: 'system', content: '',
          display: `📌 ${person.name} wurde auf dem Brett verschoben.`,
        }]);
        setApiMessages(prev => [
          ...prev,
          { role: 'user' as const, content: `[Änderung am Brett] ${person.name} wurde verschoben auf Position x=${Math.round(x)}, y=${Math.round(y)}.` },
        ]);
      }
    }
  }, []);

  const handleUpdatePerson = useCallback((id: string, changes: Partial<Person>) => {
    setPersons(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
    if (changes.emotion) {
      trackUpdate(id, 'emotion');
      const person = personsRef.current.find(p => p.id === id);
      if (person) {
        const label = EMOTIONS[changes.emotion]?.label || changes.emotion;
        const notification = `${person.name} fühlt sich jetzt: ${label}`;
        setChatMessages(prev => [...prev, {
          role: 'system', content: '', display: `💭 ${notification}`,
        }]);
        setApiMessages(prev => [
          ...prev,
          { role: 'user' as const, content: `[Änderung am Brett] ${notification}` },
        ]);
      }
    }
  }, [trackUpdate]);

  /* ─── Manual add person ─── */
  const handleAddPersonManual = useCallback((name: string, role: string) => {
    const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).slice(2, 5);
    const newPerson: Person = {
      id, name, role,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      emotion: 'neutral',
      color: nextColor(),
    };
    setPersons(prev => [...prev, newPerson]);
    trackUpdate(id, 'appear');
    setChatMessages(prev => [...prev, {
      role: 'system', content: '',
      display: `➕ ${name} (${role}) wurde manuell hinzugefügt.`,
    }]);
    setApiMessages(prev => [
      ...prev,
      { role: 'user' as const, content: `[Änderung am Brett] Neue Person manuell hinzugefügt: ${name} (${role}), Position x=${Math.round(newPerson.x)}, y=${Math.round(newPerson.y)}.` },
    ]);
    setShowAddPerson(false);
  }, [trackUpdate]);

  /* ─── Start constellation ─── */
  const handleStart = useCallback(async (
    typeId: ConstellationTypeId,
    imported?: ConstellationExport,
  ) => {
    if (imported) {
      setConstellationType(imported.type);
      setPersons(imported.persons || []);
      setRelationships(imported.relationships || []);
      setChatMessages(imported.chatMessages || []);
      setApiMessages(imported.apiMessages || []);
      setPhase('app');
      return;
    }

    setConstellationType(typeId);
    setPhase('app');
    setIsLoading(true);

    const typeLabel = CONSTELLATION_TYPES.find(t => t.id === typeId)?.label || typeId;
    const systemPrompt = buildSystemPrompt(typeId, [], []);
    const initMsg: ApiMessage[] = [
      { role: 'user', content: `Ich möchte eine ${typeLabel} beginnen. Bitte führe mich durch den Prozess.` },
    ];
    const result = await callCoachAPI(initMsg, systemPrompt);

    setChatMessages([{
      role: 'assistant',
      content: JSON.stringify(result),
      display: result.message,
    }]);
    setApiMessages([
      { role: 'user', content: `Ich möchte eine ${typeLabel} beginnen.` },
      { role: 'assistant', content: result.message },
    ]);
    applyUpdates(result.updates);
    setIsLoading(false);
  }, [applyUpdates]);

  /* ─── Export / Import / Reset ─── */
  const handleExportJSON = () =>
    exportJSON(constellationType, persons, relationships, chatMessages, apiMessages);
  const handleExportSVG = () => exportSVG();
  const handleExportPNG = () => exportPNG();
  const handleExportPDF = () =>
    exportPDF(constellationType, persons, relationships, chatMessages);
  const handleImportJSON = () => fileInputRef.current?.click();

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const data = parseImportJSON(ev.target?.result as string);
      if (data) handleStart(data.type, data);
      else alert('Ungültige Datei.');
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  const handleReset = () => {
    if (confirm('Neue Aufstellung starten? Nicht exportierte Daten gehen verloren.')) {
      setPhase('welcome');
      setPersons([]);
      setRelationships([]);
      setChatMessages([]);
      setApiMessages([]);
      setSelectedPerson(null);
      setBoardChangeHint(0);
      colorIndex.current = 0;
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  /* ─── Render ─── */
  if (phase === 'welcome') {
    return <WelcomeScreen onSelect={handleStart} />;
  }

  const selectedPersonData = persons.find(p => p.id === selectedPerson);

  return (
    <div className="app-layout">
      <input
        type="file" accept=".json" ref={fileInputRef}
        style={{ display: 'none' }} onChange={handleFileImport}
      />

      <Toolbar
        constellationType={constellationType}
        onExportJSON={handleExportJSON}
        onExportSVG={handleExportSVG}
        onExportPNG={handleExportPNG}
        onExportPDF={handleExportPDF}
        onImportJSON={handleImportJSON}
        onReset={handleReset}
      />

      {/* Mobile tab bar */}
      <div className="mobile-tabs">
        {(['chat', 'board'] as const).map(tab => (
          <button
            key={tab}
            className={`mobile-tab ${mobileView === tab ? 'mobile-tab--active' : ''}`}
            onClick={() => setMobileView(tab)}
          >
            {tab === 'chat' ? '💬 Chat' : '📋 Brett'}
            {tab === 'board' && boardChangeHint > 0 && mobileView !== 'board' && (
              <span className="board-hint-badge">{boardChangeHint}</span>
            )}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="main-content">
        <div className={`panel-chat ${mobileView !== 'chat' ? 'panel--hidden-mobile' : ''}`}>
          <ChatPanel messages={chatMessages} onSend={sendMessage} isLoading={isLoading} />
        </div>

        <div className={`panel-board ${mobileView !== 'board' ? 'panel--hidden-mobile' : ''}`}>
          <Legend />
          <Whiteboard
            persons={persons}
            relationships={relationships}
            onMovePerson={handleMovePerson}
            onSelectPerson={setSelectedPerson}
            selectedPerson={selectedPerson}
            recentUpdates={recentUpdates}
            onAddPerson={() => setShowAddPerson(true)}
          />
          <PersonDetail
            person={selectedPersonData}
            onUpdate={handleUpdatePerson}
            onDeselect={() => setSelectedPerson(null)}
          />
          {showAddPerson && (
            <AddPersonModal
              onAdd={handleAddPersonManual}
              onClose={() => setShowAddPerson(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
