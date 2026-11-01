import React from 'react';
import { RequestStatus } from '../types';

interface Props {
  status: RequestStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const styles: Record<RequestStatus, { bg: string; text: string; border: string; label: string; dot: string }> = {
    PENDING_VERIFICATION: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      label: 'Pending Verification',
      dot: 'bg-amber-500',
    },
    VERIFIED: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      label: 'Clinically Verified',
      dot: 'bg-blue-500',
    },
    SEARCHING: {
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-200',
      label: 'Searching Donors (5-25km)',
      dot: 'bg-purple-500 animate-ping',
    },
    DONOR_RESPONSES: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      label: 'Donor Willingness Received',
      dot: 'bg-emerald-500',
    },
    COORDINATING: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-200',
      label: 'Hospital Coordinating',
      dot: 'bg-indigo-500',
    },
    FULFILLED: {
      bg: 'bg-green-50',
      text: 'text-green-800',
      border: 'border-green-300',
      label: 'Fulfilled & Safe',
      dot: 'bg-green-600',
    },
    CANCELLED: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-300',
      label: 'Cancelled',
      dot: 'bg-gray-400',
    },
    EXPIRED: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      border: 'border-gray-200',
      label: 'Expired',
      dot: 'bg-gray-400',
    },
    REJECTED: {
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-200',
      label: 'Unverified / Rejected',
      dot: 'bg-red-500',
    },
  };

  const current = styles[status] || styles.PENDING_VERIFICATION;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${current.bg} ${current.text} ${current.border} ${sizeClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
      {current.label}
    </span>
  );
};
