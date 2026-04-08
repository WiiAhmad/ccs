import { Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LogsSource } from '@/lib/api-client';
import type { LogsLevelFilter, LogsSourceFilter } from '@/hooks/use-logs';
import { getLogLevelOptions, getSelectedSourceLabel } from '@/hooks/use-logs';

export function LogsFilters({
  sources,
  selectedSource,
  onSourceChange,
  selectedLevel,
  onLevelChange,
  search,
  onSearchChange,
  limit,
  onLimitChange,
  onRefresh,
  isRefreshing,
}: {
  sources: LogsSource[];
  selectedSource: LogsSourceFilter;
  onSourceChange: (value: LogsSourceFilter) => void;
  selectedLevel: LogsLevelFilter;
  onLevelChange: (value: LogsLevelFilter) => void;
  search: string;
  onSearchChange: (value: string) => void;
  limit: number;
  onLimitChange: (value: number) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const sourceLabel = getSelectedSourceLabel(selectedSource, sources);

  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <CardTitle>Log explorer</CardTitle>
          <CardDescription>
            Slice the unified CCS log stream by source, severity, or message content.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={onRefresh}>
          <RefreshCw className={isRefreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="logs-source-filter">Source</Label>
          <Select value={selectedSource} onValueChange={(value) => onSourceChange(value)}>
            <SelectTrigger id="logs-source-filter" aria-label="Source filter">
              <SelectValue placeholder="All sources">{sourceLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sources.map((source) => (
                <SelectItem key={source.source} value={source.source}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="logs-level-filter">Level</Label>
          <Select
            value={selectedLevel}
            onValueChange={(value) => onLevelChange(value as LogsLevelFilter)}
          >
            <SelectTrigger id="logs-level-filter" aria-label="Level filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getLogLevelOptions().map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="logs-limit-filter">Visible entries</Label>
          <Select value={String(limit)} onValueChange={(value) => onLimitChange(Number(value))}>
            <SelectTrigger id="logs-limit-filter" aria-label="Visible entries">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[50, 100, 150, 250].map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} entries
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="logs-search">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="logs-search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search message, event, process, or run ID"
              className="pl-9"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
