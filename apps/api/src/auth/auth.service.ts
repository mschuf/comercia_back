import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  getCountries,
  parsePhoneNumberFromString,
} from 'libphonenumber-js/max';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { hashPassword, verifyPassword } from './password.util';
import { esRucParaguayoValido } from './ruc.util';

export interface UsuarioSesion {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  nombreLogin: string;
  ruc: string;
  celular: string;
  empresa: { id: number; nombre: string };
  rol: { id: number; descripcion: string } | null;
}

export interface TokenPayload {
  sub: number;
}

const TIPOS_CELULAR_VALIDOS = new Set(['MOBILE', 'FIXED_LINE_OR_MOBILE']);

const MENSAJES_DUPLICADO: Record<string, string> = {
  correo: 'Ya existe un usuario registrado con ese correo',
  nombre_login: 'Ese nombre de usuario ya está en uso',
  ruc: 'Ya existe un usuario registrado con ese RUC',
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ usuario: UsuarioSesion; token: string }> {
    const celularE164 = this.validarCelular(dto.celular, dto.celularPais);
    const ruc = this.validarRuc(dto.ruc, dto.celularPais);

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: dto.empresaId },
      select: { id: true },
    });
    if (!empresa) {
      throw new BadRequestException('La empresa seleccionada no existe');
    }

    // Chequeos amables (la garantía real son los índices únicos + catch P2002)
    const duplicado = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ correo: dto.correo }, { nombreLogin: dto.nombreLogin }, { ruc }],
      },
      select: { correo: true, nombreLogin: true, ruc: true },
    });
    if (duplicado) {
      if (duplicado.correo === dto.correo) {
        throw new ConflictException(MENSAJES_DUPLICADO.correo);
      }
      if (duplicado.nombreLogin === dto.nombreLogin) {
        throw new ConflictException(MENSAJES_DUPLICADO.nombre_login);
      }
      throw new ConflictException(MENSAJES_DUPLICADO.ruc);
    }

    const passwordHash = await hashPassword(dto.password);
    const usuario = await this.prisma.usuario
      .create({
        data: {
          nombre: dto.nombre,
          apellido: dto.apellido,
          correo: dto.correo,
          nombreLogin: dto.nombreLogin,
          empresaId: dto.empresaId,
          ruc,
          celular: celularE164,
          passwordHash,
        },
        include: { empresa: true, rol: true },
      })
      .catch((e: unknown) => {
        // Carrera entre el chequeo y el insert: el índice único manda (409, no 500)
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          const campos = (e.meta?.target as string[] | undefined) ?? [];
          const mensaje = campos
            .map((c) => MENSAJES_DUPLICADO[c])
            .find((m) => m !== undefined);
          throw new ConflictException(
            mensaje ?? 'Ya existe un usuario con esos datos',
          );
        }
        throw e;
      });

    return {
      usuario: this.aSesion(usuario),
      token: this.firmarToken(usuario.id),
    };
  }

  async login(
    dto: LoginDto,
  ): Promise<{ usuario: UsuarioSesion; token: string }> {
    // El identificador llega en minúsculas (DTO); correo y nombreLogin se
    // guardan en minúsculas en el register: misma normalización en ambos lados.
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ correo: dto.identificador }, { nombreLogin: dto.identificador }],
      },
      include: { empresa: true, rol: true },
    });

    // Mismo mensaje exista o no el usuario: no revelar quiénes están registrados
    const credencialesInvalidas = new UnauthorizedException(
      'Usuario o contraseña incorrectos',
    );
    if (!usuario || !usuario.isActive) {
      throw credencialesInvalidas;
    }
    const passwordOk = await verifyPassword(dto.password, usuario.passwordHash);
    if (!passwordOk) {
      throw credencialesInvalidas;
    }

    return {
      usuario: this.aSesion(usuario),
      token: this.firmarToken(usuario.id),
    };
  }

  async me(usuarioId: number): Promise<UsuarioSesion> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { empresa: true, rol: true },
    });
    if (!usuario || !usuario.isActive) {
      throw new UnauthorizedException();
    }
    return this.aSesion(usuario);
  }

  private validarCelular(celular: string, pais: string): string {
    if (!(getCountries() as string[]).includes(pais)) {
      throw new BadRequestException('El país del celular no es válido');
    }
    const parsed = parsePhoneNumberFromString(celular, pais as never);
    if (!parsed || !parsed.isValid() || parsed.country !== pais) {
      throw new BadRequestException(
        'El celular no es válido para el país seleccionado',
      );
    }
    const tipo = parsed.getType();
    if (tipo !== undefined && !TIPOS_CELULAR_VALIDOS.has(tipo)) {
      throw new BadRequestException('El número ingresado no es un celular');
    }
    return parsed.number; // formato E.164, ej: +595971234567
  }

  private validarRuc(ruc: string, pais: string): string {
    const normalizado = ruc.trim().toUpperCase();
    if (pais === 'PY' && !esRucParaguayoValido(normalizado)) {
      throw new BadRequestException(
        'El RUC no es válido: revisá el número y su dígito verificador (formato 1234567-0)',
      );
    }
    return normalizado;
  }

  private firmarToken(usuarioId: number): string {
    const payload: TokenPayload = { sub: usuarioId };
    return this.jwt.sign(payload);
  }

  private aSesion(usuario: {
    id: number;
    nombre: string;
    apellido: string;
    correo: string;
    nombreLogin: string;
    ruc: string;
    celular: string;
    empresa: { id: number; nombre: string };
    rol: { id: number; descripcion: string } | null;
  }): UsuarioSesion {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      nombreLogin: usuario.nombreLogin,
      ruc: usuario.ruc,
      celular: usuario.celular,
      empresa: { id: usuario.empresa.id, nombre: usuario.empresa.nombre },
      rol: usuario.rol
        ? { id: usuario.rol.id, descripcion: usuario.rol.descripcion }
        : null,
    };
  }
}
