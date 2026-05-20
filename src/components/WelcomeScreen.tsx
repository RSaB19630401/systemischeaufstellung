import { CONSTELLATION_TYPES } from '../constants';
import type { ConstellationTypeId, ConstellationExport } from '../types';
import { parseImportJSON } from '../utils/export';

interface Props {
  onSelect: (type: ConstellationTypeId, imported?: ConstellationExport) => void;
}

export default function WelcomeScreen({ onSelect }: Props) {
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = parseImportJSON(ev.target?.result as string);
      if (data) onSelect(data.type, data);
      else alert('Ungültige Datei. Bitte eine gültige Aufstellungs-JSON wählen.');
    };
    reader.readAsText(f);
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-inner">
        <h1 className="welcome-title">Systemische Aufstellung</h1>
        <p className="welcome-subtitle">
          Erkunde Beziehungen, Dynamiken und verborgene Muster – geführt durch einen KI-Coach.
        </p>
        <p className="welcome-disclaimer">
          Hinweis: Diese App ersetzt keine professionelle Beratung oder Therapie.
        </p>

        <div className="type-grid">
          {CONSTELLATION_TYPES.map(ct => (
            <button
              key={ct.id}
              className="type-card"
              onClick={() => onSelect(ct.id)}
            >
              <span className="type-icon">{ct.icon}</span>
              <span className="type-label">{ct.label}</span>
              <span className="type-desc">{ct.desc}</span>
            </button>
          ))}
        </div>

        <div className="welcome-import">
          <label className="import-label">
            <span>📂</span>
            <span>Vorherige Aufstellung importieren (JSON)</span>
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
