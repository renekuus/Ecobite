'use client';

import { useState } from 'react';
import { toISODate, daysAgo, startOfMonth, startOfYear, today } from '@/lib/api';

export type Granularity = 'daily' | 'weekly' | 'monthly';

export interface Period {
  from:  string;
  to:    string;
  gran:  Granularity;
  label: string;
}

type PeriodKey = 'today' | '7d' | 'month' | '3months' | 'year' | 'custom';

const PRESETS: { key: PeriodKey; label: string }[] = [
  { key: 'today',   label: 'Today' },
  { key: '7d',      label: 'Last 7 Days' },
  { key: 'month',   label: 'This Month' },
  { key: '3months', label: 'Last 3 Months' },
  { key: 'year',    label: 'This Year' },
  { key: 'custom',  label: 'Custom' },
];

function resolvePeriod(key: PeriodKey, customFrom: string, customTo: string): Period {
  const t = today();
  switch (key) {
    case 'today':   return { from: t,                           to: t,                            gran: 'daily',   label: 'Today' };
    case '7d':      return { from: toISODate(daysAgo(6)),       to: t,                            gran: 'daily',   label: 'Last 7 Days' };
    case 'month':   return { from: toISODate(startOfMonth()),   to: t,                            gran: 'daily',   label: 'This Month' };
    case '3months': return { from: toISODate(daysAgo(89)),      to: t,                            gran: 'weekly',  label: 'Last 3 Months' };
    case 'year':    return { from: toISODate(startOfYear()),    to: t,                            gran: 'monthly', label: 'This Year' };
    case 'custom': {
      const from  = customFrom || toISODate(daysAgo(30));
      const to    = customTo   || t;
      const nDays = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400_000);
      const gran: Granularity = nDays <= 31 ? 'daily' : nDays <= 120 ? 'weekly' : 'monthly';
      return { from, to, gran, label: `${from} → ${to}` };
    }
  }
}

interface PeriodPickerProps {
  onChange: (period: Period) => void;
  defaultPeriod?: PeriodKey;
}

export default function PeriodPicker({ onChange, defaultPeriod = 'month' }: PeriodPickerProps) {
  const [active, setActive]       = useState<PeriodKey>(defaultPeriod);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');

  function select(key: PeriodKey) {
    setActive(key);
    if (key !== 'custom') {
      onChange(resolvePeriod(key, '', ''));
    }
  }

  function applyCustom() {
    if (customFrom && customTo && customFrom <= customTo) {
      onChange(resolvePeriod('custom', customFrom, customTo));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => select(key)}
            className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
              active === key
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {active === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={customFrom}
            onChange={e => setCustomFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-green-400"
          />
          <span className="text-xs text-gray-400">→</span>
          <input
            type="date"
            value={customTo}
            onChange={e => setCustomTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-green-400"
          />
          <button
            onClick={applyCustom}
            disabled={!customFrom || !customTo || customFrom > customTo}
            className="px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white font-medium disabled:opacity-40 hover:bg-green-700 transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

// Export helper so pages can compute the initial period
export { resolvePeriod };
