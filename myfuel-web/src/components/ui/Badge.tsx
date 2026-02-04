import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  default: 'bg-slate-100 text-slate-800',
};

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantStyles[variant]
      )}
    >
      {children}
    </span>
  );
}

export function getStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'ACTIVE':
    case 'APPROVED':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'BLOCKED':
    case 'DECLINED':
    case 'SUSPENDED':
    case 'CANCELLED':
      return 'danger';
    case 'REVERSED':
      return 'info';
    default:
      return 'default';
  }
}
