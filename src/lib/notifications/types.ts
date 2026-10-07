import { z } from 'zod';

export const CHANNEL_TYPES = [
  'email',
  'discord',
  'slack',
  'telegram',
  'webhook',
] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];

export type SubDue = {
  name: string;
  price: string;
  currencyCode: string;
  daysUntil: number;
  nextPayment: string;
  category: string | null;
  payer: string | null;
  url: string | null;
  notes: string | null;
};

export type NotificationPayload = {
  title: string;
  lines: string[];
  recipientEmail?: string;
  subs: SubDue[];
};

export type SendResult = { ok: boolean; error?: string };

export interface ChannelSender {
  send(config: unknown, payload: NotificationPayload): Promise<SendResult>;
}

export const emailConfigSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535).default(587),
  username: z.string().default(''),
  password: z.string().default(''),
  fromEmail: z.string().email(),
  encryption: z.enum(['tls', 'ssl', 'none']).default('tls'),
  extraEmails: z.string().default(''),
});

export const discordConfigSchema = z.object({
  webhookUrl: z.string().url(),
  botUsername: z.string().default(''),
  botAvatarUrl: z.string().default(''),
});

export const slackConfigSchema = z.object({
  webhookUrl: z.string().url(),
});

export const telegramConfigSchema = z.object({
  botToken: z.string().min(1),
  chatId: z.string().min(1),
});

export const webhookConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['POST', 'PUT', 'PATCH']).default('POST'),
  headers: z.string().default('{}'),
  payloadTemplate: z.string().min(1),
});

export const channelConfigSchemas: Record<ChannelType, z.ZodTypeAny> = {
  email: emailConfigSchema,
  discord: discordConfigSchema,
  slack: slackConfigSchema,
  telegram: telegramConfigSchema,
  webhook: webhookConfigSchema,
};

export type EmailConfig = z.infer<typeof emailConfigSchema>;
export type DiscordConfig = z.infer<typeof discordConfigSchema>;
export type SlackConfig = z.infer<typeof slackConfigSchema>;
export type TelegramConfig = z.infer<typeof telegramConfigSchema>;
export type WebhookConfig = z.infer<typeof webhookConfigSchema>;
