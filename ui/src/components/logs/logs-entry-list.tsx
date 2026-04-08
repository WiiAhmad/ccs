import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LogsEntry } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { LogLevelBadge } from './log-level-badge';
import { formatLogTimestamp, formatRelativeLogTime } from './utils';

export function LogsEntryList({
  entries,
  selectedEntryId,
  onSelect,
  sourceLabels,
  isLoading,
  isFetching,
}: {
  entries: LogsEntry[];
  selectedEntryId: string | null;
  onSelect: (entryId: string) => void;
  sourceLabels: Record<string, string>;
  isLoading: boolean;
  isFetching: boolean;
}) {
  return (
    <Card className="gap-4">
      <CardHeader className="space-y-1 border-b pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Recent entries</CardTitle>
            <CardDescription>Latest matches for the active filter set.</CardDescription>
          </div>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="space-y-3 px-6 pb-6">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="rounded-xl border p-4">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="mt-3 h-4 w-4/5 rounded bg-muted" />
                <div className="mt-2 h-3 w-2/5 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 px-6 py-12 text-center text-muted-foreground">
            <Inbox className="h-8 w-8" />
            <div>
              <p className="font-medium text-foreground">No entries matched these filters.</p>
              <p className="text-sm">Try broadening the source, severity, or search terms.</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[34rem]">
            <div className="space-y-3 px-4 pb-4">
              {entries.map((entry) => {
                const isSelected = entry.id === selectedEntryId;

                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onSelect(entry.id)}
                    className={cn(
                      'w-full rounded-xl border px-4 py-3 text-left transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-background hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <LogLevelBadge level={entry.level} />
                          <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                            {sourceLabels[entry.source] ?? entry.source}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm font-medium leading-6">
                          {entry.message}
                        </p>
                      </div>
                      {entry.level === 'error' ? (
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{entry.event}</span>
                      <span>{formatRelativeLogTime(entry.timestamp)}</span>
                      <span>{formatLogTimestamp(entry.timestamp)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
