import React from 'react';
import { RequestPriority } from '../types';
import { AlertCircle, Clock, Calendar } from 'lucide-react';

interface Props {
  priority: RequestPriority;
}

export const PriorityBadge: React.FC<Props> = ({ priority }) => {
  if (priority === 'CRITICAL') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-blood-700 border border-blood-200 animate-pulse">
        <AlertCircle className="w-3.5 h-3.5" />
        CRITICAL (Immediate)
      </span>
    );
  }

  if (priority === 'URGENT') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3.5 h-3.5" />
        URGENT (&lt; 24h)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
      <Calendar className="w-3.5 h-3.5" />
      SCHEDULED
    </span>
  );
};
