jest.mock('src/config', () => ({ env: { api_key_pepper: 'pepper' } }));

import { UnauthorizedException } from '@nestjs/common';
import { ProjectStatus } from 'src/generated/prisma/enums';
import { ApiKeyGuard } from '../application/guards/api-key.guard';

describe('ApiKeyGuard', () => {
  let prisma: any;
  let generator: any;
  let guard: ApiKeyGuard;

  const VALID_KEY = 'ntf_live_abc123_secret';

  const makeContext = (authorization?: string) => {
    const request: any = { headers: authorization === undefined ? {} : { authorization } };
    const context: any = { switchToHttp: () => ({ getRequest: () => request }) };
    return { request, context };
  };

  const storedKey = (overrides: any = {}) => ({
    id: 'k1',
    revokedAt: null,
    expiresAt: null,
    project: { id: 'p1', status: ProjectStatus.ACTIVE },
    ...overrides,
  });

  beforeEach(() => {
    prisma = { apiKey: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) } };
    generator = { hash: jest.fn().mockReturnValue('hashed-key') };
    guard = new ApiKeyGuard(prisma, generator);
  });

  describe('extracción del header', () => {
    it.each([
      ['sin header Authorization', undefined],
      ['sin esquema Bearer', 'ntf_live_abc123_secret'],
      ['esquema distinto de Bearer', 'Basic ntf_live_abc123_secret'],
      ['Bearer sin espacio ni llave', 'Bearer'],
    ])('lanza "Missing API key." %s', async (_caso, header) => {
      const { context } = makeContext(header);

      await expect(guard.canActivate(context)).rejects.toThrow('Missing API key.');
      expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
    });

    it('lanza "Invalid API key." si la llave no empieza con ntf_live_', async () => {
      const { context } = makeContext('Bearer sk_test_123');

      await expect(guard.canActivate(context)).rejects.toThrow('Invalid API key.');
      expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
    });

    it('ignora espacios alrededor de la llave', async () => {
      prisma.apiKey.findUnique.mockResolvedValue(storedKey());
      const { context } = makeContext(`Bearer   ${VALID_KEY}  `);

      await guard.canActivate(context);

      expect(generator.hash).toHaveBeenCalledWith(VALID_KEY);
    });
  });

  describe('validación de la llave', () => {
    it('busca por el hash, nunca por la llave en claro', async () => {
      prisma.apiKey.findUnique.mockResolvedValue(storedKey());
      const { context } = makeContext(`Bearer ${VALID_KEY}`);

      await guard.canActivate(context);

      expect(prisma.apiKey.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { keyHash: 'hashed-key' } }),
      );
    });

    it.each([
      ['no existe', null],
      ['está revocada', storedKey({ revokedAt: new Date() })],
      ['expiró', storedKey({ expiresAt: new Date(Date.now() - 1000) })],
      [
        'su proyecto está inactivo',
        storedKey({ project: { id: 'p1', status: ProjectStatus.INACTIVE } }),
      ],
    ])('rechaza con 401 si la llave %s', async (_caso, found) => {
      prisma.apiKey.findUnique.mockResolvedValue(found);
      const { request, context } = makeContext(`Bearer ${VALID_KEY}`);

      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.apiKey.update).not.toHaveBeenCalled();
      expect(request.auth).toBeUndefined();
    });

    it('acepta una llave que todavía no expira', async () => {
      prisma.apiKey.findUnique.mockResolvedValue(
        storedKey({ expiresAt: new Date(Date.now() + 60_000) }),
      );
      const { context } = makeContext(`Bearer ${VALID_KEY}`);

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });

  it('con una llave válida actualiza lastUsedAt y adjunta el contexto al request', async () => {
    prisma.apiKey.findUnique.mockResolvedValue(storedKey());
    const { request, context } = makeContext(`Bearer ${VALID_KEY}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: 'k1' },
      data: { lastUsedAt: expect.any(Date) },
    });
    expect(request.auth).toEqual({ projectId: 'p1', apiKeyId: 'k1' });
  });
});
