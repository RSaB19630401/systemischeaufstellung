import { REL_STYLES } from '../constants';

export default function Legend() {
  return (
    <div className="legend">
      <strong className="legend-title">Beziehungen</strong>
      <div className="legend-items">
        {Object.entries(REL_STYLES).map(([key, s]) => (
          <div key={key} className="legend-item">
            <svg width="24" height="8" aria-hidden="true">
              <line
                x1="0" y1="4" x2="24" y2="4"
                stroke={s.stroke}
                strokeWidth={s.width * 0.8}
                strokeDasharray={s.dash === 'none' ? undefined : s.dash}
              />
            </svg>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
