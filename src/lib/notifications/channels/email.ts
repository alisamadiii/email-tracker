import nodemailer from 'nodemailer';

import {
  emailConfigSchema,
  type ChannelSender,
  type SendResult,
} from '../types';

export const emailSender: ChannelSender = {
  async send(config, payload): Promise<SendResult> {
    const parsed = emailConfigSchema.safeParse(config);
    if (!parsed.success) return { ok: false, error: 'Invalid email config' };
    const c = parsed.data;

    const to =
      payload.recipientEmail ||
      c.extraEmails.split(';').map((e) => e.trim()).filter(Boolean)[0];
    if (!to) return { ok: false, error: 'No recipient email' };

    const cc = c.extraEmails
      .split(';')
      .map((e) => e.trim())
      .filter((e) => e && e !== to);

    try {
      const transport = nodemailer.createTransport({
        host: c.host,
        port: c.port,
        secure: c.encryption === 'ssl',
        ignoreTLS: c.encryption === 'none',
        auth: c.username
          ? { user: c.username, pass: c.password }
          : undefined,
      });
      await transport.sendMail({
        from: c.fromEmail,
        to,
        cc: cc.length ? cc : undefined,
        subject: payload.title,
        text: payload.lines.join('\n'),
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: toMessage(error) };
    }
  },
};

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Send failed';
}
