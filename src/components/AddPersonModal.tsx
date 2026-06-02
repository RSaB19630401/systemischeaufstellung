import { useState, useRef, useEffect } from 'react';

interface Props {
  onAdd: (name: string, role: string) => void;
  onClose: () => void;
}

export default function AddPersonModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = () => {
    if (name.trim() && role.trim()) {
      onAdd(name.trim(), role.trim());
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <strong>Person hinzufügen</strong>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label className="modal-label">
            Name
            <input
              ref={inputRef}
              className="modal-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="z.B. Anna"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </label>
          <label className="modal-label">
            Rolle
            <input
              className="modal-input"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="z.B. Mutter, Teamleiter, ..."
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </label>
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn--secondary" onClick={onClose}>Abbrechen</button>
          <button
            className="modal-btn modal-btn--primary"
            onClick={handleSubmit}
            disabled={!name.trim() || !role.trim()}
          >
            Hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}
