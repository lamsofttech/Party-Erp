// src/components/SlottedCard.tsx
import React from "react";

/**
 * Mobile-first, PWA-friendly SlottedCard
 * - Named export
 * - Optional description, actions (right), and footer slots
 * - Compact / elevated variants
 * - Loading + empty states
 * - Safe-area aware padding for iOS PWAs
 */

export type SlottedCardProps = {
  title: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  description?: string | React.ReactNode;
  actions?: React.ReactNode; // right of title
  footer?: React.ReactNode;  // bottom area
  compact?: boolean;         // tighter paddings
  elevated?: boolean;        // stronger shadow ring
  loading?: boolean;         // skeleton
  empty?: boolean;           // empty state visual
  className?: string;
  id?: string;
  "aria-label"?: string;
};

export const SlottedCard: React.FC<SlottedCardProps> = ({
  title,
  icon,
  children,
  description,
  actions,
  footer,
  compact,
  elevated,
  loading,
  empty,
  className = "",
  id,
  "aria-label": ariaLabel,
}) => {
  const basePad = compact ? "p-4" : "p-6";
  const headerPad = compact ? "pb-3" : "pb-4";

  return (
    <section
      id={id}
      aria-label={ariaLabel || (typeof title === "string" ? title : undefined)}
      className={[
        "rounded-2xl bg-white dark:bg-gray-900/90 backdrop-blur supports-[backdrop-filter]:bg-white/80",
        "ring-1 ring-black/5 dark:ring-white/10",
        elevated ? "shadow-xl" : "shadow-md",
        basePad,
        "text-gray-800 dark:text-gray-100",
        "w-full",
        className,
      ].join(" ")}
      style={{
        // iOS PWA safe-area awareness for cards placed at screen edges
        paddingBottom: `max(env(safe-area-inset-bottom), 0px)`,
      }}
    >
      {/* Header */}
      <header className={["flex items-start gap-3", headerPad].join(" ")}>        
        {icon && (
          <div className="flex-shrink-0 text-blue-500 dark:text-blue-400 mt-0.5">{icon}</div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg sm:text-xl font-semibold leading-tight truncate">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{description}</p>
          )}
        </div>
        {actions && <div className="flex-shrink-0 ml-2 -mt-1">{actions}</div>}
      </header>

      {/* Body */}
      <div className={empty ? "opacity-75" : ""}>
        {loading ? (
          <Skeleton compact={!!compact} />
        ) : empty ? (
          <EmptyState />
        ) : (
          children
        )}
      </div>

      {/* Footer */}
      {footer && (
        <div className={["mt-4 pt-3 border-t border-black/5 dark:border-white/10", compact ? "mt-3" : ""].join(" ")}>{footer}</div>
      )}
    </section>
  );
};

function Skeleton({ compact }: { compact: boolean }) {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-3 w-5/6 bg-black/10 dark:bg-white/10 rounded" />
      <div className="h-3 w-4/6 bg-black/10 dark:bg-white/10 rounded" />
      <div className={"h-28 rounded " + (compact ? "bg-black/5 dark:bg-white/5" : "bg-black/5 dark:bg-white/5")} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center text-center py-8">
      <div>
        <p className="text-sm font-medium">Nothing here yet</p>
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Add content or connect a data source.</p>
      </div>
    </div>
  );
}
