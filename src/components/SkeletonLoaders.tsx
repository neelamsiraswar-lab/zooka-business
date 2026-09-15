import React from 'react';

interface SkeletonBoxProps {
  className?: string;
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({ className = '' }) => (
  <div
    className={`bg-slate-800/70 rounded-lg animate-pulse animate-shimmer border border-slate-700/30 ${className}`}
  />
);

export const SkeletonText: React.FC<{ className?: string; width?: string }> = ({
  className = '',
  width = 'w-24',
}) => (
  <div
    className={`h-4 bg-slate-800/80 rounded-md animate-pulse animate-shimmer ${width} ${className}`}
  />
);

export const SkeletonBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`h-5 w-16 bg-slate-800/90 rounded-full animate-pulse animate-shimmer border border-slate-700/40 ${className}`}
  />
);

export const SkeletonMetricCard: React.FC<{
  titleWidth?: string;
  hasSubtext?: boolean;
}> = ({ titleWidth = 'w-28', hasSubtext = true }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden animate-pulse animate-shimmer">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/50 flex-shrink-0" />
        <div className={`h-4 bg-slate-800 rounded-md ${titleWidth}`} />
      </div>
      <div className="w-6 h-4 bg-slate-800/60 rounded-md" />
    </div>
    <div className="h-7 w-36 bg-slate-800/90 rounded-lg mt-2" />
    {hasSubtext && (
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
        <div className="h-3 w-24 bg-slate-800/60 rounded" />
        <div className="h-3 w-16 bg-slate-800/40 rounded" />
      </div>
    )}
  </div>
);

export const SkeletonMetricGrid: React.FC<{ count?: number; cols?: string }> = ({
  count = 4,
  cols = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}) => (
  <div className={`grid ${cols} gap-4`}>
    {Array.from({ length: count }).map((_, idx) => (
      <SkeletonMetricCard key={idx} />
    ))}
  </div>
);

export const SkeletonTable: React.FC<{
  columns?: number;
  rows?: number;
  hasHeader?: boolean;
}> = ({ columns = 7, rows = 6, hasHeader = true }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
    {hasHeader && (
      <div className="bg-slate-950/80 p-4 border-b border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-4 w-32 bg-slate-800 rounded-md animate-pulse animate-shimmer" />
          <div className="h-5 w-16 bg-slate-800/60 rounded-full animate-pulse animate-shimmer" />
        </div>
        <div className="h-8 w-48 bg-slate-800/70 rounded-xl animate-pulse animate-shimmer" />
      </div>
    )}
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-950/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-800">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="py-3.5 px-4">
                <div
                  className={`h-3.5 bg-slate-800 rounded animate-pulse animate-shimmer ${
                    i === 0
                      ? 'w-20'
                      : i === 1
                      ? 'w-36'
                      : i === columns - 1
                      ? 'w-16 ml-auto'
                      : 'w-24'
                  }`}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-800/20">
              {Array.from({ length: columns }).map((_, cIdx) => (
                <td key={cIdx} className="py-3.5 px-4">
                  {cIdx === columns - 1 ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-7 h-7 bg-slate-800/80 rounded-lg animate-pulse animate-shimmer" />
                      <div className="w-7 h-7 bg-slate-800/80 rounded-lg animate-pulse animate-shimmer" />
                    </div>
                  ) : cIdx === columns - 2 ? (
                    <div className="mx-auto w-16 h-5 bg-slate-800/80 rounded-full animate-pulse animate-shimmer" />
                  ) : (
                    <div
                      className={`h-4 bg-slate-800/70 rounded animate-pulse animate-shimmer ${
                        cIdx === 0
                          ? 'w-16'
                          : cIdx === 1
                          ? 'w-40'
                          : cIdx % 2 === 0
                          ? 'w-24 ml-auto'
                          : 'w-20'
                      }`}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const SkeletonDashboardView: React.FC = () => (
  <div className="space-y-6 animate-fade-in" id="dashboard-skeleton-loader">
    {/* Top Banner Skeleton */}
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-56 bg-slate-800 rounded-lg animate-pulse animate-shimmer" />
          <div className="h-5 w-32 bg-slate-800/60 rounded-full animate-pulse animate-shimmer" />
        </div>
        <div className="h-4 w-80 bg-slate-800/60 rounded animate-pulse animate-shimmer" />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="h-9 w-32 bg-slate-800 rounded-xl animate-pulse animate-shimmer" />
        <div className="h-9 w-32 bg-slate-800 rounded-xl animate-pulse animate-shimmer" />
        <div className="h-9 w-36 bg-slate-800 rounded-xl animate-pulse animate-shimmer" />
      </div>
    </div>

    {/* Metric Cards Skeleton Grid (4 KPI Cards) */}
    <SkeletonMetricGrid count={4} />

    {/* Secondary 4 Metrics */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 animate-pulse animate-shimmer"
        >
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-24 bg-slate-800 rounded" />
            <div className="w-5 h-5 bg-slate-800 rounded-lg" />
          </div>
          <div className="h-6 w-28 bg-slate-800/90 rounded-md" />
          <div className="h-3 w-20 bg-slate-800/50 rounded" />
        </div>
      ))}
    </div>

    {/* Two-Column Dashboard Body */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column (2 Cols) - Charts & P&L Skeletons */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-slate-800 rounded" />
              <div className="h-4 w-44 bg-slate-800 rounded" />
            </div>
            <div className="h-4 w-20 bg-slate-800/60 rounded" />
          </div>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-slate-800" />
                  <div className="h-4 w-36 bg-slate-800/80 rounded" />
                </div>
                <div className="h-4 w-24 bg-slate-800/90 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Invoices Table Skeleton */}
        <SkeletonTable columns={6} rows={4} hasHeader={true} />
      </div>

      {/* Right Column (1 Col) - Activity Feed & Alerts Skeleton */}
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-slate-800 rounded" />
              <div className="h-4 w-32 bg-slate-800 rounded" />
            </div>
            <div className="h-5 w-12 bg-slate-800/60 rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-3.5 w-24 bg-slate-800 rounded" />
                  <div className="h-3 w-12 bg-slate-800/50 rounded" />
                </div>
                <div className="h-3.5 w-44 bg-slate-800/70 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const SkeletonInvoiceView: React.FC<{ isSales?: boolean }> = ({ isSales = true }) => (
  <div className="space-y-6 animate-fade-in" id="invoice-skeleton-loader">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="space-y-2">
        <div className="h-6 w-52 bg-slate-800 rounded-lg animate-pulse animate-shimmer" />
        <div className="h-3.5 w-80 bg-slate-800/60 rounded animate-pulse animate-shimmer" />
      </div>
      <div className="h-10 w-44 bg-slate-800 rounded-xl animate-pulse animate-shimmer" />
    </div>

    {/* Metric Row */}
    <SkeletonMetricGrid count={4} />

    {/* Filter Pills & Search */}
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full p-1 w-full sm:w-auto">
        <div className="h-7 w-24 bg-slate-800 rounded-full animate-pulse animate-shimmer" />
        <div className="h-7 w-28 bg-slate-800/60 rounded-full animate-pulse animate-shimmer" />
        <div className="h-7 w-28 bg-slate-800/60 rounded-full animate-pulse animate-shimmer" />
      </div>
      <div className="h-9 w-full sm:w-72 bg-slate-900 border border-slate-800 rounded-xl animate-pulse animate-shimmer" />
    </div>

    {/* Table */}
    <SkeletonTable columns={9} rows={6} hasHeader={false} />
  </div>
);

export const SkeletonLedgersView: React.FC = () => (
  <div className="space-y-6 animate-fade-in" id="ledgers-skeleton-loader">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="space-y-2">
        <div className="h-6 w-48 bg-slate-800 rounded-lg animate-pulse animate-shimmer" />
        <div className="h-3.5 w-72 bg-slate-800/60 rounded animate-pulse animate-shimmer" />
      </div>
      <div className="h-10 w-40 bg-slate-800 rounded-xl animate-pulse animate-shimmer" />
    </div>

    {/* Metrics */}
    <SkeletonMetricGrid count={4} />

    {/* Search & Tabs */}
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full p-1 w-full sm:w-auto">
        <div className="h-7 w-24 bg-slate-800 rounded-full animate-pulse animate-shimmer" />
        <div className="h-7 w-28 bg-slate-800/60 rounded-full animate-pulse animate-shimmer" />
        <div className="h-7 w-28 bg-slate-800/60 rounded-full animate-pulse animate-shimmer" />
      </div>
      <div className="h-9 w-full sm:w-72 bg-slate-900 border border-slate-800 rounded-xl animate-pulse animate-shimmer" />
    </div>

    {/* Parties Table */}
    <SkeletonTable columns={7} rows={6} hasHeader={false} />
  </div>
);

export const SkeletonAccountingView: React.FC = () => (
  <div className="space-y-6 animate-fade-in" id="accounting-skeleton-loader">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="space-y-2">
        <div className="h-6 w-60 bg-slate-800 rounded-lg animate-pulse animate-shimmer" />
        <div className="h-3.5 w-80 bg-slate-800/60 rounded animate-pulse animate-shimmer" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-9 w-32 bg-slate-800 rounded-xl animate-pulse animate-shimmer" />
        <div className="h-9 w-36 bg-slate-800 rounded-xl animate-pulse animate-shimmer" />
      </div>
    </div>

    {/* Subtab navigation */}
    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 overflow-x-auto">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-8 w-28 bg-slate-800/70 rounded-xl animate-pulse animate-shimmer flex-shrink-0" />
      ))}
    </div>

    {/* Report Body Skeletons */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="h-5 w-40 bg-slate-800 rounded animate-pulse animate-shimmer" />
        <div className="space-y-3 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800/40">
              <div className="h-4 w-32 bg-slate-800/80 rounded" />
              <div className="h-4 w-20 bg-slate-800/90 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="h-5 w-40 bg-slate-800 rounded animate-pulse animate-shimmer" />
        <div className="space-y-3 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800/40">
              <div className="h-4 w-32 bg-slate-800/80 rounded" />
              <div className="h-4 w-20 bg-slate-800/90 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
