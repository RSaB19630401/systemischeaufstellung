import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isLoading: boolean;
}

export default function ChatPanel({ messages, onSend, isLoading }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-bubble chat-bubble--${msg.role}`}
          >
            {msg.role === 'system' ? (
              <em className="chat-system-text">{msg.display}</em>
            ) : (
              msg.display || msg.content
            )}
          </div>
        ))}
        {isLoading && (
          <div className="chat-bubble chat-bubble--loading">
            <span className="dot dot-1">●</span>
            <span className="dot dot-2">●</span>
            <span className="dot dot-3">●</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit(e)}
          placeholder="Nachricht eingeben..."
          disabled={isLoading}
        />
        <button
          className="chat-send"
          onClick={() => handleSubmit()}
          disabled={isLoading || !input.trim()}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
