export function StatCard({
    title,
    value,
    hint,
}: {
    title: string;
    value: number;
    hint?: string;
}) {
    return (
        <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-md p-4 border border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">{title}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
            {hint ? (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {hint}
                </div>
            ) : null}
        </div>
    );
}

