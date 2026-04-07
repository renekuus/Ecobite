'use client';

interface KpiCardProps {
  title:    string;
  value:    string;
  sub?:     string;
  accent?:  boolean;
}

export default function KpiCard({ title, value, sub, accent }: KpiCardProps) {
  return (
    <div
      className={`rounded-xl border p-5 flex flex-col gap-1 ${
        accent
          ? 'bg-brand-green-light border-brand-green'
          : 'bg-white border-gray-200'
      }`}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
      <p className={`text-2xl font-semibold tabular-nums ${accent ? 'text-green-700' : 'text-gray-900'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
