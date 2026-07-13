import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { RedisService } from '../../redis/redis.service';

/**
 * India-native messaging integrations:
 *  - MSG91 for OTP + transactional SMS
 *  - WhatsApp Business (Meta Graph API) for status alerts
 *  - Firebase Cloud Messaging for push
 *
 * OTPs are generated here, stored hashed in Redis with a short TTL, and sent via
 * MSG91. Codes are never logged. Uses Node's global fetch (Node >= 18).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async sendOtp(phone: string): Promise<void> {
    const length = Number(this.config.get('OTP_LENGTH') ?? 6);
    const ttl = Number(this.config.get('OTP_TTL_SECONDS') ?? 300);
    const code = this.generateCode(length);

    await this.redis.setEx(this.otpKey(phone), this.hash(code), ttl);

    const authKey = this.config.get<string>('MSG91_AUTH_KEY');
    const templateId = this.config.get<string>('MSG91_OTP_TEMPLATE_ID');
    if (!authKey || !templateId) {
      this.logger.warn(
        `MSG91 not configured; OTP for ${this.mask(phone)} stored but not sent`,
      );
      return;
    }

    // MSG91 OTP API.
    await this.postJson(
      'https://control.msg91.com/api/v5/otp',
      {
        template_id: templateId,
        mobile: this.digits(phone),
        otp: code,
      },
      { authkey: authKey },
    );
    this.logger.log(`OTP sent to ${this.mask(phone)}`);
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    if (this.config.get('OTP_DEV_BYPASS') === 'true') {
      return true;
    }
    const stored = await this.redis.get(this.otpKey(phone));
    if (!stored) {
      return false;
    }
    const ok = this.safeEqual(stored, this.hash(code));
    if (ok) {
      await this.redis.del(this.otpKey(phone));
    }
    return ok;
  }

  async sendSms(phone: string, message: string): Promise<void> {
    const authKey = this.config.get<string>('MSG91_AUTH_KEY');
    const sender = this.config.get<string>('MSG91_SENDER_ID');
    if (!authKey || !sender) {
      this.logger.warn(`MSG91 not configured; SMS to ${this.mask(phone)} skipped`);
      return;
    }
    await this.postJson(
      'https://control.msg91.com/api/v5/flow',
      { sender, mobiles: this.digits(phone), message },
      { authkey: authKey },
    );
  }

  async sendWhatsApp(phone: string, text: string): Promise<void> {
    const token = this.config.get<string>('WHATSAPP_TOKEN');
    const phoneId = this.config.get<string>('WHATSAPP_PHONE_ID');
    if (!token || !phoneId) {
      this.logger.warn(
        `WhatsApp not configured; message to ${this.mask(phone)} skipped`,
      );
      return;
    }
    await this.postJson(
      `https://graph.facebook.com/v20.0/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: this.digits(phone),
        type: 'text',
        text: { body: text },
      },
      { Authorization: `Bearer ${token}` },
    );
  }

  async sendPush(userId: string, title: string, body: string): Promise<void> {
    const serverKey = this.config.get<string>('FCM_SERVER_KEY');
    if (!serverKey) {
      this.logger.warn(`FCM not configured; push to ${userId} skipped`);
      return;
    }
    // A real implementation resolves the user's device token(s) first.
    await this.postJson(
      'https://fcm.googleapis.com/fcm/send',
      { to: `/topics/user_${userId}`, notification: { title, body } },
      { Authorization: `key=${serverKey}` },
    );
  }

  private async postJson(
    url: string,
    body: unknown,
    headers: Record<string, string>,
  ): Promise<void> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        this.logger.error(`Upstream ${url} responded ${res.status}`);
      }
    } catch (err) {
      this.logger.error(`Request to ${url} failed: ${(err as Error).message}`);
    }
  }

  private otpKey(phone: string): string {
    return `otp:${this.digits(phone)}`;
  }

  private generateCode(length: number): string {
    const max = 10 ** length;
    return String(randomInt(0, max)).padStart(length, '0');
  }

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  }

  private digits(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private mask(phone: string): string {
    return phone.replace(/.(?=.{2})/g, '*');
  }
}
