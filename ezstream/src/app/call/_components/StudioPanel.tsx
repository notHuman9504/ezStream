import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type StudioPanelProps = {
  title: string;
  description?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function StudioPanel({ title, description, className, children }: StudioPanelProps) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className={cn('rounded-card bg-surface p-5 sm:p-6', className)}>
      <h2 id={titleId} className="text-h4">
        {title}
      </h2>
      {description && <p className="mt-1.5 text-body-sm text-fg-50">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-tag text-fg-50">
      {children}
    </label>
  );
}

// A thin rule between the parts of a panel.
export function PanelSection({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mt-6 border-t border-line pt-6', className)}>{children}</div>;
}
