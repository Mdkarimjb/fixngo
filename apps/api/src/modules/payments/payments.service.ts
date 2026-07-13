import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Creates a Razorpay order for a job and persists the payment record. */
  async createOrder(jobId: string, amount: number) {
    const job = await this.prisma.job.findUniqueOrThrow({
      where: { id: jobId },
    });

    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');

    let providerOrderId: string | null = null;
    if (keyId && keySecret) {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      try {
        const res = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            amount,
            currency: 'INR',
            receipt: `job_${job.id}`,
          }),
        });
        if (res.ok) {
          const order = (await res.json()) as { id: string };
          providerOrderId = order.id;
        } else {
          this.logger.error(`Razorpay order failed: ${res.status}`);
        }
      } catch (err) {
        this.logger.error(`Razorpay request failed: ${(err as Error).message}`);
      }
    } else {
      this.logger.warn('Razorpay not configured; created local payment only');
    }

    return this.prisma.payment.upsert({
      where: { jobId: job.id },
      update: { amount, providerOrderId },
      create: {
        jobId: job.id,
        amount,
        providerOrderId,
        status: PaymentStatus.CREATED,
      },
    });
  }

  /**
   * Verifies the Razorpay webhook HMAC-SHA256 signature using the dedicated
   * webhook secret (NOT the API key secret). Constant-time comparison.
   */
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret || !signature) {
      return false;
    }
    const expected = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  }

  /** Applies a verified webhook event to the payment record. */
  async handleEvent(event: string, payload: unknown): Promise<void> {
    this.logger.log(`Razorpay event: ${event}`);
    const entity = this.extractPaymentEntity(payload);
    if (!entity?.order_id) {
      return;
    }

    const status =
      event === 'payment.captured'
        ? PaymentStatus.PAID
        : event === 'payment.failed'
          ? PaymentStatus.FAILED
          : undefined;
    if (!status) {
      return;
    }

    await this.prisma.payment.updateMany({
      where: { providerOrderId: entity.order_id },
      data: { status, providerPaymentId: entity.id ?? null },
    });
  }

  private extractPaymentEntity(
    payload: unknown,
  ): { id?: string; order_id?: string } | null {
    const p = payload as {
      payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
    };
    return p?.payload?.payment?.entity ?? null;
  }
}
