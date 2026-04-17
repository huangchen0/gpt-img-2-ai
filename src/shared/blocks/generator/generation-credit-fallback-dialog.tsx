'use client';

import { CreditCard, ImageIcon, Sparkles, Video } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

interface GenerationCreditFallbackAction {
  id: string;
  badgeLabel: string;
  title: string;
  description: string;
  creditsLabel: string;
  visualType: 'image' | 'video';
  onSelect: () => void | Promise<void>;
}

interface GenerationCreditFallbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  currentModeLabel: string;
  currentModeValue: string;
  remainingCreditsLabel: string;
  remainingCreditsValue: string;
  switchLabel: string;
  upgradeLabel: string;
  closeLabel: string;
  onUpgrade: () => void;
  actions: GenerationCreditFallbackAction[];
}

export function GenerationCreditFallbackDialog({
  open,
  onOpenChange,
  title,
  description,
  currentModeLabel,
  currentModeValue,
  remainingCreditsLabel,
  remainingCreditsValue,
  switchLabel,
  upgradeLabel,
  closeLabel,
  onUpgrade,
  actions,
}: GenerationCreditFallbackDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="space-y-3 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="bg-muted/40 rounded-lg border p-4">
            <p className="text-muted-foreground text-xs">{currentModeLabel}</p>
            <p className="mt-2 text-xl font-semibold">{currentModeValue}</p>
          </div>
          <div className="bg-muted/40 rounded-lg border p-4">
            <p className="text-muted-foreground text-xs">
              {remainingCreditsLabel}
            </p>
            <p className="mt-2 text-xl font-semibold">
              {remainingCreditsValue}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {actions.map((action) => {
            const Icon = action.visualType === 'image' ? ImageIcon : Video;

            return (
              <div
                key={action.id}
                className="bg-background rounded-xl border p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{action.badgeLabel}</Badge>
                      <span className="text-muted-foreground text-xs">
                        {action.creditsLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon className="text-primary h-4 w-4" />
                      <p className="font-medium">{action.title}</p>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {action.description}
                    </p>
                  </div>
                  <Button type="button" onClick={action.onSelect}>
                    <Sparkles className="h-4 w-4" />
                    {switchLabel}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onUpgrade}>
            <CreditCard className="h-4 w-4" />
            {upgradeLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {closeLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
