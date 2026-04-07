'use client';

const STATUS_STYLES: Record<string, string> = {
  placed:     'bg-blue-50   text-blue-700   border-blue-200',
  confirmed:  'bg-indigo-50 text-indigo-700 border-indigo-200',
  preparing:  'bg-amber-50  text-amber-700  border-amber-200',
  ready:      'bg-yellow-50 text-yellow-700 border-yellow-200',
  assigned:   'bg-purple-50 text-purple-700 border-purple-200',
  picked_up:  'bg-violet-50 text-violet-700 border-violet-200',
  delivering: 'bg-sky-50    text-sky-700    border-sky-200',
  delivered:  'bg-green-50  text-green-700  border-green-200',
  cancelled:  'bg-gray-100  text-gray-500   border-gray-200',
  failed:     'bg-red-50    text-red-700    border-red-200',
};

const LABELS: Record<string, string> = {
  placed:     'Placed',
  confirmed:  'Confirmed',
  preparing:  'Preparing',
  ready:      'Ready',
  assigned:   'Assigned',
  picked_up:  'Picked Up',
  delivering: 'Delivering',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
  failed:     'Failed',
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  const label = LABELS[status] ?? status;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style}`}
    >
      {label}
    </span>
  );
}
