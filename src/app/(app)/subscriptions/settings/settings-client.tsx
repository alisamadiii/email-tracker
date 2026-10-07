'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ChannelType } from '@/lib/notifications/types';

import type {
  CategoryOption,
  CurrencyOption,
  EmailChoice,
  MemberOption,
  PaymentMethodOption,
  SettingsView,
} from '../types';
import { BudgetTab } from './tabs/budget-tab';
import { CategoriesTab } from './tabs/categories-tab';
import { CurrenciesTab } from './tabs/currencies-tab';
import { DisplayTab } from './tabs/display-tab';
import { HouseholdTab } from './tabs/household-tab';
import { NotificationsTab } from './tabs/notifications-tab';
import { PaymentMethodsTab } from './tabs/payment-methods-tab';

export type ChannelView = {
  type: ChannelType;
  enabled: boolean;
  config: Record<string, unknown>;
};

type Props = {
  settings: SettingsView;
  categories: CategoryOption[];
  currencies: CurrencyOption[];
  methods: PaymentMethodOption[];
  members: MemberOption[];
  emailChoices: EmailChoice[];
  channels: ChannelView[];
};

export function SettingsClient({
  settings,
  categories,
  currencies,
  methods,
  members,
  emailChoices,
  channels,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Subscription module configuration.
        </p>
      </div>

      <Tabs defaultValue="budget" className="space-y-6">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="household">Household</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment methods</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
        </TabsList>

        <TabsContent value="budget">
          <BudgetTab settings={settings} currencies={currencies} />
        </TabsContent>
        <TabsContent value="household">
          <HouseholdTab members={members} />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab settings={settings} channels={channels} />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab categories={categories} />
        </TabsContent>
        <TabsContent value="currencies">
          <CurrenciesTab currencies={currencies} settings={settings} />
        </TabsContent>
        <TabsContent value="payment-methods">
          <PaymentMethodsTab methods={methods} emailChoices={emailChoices} />
        </TabsContent>
        <TabsContent value="display">
          <DisplayTab settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
