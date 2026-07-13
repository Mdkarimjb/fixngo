import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { PaymentsService } from './payments.service';
import { CreateOrderDto } from './dto/payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @Post('order')
  createOrder(@Body() dto: CreateOrderDto) {
    return this.payments.createOrder(dto.jobId, dto.amount);
  }

  /**
   * Razorpay webhook. Public endpoint — authenticity is enforced by verifying
   * the HMAC signature over the RAW request body. Requires the raw body to be
   * available (see main.ts rawBody handling for production).
   */
  @Post('webhook/razorpay')
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: { event: string },
  ) {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(body));
    if (!this.payments.verifyWebhookSignature(raw, signature)) {
      throw new BadRequestException('Invalid signature');
    }
    await this.payments.handleEvent(body.event, body);
    return { received: true };
  }
}
