import { useRef, useState, useCallback, useEffect } from 'react';
import type { Person, Relationship, RelationshipType } from '../types';
import { EMOTIONS, REL_STYLES } from '../constants';
import { sketchyCircle, sketchyLine } from '../utils/svg-helpers';

interface Props {
  persons: Person[];
  relationships: Relationship[];
  onMovePerson: (id: string, x: number, y: number, finished?: boolean) => void;
  onSelectPerson: (id: string) => void;
  selectedPerson: string | null;
}

export default function Whiteboard({
  persons, relationships, onMovePerson, onSelectPerson, selectedPerson,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [svgRect, setSvgRect] = useState<DOMRect | null>(null);

  const getPos = useCallback((e: MouseEvent | TouchEvent, rect: DOMRect) => {
    const point = 'touches' in e ? e.touches[0] : e;
    const x = ((point.clientX - rect.left) / rect.width) * 100;
    const y = ((point.clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
    };
  }, []);

  const handlePointerDown = useCallback((
    e: React.MouseEvent | React.TouchEvent, personId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setSvgRect(rect);
      setDragging(personId);
    }
  }, []);

  const handlePointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragging || !svgRect) return;
    e.preventDefault();
    const { x, y } = getPos(e, svgRect);
    onMovePerson(dragging, x, y);
  }, [dragging, svgRect, getPos, onMovePerson]);

  const handlePointerUp = useCallback(() => {
    if (dragging) {
      const p = persons.find(pp => pp.id === dragging);
      if (p) onMovePerson(dragging, p.x, p.y, true);
    }
    setDragging(null);
    setSvgRect(null);
  }, [dragging, persons, onMovePerson]);

  useEffect(() => {
    if (!dragging) return;
    const opts = { passive: false } as AddEventListenerOptions;
    window.addEventListener('mousemove', handlePointerMove, opts);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, opts);
    window.addEventListener('touchend', handlePointerUp);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [dragging, handlePointerMove, handlePointerUp]);

  const R = 4.5;

  return (
    <div className="whiteboard-container">
      <svg
        ref={svgRef}
        className="whiteboard-svg"
        viewBox="0 0 100 100"
      >
        {/* Grid dots */}
        {Array.from({ length: 9 }, (_, i) =>
          Array.from({ length: 9 }, (_, j) => (
            <circle
              key={`g${i}${j}`}
              cx={(i + 1) * 10} cy={(j + 1) * 10}
              r="0.3" fill="#E0D5C5" opacity="0.5"
            />
          ))
        )}

        {/* Relationships */}
        {relationships.map(rel => {
          const from = persons.find(p => p.id === rel.fromId);
          const to = persons.find(p => p.id === rel.toId);
          if (!from || !to) return null;
          const s = REL_STYLES[rel.type as RelationshipType] || REL_STYLES.close;
          const dashScaled = s.dash === 'none'
            ? undefined
            : s.dash.split(',').map(n => parseFloat(n) * 0.2).join(',');
          return (
            <g key={rel.id}>
              <path
                d={sketchyLine(from.x, from.y, to.x, to.y, rel.id.charCodeAt(0))}
                stroke={s.stroke} strokeWidth={s.width * 0.25}
                strokeDasharray={dashScaled}
                fill="none" opacity="0.7"
              />
              {rel.label && (
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 1.5}
                  textAnchor="middle" fontSize="2.2"
                  fill={s.stroke} fontFamily="'Caveat', cursive" fontWeight="600"
                >
                  {rel.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Persons */}
        {persons.map(p => {
          const emColor = EMOTIONS[p.emotion]?.color || EMOTIONS.neutral.color;
          const isSelected = selectedPerson === p.id;
          return (
            <g
              key={p.id}
              style={{ cursor: dragging === p.id ? 'grabbing' : 'grab' }}
              onMouseDown={e => handlePointerDown(e, p.id)}
              onTouchStart={e => handlePointerDown(e, p.id)}
              onClick={e => { e.stopPropagation(); onSelectPerson(p.id); }}
            >
              {isSelected && (
                <circle
                  cx={p.x} cy={p.y} r={R + 1.5}
                  fill="none" stroke="#B8A990" strokeWidth="0.3" strokeDasharray="1,1"
                />
              )}
              <path
                d={sketchyCircle(p.x, p.y, R, p.id.charCodeAt(0))}
                fill={p.color || '#E8927C'} opacity="0.25"
                stroke={p.color || '#E8927C'} strokeWidth="0.4"
              />
              <circle cx={p.x} cy={p.y} r={R * 0.55} fill={emColor} opacity="0.9" />
              <text
                x={p.x} y={p.y + 0.6}
                textAnchor="middle" fontSize="2.2" fill="#FFF"
                fontFamily="'Caveat', cursive" fontWeight="700"
                style={{ pointerEvents: 'none' }}
              >
                {p.name?.charAt(0)?.toUpperCase() || '?'}
              </text>
              <text
                x={p.x} y={p.y + R + 2.5}
                textAnchor="middle" fontSize="2.5" fill="#3A3028"
                fontFamily="'Caveat', cursive" fontWeight="600"
                style={{ pointerEvents: 'none' }}
              >
                {p.name}
              </text>
              <text
                x={p.x} y={p.y + R + 4.8}
                textAnchor="middle" fontSize="1.8" fill="#8B7E6E"
                fontFamily="'Caveat', cursive"
                style={{ pointerEvents: 'none' }}
              >
                {p.role}
              </text>
            </g>
          );
        })}

        {persons.length === 0 && (
          <text
            x="50" y="50" textAnchor="middle" fontSize="3"
            fill="#B8A990" fontFamily="'Caveat', cursive"
          >
            Das Aufstellungsbrett ist bereit...
          </text>
        )}
      </svg>
    </div>
  );
}
