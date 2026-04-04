import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import type { AuthAccountRow, SharedGroupSummary } from '@/lib/account-continuity';
import { useUpdateAccountContext } from '@/hooks/use-accounts';

type ContextMode = 'isolated' | 'shared';
type ContinuityMode = 'standard' | 'deeper';

const MAX_CONTEXT_GROUP_LENGTH = 64;
const CONTEXT_GROUP_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

interface EditAccountContextDialogProps {
  account: AuthAccountRow;
  groupSummaries: SharedGroupSummary[];
  onClose: () => void;
}

export function EditAccountContextDialog({
  account,
  groupSummaries,
  onClose,
}: EditAccountContextDialogProps) {
  const { t } = useTranslation();
  const updateContextMutation = useUpdateAccountContext();
  const [mode, setMode] = useState<ContextMode>(
    account.context_mode === 'shared' ? 'shared' : 'isolated'
  );
  const [group, setGroup] = useState(account.context_group || 'default');
  const [continuityMode, setContinuityMode] = useState<ContinuityMode>(
    account.continuity_mode === 'deeper' ? 'deeper' : 'standard'
  );

  const normalizedGroup = useMemo(() => group.trim().toLowerCase().replace(/\s+/g, '-'), [group]);
  const matchingGroup = useMemo(
    () => groupSummaries.find((summary) => summary.group === normalizedGroup),
    [groupSummaries, normalizedGroup]
  );
  const isSharedGroupValid =
    normalizedGroup.length > 0 &&
    normalizedGroup.length <= MAX_CONTEXT_GROUP_LENGTH &&
    CONTEXT_GROUP_PATTERN.test(normalizedGroup);
  const canSubmit = mode === 'isolated' || isSharedGroupValid;
  const sameGroupPeerCount =
    mode === 'shared'
      ? Math.max(
          (matchingGroup?.sharedCount ?? 0) -
            (account.context_mode === 'shared' && account.context_group === normalizedGroup
              ? 1
              : 0),
          0
        )
      : 0;
  const sameGroupDeeperPeerCount =
    mode === 'shared'
      ? Math.max(
          (matchingGroup?.deeperCount ?? 0) -
            (account.continuity_mode === 'deeper' && account.context_group === normalizedGroup
              ? 1
              : 0),
          0
        )
      : 0;

  const handleSave = () => {
    if (!canSubmit) {
      return;
    }

    updateContextMutation.mutate(
      {
        name: account.name,
        context_mode: mode,
        context_group: mode === 'shared' ? normalizedGroup : undefined,
        continuity_mode: mode === 'shared' ? continuityMode : undefined,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('editAccountContext.title')}</DialogTitle>
          <DialogDescription>
            {t('editAccountContext.description', { name: account.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="context-mode">{t('editAccountContext.syncMode')}</Label>
            <Select value={mode} onValueChange={(value) => setMode(value as ContextMode)}>
              <SelectTrigger id="context-mode">
                <SelectValue placeholder={t('editAccountContext.selectContextMode')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="isolated">{t('editAccountContext.isolatedOption')}</SelectItem>
                <SelectItem value="shared">{t('editAccountContext.sharedOption')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {mode === 'shared'
                ? t('editAccountContext.sharedModeHint')
                : t('editAccountContext.isolatedModeHint')}
            </p>
          </div>

          {mode === 'shared' && (
            <div className="space-y-2">
              <Label htmlFor="context-group">{t('editAccountContext.historySyncGroup')}</Label>
              <Input
                id="context-group"
                value={group}
                onChange={(event) => setGroup(event.target.value)}
                placeholder={t('editAccountContext.groupPlaceholder')}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                {t('editAccountContext.groupHint', { max: MAX_CONTEXT_GROUP_LENGTH })}
              </p>
              {!isSharedGroupValid && (
                <p className="text-xs text-destructive">{t('editAccountContext.invalidGroup')}</p>
              )}
            </div>
          )}

          {mode === 'shared' && (
            <div className="space-y-2">
              <Label htmlFor="continuity-mode">{t('editAccountContext.continuityDepth')}</Label>
              <Select
                value={continuityMode}
                onValueChange={(value) => setContinuityMode(value as ContinuityMode)}
              >
                <SelectTrigger id="continuity-mode">
                  <SelectValue placeholder={t('editAccountContext.selectContinuityDepth')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">{t('editAccountContext.standardOption')}</SelectItem>
                  <SelectItem value="deeper">{t('editAccountContext.deeperOption')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {continuityMode === 'deeper'
                  ? t('editAccountContext.deeperHint')
                  : t('editAccountContext.standardHint')}
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {t('editAccountContext.credentialsIsolated')}
          </p>

          <div className="rounded-md border bg-muted/20 p-3 text-xs">
            <p className="font-medium text-foreground">
              {t('editAccountContext.implicationTitle')}
            </p>
            <div className="mt-2 space-y-1.5 text-muted-foreground">
              {mode === 'isolated' ? (
                <p>{t('editAccountContext.isolatedImplication')}</p>
              ) : (
                <>
                  <p>{t('editAccountContext.sameGroupRule', { group: normalizedGroup })}</p>
                  <p>
                    {sameGroupPeerCount > 0
                      ? t('editAccountContext.sameGroupPeerCount', { count: sameGroupPeerCount })
                      : t('editAccountContext.noSameGroupPeer')}
                  </p>
                  <p>
                    {continuityMode === 'deeper'
                      ? sameGroupDeeperPeerCount > 0
                        ? t('editAccountContext.deeperReady', {
                            count: sameGroupDeeperPeerCount,
                          })
                        : t('editAccountContext.deeperNeedsPeers')
                      : t('editAccountContext.standardWarning')}
                  </p>
                </>
              )}
              <p>{t('editAccountContext.resumeOriginalWarning')}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={updateContextMutation.isPending}>
            {t('editAccountContext.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!canSubmit || updateContextMutation.isPending}>
            {updateContextMutation.isPending
              ? t('editAccountContext.saving')
              : t('editAccountContext.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
