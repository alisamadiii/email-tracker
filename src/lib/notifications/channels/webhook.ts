import { assertSafeOutboundUrl } from '../ssrf';
import { renderTemplate } from '../template';
import {
  webhookConfigSchema,
  type ChannelSender,
  type SendResult,
} from '../types';

// Generic webhook: one request per due subscription, with a user-defined
// payload template ({{subscription_name}}, {{days_until}}, ...).
export const webhookSender: ChannelSender = {
  async send(config, payload): Promise<SendResult> {
    const parsed = webhookConfigSchema.safeParse(config);
    if (!parsed.success) return { ok: false, error: 'Invalid webhook config' };
    const c = parsed.data;

    let headers: Record<string, string>;
    try {
      headers = { 'Content-Type': 'application/json', ...JSON.parse(c.headers) };
    } catch {
      return { ok: false, error: 'Headers must be valid JSON' };
    }

    try {
      const url = assertSafeOutboundUrl(c.url);
      for (const sub of payload.subs) {
        const res = await fetch(url, {
          method: c.method,
          headers,
          body: renderTemplate(c.payloadTemplate, sub),
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) {
          return { ok: false, error: `Webhook responded ${res.status}` };
        }
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: toMessage(error) };
    }
  },
};

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Send failed';
}
