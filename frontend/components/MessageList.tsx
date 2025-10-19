export default function MessageList({ items }: { items: { by: string; at: string; text: string }[] }) {
  const isStaff = (by: string) => by !== 'You' && by !== 'Admissions Bot';
  
  return (
    <div className="space-y-4">
      {items.map((msg, i) => (
        <div key={i} className={`flex flex-col ${isStaff(msg.by) ? 'items-start' : 'items-end'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold">{msg.by}</span>
            <span className="text-xs text-slate-400">{new Date(msg.at).toLocaleString()}</span>
          </div>
          <div className={`p-3 rounded-2xl max-w-lg
                           ${isStaff(msg.by) 
                             ? 'bg-slate-100 text-slate-800 rounded-tl-none' 
                             : 'bg-blue-600 text-white rounded-br-none'}`}>
            {msg.text}
          </div>
        </div>
      ))}
    </div>
  );
}
