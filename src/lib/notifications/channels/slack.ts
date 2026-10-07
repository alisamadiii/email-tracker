import { assertSafeOutboundUrl } from '../ssrf';
import {
  slackConfigSchema,
  type ChannelSender,
  type SendResult,
} from '../types';

export const slackSender: ChannelSender = {
  async send(config, payload): Promise<SendResult> {
    const parsed = slackConfigSchema.safeParse(config);
    if (!parsed.success) return { ok: false, error: 'Invalid Slack config' };

    try {
      const url = assertSafeOutboundUrl(parsed.data.webhookUrl);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: [`*${payload.title}*`, ...payload.lines].join('\n'),
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return { ok: false, error: `Slack responded ${res.status}` };
      return { ok: true };
    } catch (error) {
      return { ok: false, error: toMessage(error) };
    }
  },
};

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Send failed';
}
