import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestConUsuario } from './interfaces/request-con-usuario.interface';

// Autoriza solo a usuarios con es_superadmin = true. Se usa SIEMPRE después de
// JwtAuthGuard (que setea request.usuarioId). Consulta la BD en cada request:
// si a alguien se le revoca el superadmin, deja de tener acceso al instante.
@Injectable()
export class SuperadminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    if (!request.usuarioId) {
      throw new UnauthorizedException();
    }
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: request.usuarioId },
      select: { esSuperadmin: true, isActive: true },
    });
    if (!usuario || !usuario.isActive || !usuario.esSuperadmin) {
      throw new ForbiddenException('Requiere permisos de superadministrador');
    }
    return true;
  }
}
