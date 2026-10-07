import { assertSafeOutboundUrl } from '../ssrf';
import {
  discordConfigSchema,
  type ChannelSender,
  type SendResult,
} from '../types';

export const discordSender: ChannelSender = {
  async send(config, payload): Promise<SendResult> {
    const parsed = discordConfigSchema.safeParse(config);
    if (!parsed.success) return { ok: false, error: 'Invalid Discord config' };
    const c = parsed.data;

    try {
      const url = assertSafeOutboundUrl(c.webhookUrl);
      const body: Record<string, string> = {
        content: [payload.title, ...payload.lines].join('\n'),
      };
      if (c.botUsername) body.username = c.botUsername;
      if (c.botAvatarUrl) body.avatar_url = c.botAvatarUrl;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return { ok: false, error: `Discord responded ${res.status}` };
      return { ok: true };
    } catch (error) {
      return { ok: false, error: toMessage(error) };
    }
  },
};

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Send failed';
}
