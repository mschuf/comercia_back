import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccesoPlataformaService } from '../plataforma/acceso-plataforma.service';

@Injectable()
export class CampoAccesoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plataforma: AccesoPlataformaService,
  ) {}

  gestionar(usuarioId: number, pagina: string) {
    return this.plataforma.exigirAccesoPagina(
      usuarioId,
      'gestion-campo',
      pagina,
    );
  }
  ejecutar(usuarioId: number) {
    return this.plataforma.exigirAccesoAlgunaPagina(usuarioId, 'mi-jornada', [
      'locales',
      'tareas',
    ]);
  }
  async local(empresaId: number, id: number) {
    const local = await this.prisma.localCampo.findFirst({
      where: { id, cliente: { empresaId } },
      select: { id: true, activo: true, cliente: { select: { activo: true } } },
    });
    if (!local) throw new NotFoundException('Local no disponible');
    return local;
  }
  async subordinado(empresaId: number, superiorId: number, usuarioId: number) {
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        id: usuarioId,
        empresaId,
        superiorId,
        isActive: true,
        esSuperadmin: false,
      },
      select: { id: true },
    });
    if (!usuario)
      throw new NotFoundException('Usuario no disponible en tu equipo');
    await this.ejecutar(usuario.id);
    return usuario;
  }
}
