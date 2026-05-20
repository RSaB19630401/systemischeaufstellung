import type { Person, EmotionKey } from '../types';
import { EMOTIONS } from '../constants';

interface Props {
  person: Person | undefined;
  onUpdate: (id: string, changes: Partial<Person>) => void;
  onDeselect: () => void;
}

export default function PersonDetail({ person, onUpdate, onDeselect }: Props) {
  if (!person) return null;

  return (
    <div className="person-detail">
      <div className="person-detail-header">
        <strong>{person.name} – {person.role}</strong>
        <button className="person-detail-close" onClick={onDeselect}>✕</button>
      </div>
      <div className="emotion-chips">
        {(Object.entries(EMOTIONS) as [EmotionKey, { color: string; label: string }][]).map(
          ([key, val]) => (
            <button
              key={key}
              className={`emotion-chip ${person.emotion === key ? 'emotion-chip--active' : ''}`}
              style={{
                borderColor: person.emotion === key ? val.color : undefined,
                background: person.emotion === key ? val.color + '22' : undefined,
                color: val.color,
              }}
              onClick={() => onUpdate(person.id, { emotion: key })}
            >
              {val.label}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
