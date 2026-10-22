import { ConflictException, Logger } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { RevokeApiKeyHandler } from '../application/commands/handler/revoke-api-key.handler';
import { RevokeApiKeyCommand } from '../application/commands/impl/revoke-api-key.command';

describe('RevokeApiKeyHandler', () => {
  let prisma: any;
  let handler: RevokeApiKeyHandler;

  const run = () => handler.execute(new RevokeApiKeyCommand('k1'));

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    prisma = { apiKey: { update: jest.fn() } };
    handler = new RevokeApiKeyHandler(prisma);
  });

  afterEach(() => jest.restoreAllMocks());

  it('marca la llave como revocada con la fecha actual', async () => {
    const revoked = { id: 'k1', revokedAt: new Date() };
    prisma.apiKey.update.mockResolvedValue(revoked);

    await expect(run()).resolves.toBe(revoked);
    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: 'k1' },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('propaga errores desconocidos', async () => {
    prisma.apiKey.update.mockRejectedValue(new Error('db down'));

    await expect(run()).rejects.toThrow('db down');
  });

  it('convierte un P2002 de Prisma en 409', async () => {
    prisma.apiKey.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
    );

    await expect(run()).rejects.toBeInstanceOf(ConflictException);
  });
});
