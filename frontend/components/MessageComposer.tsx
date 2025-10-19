import { useState } from 'react';
import { Send } from 'lucide-react';

export default function MessageComposer({ onSend, placeholder }: { onSend: (text: string) => void; placeholder: string }) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button type="submit"
              className="p-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors">
        <Send size={18} />
      </button>
    </form>
  );
}
