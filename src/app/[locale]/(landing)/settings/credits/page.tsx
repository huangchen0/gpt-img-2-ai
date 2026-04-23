import { getTranslations } from 'next-intl/server';

import { envConfigs } from '@/config';
import { Empty } from '@/shared/blocks/common';
import { RewardsPanel } from '@/shared/blocks/credits/rewards-panel';
import { PanelCard } from '@/shared/blocks/panel';
import { TableCard } from '@/shared/blocks/table';
import { getAllConfigsUncached } from '@/shared/models/config';
import {
  Credit,
  CreditStatus,
  CreditTransactionType,
  getCredits,
  getCreditsCount,
  getRemainingCredits,
} from '@/shared/models/credit';
import { getDailyCheckinStatus } from '@/shared/models/daily-checkin';
import { getReferralSummary } from '@/shared/models/referral';
import { ensureUserReferralCode, getUserInfo } from '@/shared/models/user';
import { Tab } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: number; pageSize?: number; type?: string }>;
}) {
  const { page: pageNum, pageSize, type } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 20;

  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  const t = await getTranslations('settings.credits');

  const total = await getCreditsCount({
    transactionType: type as CreditTransactionType,
    userId: user.id,
    status: CreditStatus.ACTIVE,
  });

  const credits = await getCredits({
    userId: user.id,
    status: CreditStatus.ACTIVE,
    transactionType: type as CreditTransactionType,
    page,
    limit,
  });

  const table: Table = {
    title: t('list.title'),
    columns: [
      {
        name: 'transactionNo',
        title: t('fields.transaction_no'),
        type: 'copy',
      },
      { name: 'description', title: t('fields.description') },
      {
        name: 'transactionType',
        title: t('fields.type'),
        type: 'label',
        metadata: { variant: 'outline' },
      },
      {
        name: 'transactionScene',
        title: t('fields.scene'),
        type: 'label',
        placeholder: '-',
        metadata: { variant: 'outline' },
      },
      {
        name: 'credits',
        title: t('fields.credits'),
        type: 'label',
        metadata: { variant: 'outline' },
      },
      {
        name: 'expiresAt',
        title: t('fields.expires_at'),
        type: 'time',
        placeholder: '-',
        metadata: { format: 'YYYY-MM-DD HH:mm:ss' },
      },
      {
        name: 'createdAt',
        title: t('fields.created_at'),
        type: 'time',
      },
    ],
    data: credits,
    pagination: {
      total,
      page,
      limit,
    },
  };

  const remainingCredits = await getRemainingCredits(user.id);
  const configs = await getAllConfigsUncached();
  const referralSummary = await getReferralSummary(user.id);
  const checkinStatus = await getDailyCheckinStatus(user.id);
  const referralCode = (await ensureUserReferralCode(user.id)) || '';
  const inviteUrl = `${envConfigs.app_url || ''}?ref=${encodeURIComponent(referralCode)}`;
  const signupCredits = parseInt(configs.initial_credits_amount || '100', 10);
  const checkinCredits = parseInt(configs.daily_checkin_credits || '10', 10);
  const referralCredits = parseInt(configs.referral_reward_credits || '50', 10);
  const referralSubscriptionBonusPercent = parseInt(
    configs.referral_subscription_bonus_percent || '20',
    10
  );
  const displaySignupCredits = Number.isFinite(signupCredits)
    ? signupCredits
    : 100;
  const displayReferralCredits = Number.isFinite(referralCredits)
    ? referralCredits
    : 50;
  const displayReferralSubscriptionBonusPercent = Number.isFinite(
    referralSubscriptionBonusPercent
  )
    ? referralSubscriptionBonusPercent
    : 20;
  const displayCheckinCredits = Number.isFinite(checkinCredits)
    ? checkinCredits
    : 10;

  const tabs: Tab[] = [
    {
      title: t('list.tabs.all'),
      name: 'all',
      url: '/settings/credits',
      is_active: !type || type === 'all',
    },
    {
      title: t('list.tabs.grant'),
      name: 'grant',
      url: '/settings/credits?type=grant',
      is_active: type === 'grant',
    },
    {
      title: t('list.tabs.consume'),
      name: 'consume',
      url: '/settings/credits?type=consume',
      is_active: type === 'consume',
    },
  ];

  return (
    <div className="space-y-8">
      <PanelCard
        title={t('view.title')}
        buttons={[
          {
            title: t('view.buttons.purchase'),
            url: '/pricing',
            target: '_blank',
            icon: 'Coins',
          },
        ]}
        className="max-w-md"
      >
        <div className="text-primary text-3xl font-bold">
          {remainingCredits}
        </div>
      </PanelCard>
      <div className="grid gap-4 md:grid-cols-3">
        <PanelCard
          title={t('rewards.signup.title')}
          description={t('rewards.signup.description', {
            credits: displaySignupCredits,
          })}
          label={t('rewards.signup.label')}
        >
          <div className="text-foreground text-2xl font-semibold">
            {displaySignupCredits}
          </div>
        </PanelCard>
        <PanelCard
          title={t('rewards.referral.title')}
          description={t('rewards.referral.description', {
            credits: displayReferralCredits,
            percent: displayReferralSubscriptionBonusPercent,
          })}
          label={t('rewards.referral.label', {
            credits: displayReferralCredits,
            percent: displayReferralSubscriptionBonusPercent,
          })}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">
                  {t('rewards.referral.invited')}
                </div>
                <div className="text-foreground text-xl font-semibold">
                  {referralSummary.invitedCount}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">
                  {t('rewards.referral.earned')}
                </div>
                <div className="text-foreground text-xl font-semibold">
                  {referralSummary.rewardCredits}
                </div>
              </div>
            </div>
          </div>
        </PanelCard>
        <PanelCard
          title={t('rewards.checkin.title')}
          description={t('rewards.checkin.description')}
          label={t('rewards.checkin.label')}
        >
          <div className="text-foreground text-2xl font-semibold">
            {displayCheckinCredits}
          </div>
        </PanelCard>
      </div>
      <PanelCard title={t('rewards.actions.title')}>
        <RewardsPanel
          inviteUrl={inviteUrl}
          checkedInToday={checkinStatus.checkedInToday}
          copy={{
            copyInvite: t('rewards.actions.copy_invite'),
            copied: t('rewards.actions.copied'),
            checkIn: t('rewards.actions.check_in'),
            checkedIn: t('rewards.actions.checked_in'),
            checkingIn: t('rewards.actions.checking_in'),
            checkInSuccess: t('rewards.actions.check_in_success'),
          }}
        />
      </PanelCard>
      <TableCard title={t('list.title')} tabs={tabs} table={table} />
    </div>
  );
}
