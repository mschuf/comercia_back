import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AUTH_COOKIE } from './auth.constants';
import type { TokenPayload } from './auth.service';

export interface RequestConUsuario extends Request {
  usuarioId: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const token = (request.cookies as Record<string, string> | undefined)?.[
      AUTH_COOKIE
    ];
    if (!token) {
      throw new UnauthorizedException('Sesión no iniciada');
    }
    try {
      const payload = this.jwt.verify<TokenPayload>(token);
      request.usuarioId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }
  }
}
