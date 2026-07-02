import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      name: 'comercia-api',
      status: 'ok',
      version: '1.0.0',
    };
  }
}
