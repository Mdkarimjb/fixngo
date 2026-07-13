import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Validates the Bearer access token via the 'jwt' passport strategy. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
