import { Check } from 'lucide-react';

type Item = { at: string; name: string };

export default function Timeline({ items }: { items: Item[] }) {
  return (
    <ol className="relative border-l border-slate-200 ml-2">
      {items.map((item, i) => (
        <li key={i} className="mb-6 ml-6">
          <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-4 ring-white
                           ${i === items.length - 1 ? 'bg-blue-500' : 'bg-green-500'}`}>
            <Check size={14} className="text-white" />
          </span>
          <h3 className="font-semibold text-slate-800">{item.name}</h3>
          <time className="block text-sm font-normal leading-none text-slate-400">{item.at}</time>
        </li>
      ))}
    </ol>
  );
}
