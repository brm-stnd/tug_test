interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function Card({ title, children, className = '', action }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
