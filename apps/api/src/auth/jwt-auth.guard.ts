import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { AUTH_COOKIE, TOKEN_DURACION_MS } from './auth.constants';
import type { TokenPayload } from './interfaces/token-payload.interface';
import type { RequestConUsuario } from './interfaces/request-con-usuario.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const token = (request.cookies as Record<string, string> | undefined)?.[
      AUTH_COOKIE
    ];
    if (!token) {
      throw new UnauthorizedException('Sesión no iniciada');
    }
    let payload: TokenPayload;
    try {
      payload = this.jwt.verify<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { isActive: true },
    });
    if (!usuario?.isActive) {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }
    request.usuarioId = payload.sub;
    // Renovación deslizante: el JWT y la cookie vuelven a durar 30 días en
    // cada uso autenticado. Evita cierres de sesión por tiempo sin crear un
    // token imposible de revocar o auditar.
    const response = context.switchToHttp().getResponse<Response>();
    response?.cookie(AUTH_COOKIE, this.jwt.sign({ sub: payload.sub }), {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: TOKEN_DURACION_MS,
      path: '/',
    });
    return true;
  }
}
