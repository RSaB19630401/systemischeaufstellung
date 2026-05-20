import { useState, useRef, useCallback } from 'react';
import type {
  ConstellationTypeId, Person, Relationship,
  ChatMessage, ApiMessage, ConstellationExport, ConstellationUpdate,
} from './types';
import { CONSTELLATION_TYPES, EMOTIONS, ROLE_COLORS } from './constants';
import { buildSystemPrompt, callCoachAPI } from './api/coach';
import { exportJSON, exportSVG, exportPNG, exportPDF, parseImportJSON } from './utils/export';

import WelcomeScreen from './components/WelcomeScreen';
import ChatPanel from './components/ChatPanel';
import Whiteboard from './components/Whiteboard';
import PersonDetail from './components/PersonDetail';
import Toolbar from './components/Toolbar';
import Legend from './components/Legend';

type Phase = 'welcome' | 'app';
type MobileView = 'chat' | 'board';

export default function App() {
  const [phase, setPhase] = useState<Phase>('welcome');
  const [constellationType, setConstellationType] = useState<ConstellationTypeId>('family');
  const [persons, setPersons] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>('chat');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorIndex = useRef(0);

  const nextColor = () => ROLE_COLORS[colorIndex.current++ % ROLE_COLORS.length];

  /* ─── Apply board updates from AI ─── */
  const applyUpdates = useCallback((updates: ConstellationUpdate[]) => {
    if (!updates || !Array.isArray(updates)) return;
    updates.forEach(u => {
      switch (u.action) {
        case 'add_person':
          if (u.person) {
            setPersons(prev => {
              if (prev.find(p => p.id === u.person.id)) return prev;
              return [...prev, { ...u.person, color: u.person.color || nextColor() }];
            });
          }
          break;
        case 'move_person':
          setPersons(prev => prev.map(p => p.id === u.id ? { ...p, x: u.x, y: u.y } : p));
          break;
        case 'update_person':
          setPersons(prev => prev.map(p => p.id === u.id ? { ...p, ...u.changes } : p));
          break;
        case 'remove_person':
          setPersons(prev => prev.filter(p => p.id !== u.id));
          setRelationships(prev => prev.filter(r => r.fromId !== u.id && r.toId !== u.id));
          break;
        case 'add_relationship':
          if (u.relationship) {
            setRelationships(prev => {
              if (prev.find(r => r.id === u.relationship.id)) return prev;
              return [...prev, u.relationship];
            });
          }
          break;
        case 'remove_relationship':
          setRelationships(prev => prev.filter(r => r.id !== u.id));
          break;
      }
    });
  }, []);

  /* ─── Send user message to AI ─── */
  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { role: 'user', content: text, display: text };
    setChatMessages(prev => [...prev, userMsg]);
    const newApiMsgs: ApiMessage[] = [...apiMessages, { role: 'user', content: text }];
    setApiMessages(newApiMsgs);
    setIsLoading(true);

    const systemPrompt = buildSystemPrompt(constellationType, persons, relationships);
    const result = await callCoachAPI(newApiMsgs, systemPrompt);

    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: JSON.stringify(result),
      display: result.message || '...',
    };
    setChatMessages(prev => [...prev, assistantMsg]);
    setApiMessages(prev => [...prev, { role: 'assistant', content: result.message }]);
    applyUpdates(result.updates);
    setIsLoading(false);
  }, [apiMessages, constellationType, persons, relationships, applyUpdates]);

  /* ─── Board interaction handlers ─── */
  const handleMovePerson = useCallback((id: string, x: number, y: number, finished = false) => {
    setPersons(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
    if (finished) {
      setPersons(current => {
        const person = current.find(p => p.id === id);
        if (person) {
          const sysMsg: ChatMessage = {
            role: 'system', content: '',
            display: `📌 ${person.name} wurde auf dem Brett verschoben.`,
          };
          setChatMessages(prev => [...prev, sysMsg]);
          setApiMessages(prev => [
            ...prev,
            { role: 'user' as const, content: `[Änderung am Brett] ${person.name} wurde verschoben auf Position x=${Math.round(person.x)}, y=${Math.round(person.y)}.` },
          ]);
        }
        return current;
      });
    }
  }, []);

  const handleUpdatePerson = useCallback((id: string, changes: Partial<Person>) => {
    setPersons(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
    setPersons(current => {
      const person = current.find(p => p.id === id);
      if (person && changes.emotion) {
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
      return current;
    });
  }, []);

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
      colorIndex.current = 0;
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
          />
          <PersonDetail
            person={selectedPersonData}
            onUpdate={handleUpdatePerson}
            onDeselect={() => setSelectedPerson(null)}
          />
        </div>
      </div>
    </div>
  );
}
