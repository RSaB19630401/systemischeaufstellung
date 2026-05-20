import { useState } from 'react';
import { CONSTELLATION_TYPES } from '../constants';
import type { ConstellationTypeId } from '../types';

interface Props {
  constellationType: ConstellationTypeId;
  onExportJSON: () => void;
  onExportSVG: () => void;
  onExportPNG: () => void;
  onExportPDF: () => void;
  onImportJSON: () => void;
  onReset: () => void;
}

export default function Toolbar({
  constellationType, onExportJSON, onExportSVG, onExportPNG, onExportPDF,
  onImportJSON, onReset,
}: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const typeLabel = CONSTELLATION_TYPES.find(t => t.id === constellationType)?.label || '';

  const menuItems = [
    { label: '💾 JSON exportieren', action: onExportJSON },
    { label: '🖼 SVG exportieren', action: onExportSVG },
    { label: '📷 PNG exportieren', action: onExportPNG },
    { label: '📄 PDF-Bericht', action: onExportPDF },
    { label: '📂 JSON importieren', action: onImportJSON },
    { label: '🔄 Neue Aufstellung', action: onReset },
  ];

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <span className="toolbar-title">Aufstellung</span>
        <span className="toolbar-badge">{typeLabel}</span>
      </div>
      <div className="toolbar-right">
        <button
          className="toolbar-menu-btn"
          onClick={() => setShowMenu(!showMenu)}
        >
          ☰ Menü
        </button>
        {showMenu && (
          <>
            <div
              className="toolbar-overlay"
              onClick={() => setShowMenu(false)}
            />
            <div className="toolbar-dropdown">
              {menuItems.map((item, i) => (
                <button
                  key={i}
                  className="toolbar-dropdown-item"
                  onClick={() => { item.action(); setShowMenu(false); }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
