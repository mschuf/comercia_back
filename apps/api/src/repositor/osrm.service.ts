import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CoordenadaRuta,
  MatrizRuta,
  OsrmRouteResponse,
  OsrmTableResponse,
  ResultadoGeometriaRuta,
} from './interfaces/osrm.interface';

@Injectable()
export class OsrmService {
  constructor(private readonly config: ConfigService) {}

  private configuracion(): { baseUrl: string; timeoutMs: number } {
    return {
      baseUrl: this.config
        .getOrThrow<string>('routing.osrmBaseUrl')
        .replace(/\/$/, ''),
      timeoutMs: this.config.getOrThrow<number>('routing.osrmTimeoutMs'),
    };
  }

  private coordenadas(coordenadas: CoordenadaRuta[]): string {
    return coordenadas
      .map(({ latitud, longitud }) => `${longitud},${latitud}`)
      .join(';');
  }

  async tabla(coordenadas: CoordenadaRuta[]): Promise<MatrizRuta> {
    const { baseUrl, timeoutMs } = this.configuracion();
    const url = `${baseUrl}/table/v1/driving/${this.coordenadas(coordenadas)}?annotations=duration,distance`;
    const respuesta = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: 'application/json' },
    });
    if (!respuesta.ok) throw new Error('OSRM table no disponible');
    const cuerpo = (await respuesta.json()) as OsrmTableResponse;
    if (
      cuerpo.code !== 'Ok' ||
      cuerpo.distances === undefined ||
      cuerpo.durations === undefined
    ) {
      throw new Error('OSRM table devolvio una respuesta invalida');
    }
    return {
      distancias: cuerpo.distances.map((fila) =>
        fila.map((valor) => valor ?? Number.NaN),
      ),
      duraciones: cuerpo.durations.map((fila) =>
        fila.map((valor) => valor ?? Number.NaN),
      ),
    };
  }

  async ruta(coordenadas: CoordenadaRuta[]): Promise<ResultadoGeometriaRuta> {
    if (coordenadas.length < 2) {
      return {
        distanciaMetros: 0,
        duracionSegundos: 0,
        geometria: coordenadas.map(({ latitud, longitud }) => [
          latitud,
          longitud,
        ]),
      };
    }
    const { baseUrl, timeoutMs } = this.configuracion();
    const url = `${baseUrl}/route/v1/driving/${this.coordenadas(coordenadas)}?overview=full&geometries=geojson&steps=false`;
    const respuesta = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: 'application/json' },
    });
    if (!respuesta.ok) throw new Error('OSRM route no disponible');
    const cuerpo = (await respuesta.json()) as OsrmRouteResponse;
    const ruta = cuerpo.routes?.[0];
    if (cuerpo.code !== 'Ok' || ruta === undefined) {
      throw new Error('OSRM route devolvio una respuesta invalida');
    }
    return {
      distanciaMetros: ruta.distance,
      duracionSegundos: ruta.duration,
      geometria: ruta.geometry.coordinates.map(([longitud, latitud]) => [
        latitud,
        longitud,
      ]),
    };
  }
}
