import {
  telegramConfigSchema,
  type ChannelSender,
  type SendResult,
} from '../types';

export const telegramSender: ChannelSender = {
  async send(config, payload): Promise<SendResult> {
    const parsed = telegramConfigSchema.safeParse(config);
    if (!parsed.success) return { ok: false, error: 'Invalid Telegram config' };
    const c = parsed.data;

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${c.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: c.chatId,
            text: [payload.title, ...payload.lines].join('\n'),
          }),
          signal: AbortSignal.timeout(15_000),
        }
      );
      if (!res.ok) {
        return { ok: false, error: `Telegram responded ${res.status}` };
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
