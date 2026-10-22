jest.mock('src/config', () => ({ env: { api_key_pepper: 'pepper' } }));

import { createHmac } from 'crypto';
import { env } from 'src/config';
import { ApiKeyGeneratorService } from '../infrastructure/security/api-key-generator.service';


describe('ApiKeyGeneratorService', () => {
  let service: ApiKeyGeneratorService;

  beforeEach(() => {
    (env as any).api_key_pepper = 'pepper';
    service = new ApiKeyGeneratorService();
  });

  describe('generate', () => {
    it('genera una llave con el formato ntf_live_<id>_<secreto>', () => {
      const { rawKey } = service.generate();

      // 6 bytes en hex = 12 caracteres; 32 bytes en base64url = 43 caracteres
      expect(rawKey).toMatch(/^ntf_live_[0-9a-f]{12}_[A-Za-z0-9_-]{43}$/);
    });

    it('el prefijo es la parte pública de la llave (sin el secreto)', () => {
      const { rawKey, prefix } = service.generate();

      expect(prefix).toMatch(/^ntf_live_[0-9a-f]{12}$/);
      expect(rawKey.startsWith(`${prefix}_`)).toBe(true);
    });

    it('cada llamada produce una llave distinta', () => {
      expect(service.generate().rawKey).not.toBe(service.generate().rawKey);
    });
  });

  describe('hash', () => {
    it('es un HMAC-SHA256 en hex con el pepper configurado', () => {
      const expected = createHmac('sha256', 'pepper').update('ntf_live_x_y').digest('hex');

      expect(service.hash('ntf_live_x_y')).toBe(expected);
      expect(service.hash('ntf_live_x_y')).toMatch(/^[0-9a-f]{64}$/);
    });

    it('es determinista para la misma llave', () => {
      expect(service.hash('abc')).toBe(service.hash('abc'));
    });

    it('cambia si cambia la llave', () => {
      expect(service.hash('abc')).not.toBe(service.hash('abd'));
    });

    it('cambia si cambia el pepper', () => {
      const before = service.hash('abc');
      (env as any).api_key_pepper = 'otro-pepper';

      expect(service.hash('abc')).not.toBe(before);
    });
  });
});
