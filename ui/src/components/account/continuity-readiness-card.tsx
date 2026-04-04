import { AlertTriangle, CheckCircle2, Link2, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ContinuityReadinessCardProps {
  totalAccounts: number;
  isolatedCount: number;
  sharedAloneCount: number;
  sharedPeerAccountCount: number;
  deeperReadyAccountCount: number;
  sharedPeerGroups: string[];
  deeperReadyGroups: string[];
}

type ReadinessState =
  | 'single'
  | 'isolated'
  | 'shared-alone'
  | 'shared-standard'
  | 'partial'
  | 'ready';

export function ContinuityReadinessCard({
  totalAccounts,
  isolatedCount,
  sharedAloneCount,
  sharedPeerAccountCount,
  deeperReadyAccountCount,
  sharedPeerGroups,
  deeperReadyGroups,
}: ContinuityReadinessCardProps) {
  const { t } = useTranslation();

  const readiness: ReadinessState =
    totalAccounts < 2
      ? 'single'
      : sharedPeerGroups.length === 0
        ? isolatedCount === totalAccounts
          ? 'isolated'
          : 'shared-alone'
        : deeperReadyGroups.length === 0
          ? 'shared-standard'
          : isolatedCount > 0 ||
              sharedAloneCount > 0 ||
              deeperReadyAccountCount < sharedPeerAccountCount ||
              deeperReadyGroups.length < sharedPeerGroups.length
            ? 'partial'
            : 'ready';

  const highlightGroup = deeperReadyGroups[0] || sharedPeerGroups[0] || 'default';
  const icon =
    readiness === 'ready' ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
    ) : readiness === 'shared-standard' ? (
      <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
    ) : readiness === 'single' ? (
      <ShieldAlert className="h-4 w-4 text-muted-foreground" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
    );
  const stepItems =
    readiness === 'single'
      ? [
          t('continuityReadiness.singleSteps.addAccount'),
          t('continuityReadiness.singleSteps.sameGroupLater'),
          t('continuityReadiness.singleSteps.enableDeeperLater'),
          t('continuityReadiness.singleSteps.resumeOriginal'),
        ]
      : [
          t('continuityReadiness.steps.syncBoth'),
          t('continuityReadiness.steps.sameGroup', { group: highlightGroup }),
          t('continuityReadiness.steps.enableDeeper'),
          t('continuityReadiness.steps.resumeOriginal'),
        ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{t('continuityReadiness.title')}</CardTitle>
            <CardDescription>{t('continuityReadiness.description')}</CardDescription>
          </div>
          <Badge variant={readiness === 'ready' ? 'default' : 'secondary'}>
            {t(`continuityReadiness.state.${readiness}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('continuityReadiness.metrics.isolated')}
            </p>
            <p className="mt-1 text-2xl font-semibold">{isolatedCount}</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('continuityReadiness.metrics.sharedPeers')}
            </p>
            <p className="mt-1 text-2xl font-semibold">{sharedPeerAccountCount}</p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('continuityReadiness.metrics.deeperReady')}
            </p>
            <p className="mt-1 text-2xl font-semibold">{deeperReadyAccountCount}</p>
          </div>
        </div>

        <div className="rounded-md border bg-muted/20 p-3">
          <div className="flex items-start gap-2">
            <div className="mt-0.5">{icon}</div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {t(`continuityReadiness.messages.${readiness}.title`, { group: highlightGroup })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(`continuityReadiness.messages.${readiness}.description`, {
                  group: highlightGroup,
                  count: sharedAloneCount,
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t('continuityReadiness.stepsTitle')}</p>
          <ol className="space-y-2 pl-5 text-sm text-muted-foreground">
            {stepItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
