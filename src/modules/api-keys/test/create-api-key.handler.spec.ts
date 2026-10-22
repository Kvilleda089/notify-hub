jest.mock('src/config', () => ({ env: { api_key_pepper: 'pepper' } }));

import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { ProjectStatus } from 'src/generated/prisma/enums';
import { CreateApiKeyHandler } from '../application/commands/handler/create-api-key.handler';
import { CreateApiKeyCommand } from '../application/commands/impl/create-api-key.command';


describe('CreateApiKeyHandler', () => {
  let prisma: any;
  let generator: any;
  let handler: CreateApiKeyHandler;

  const run = () => handler.execute(new CreateApiKeyCommand('p1', 'Mi llave'));

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    prisma = {
      project: { findUnique: jest.fn() },
      apiKey: { create: jest.fn() },
    };
    generator = {
      generate: jest.fn().mockReturnValue({
        rawKey: 'ntf_live_abc123_secret',
        prefix: 'ntf_live_abc123',
      }),
      hash: jest.fn().mockReturnValue('hashed-key'),
    };
    handler = new CreateApiKeyHandler(prisma, generator);
  });

  afterEach(() => jest.restoreAllMocks());

  it('lanza 404 si el proyecto no existe', async () => {
    prisma.project.findUnique.mockResolvedValue(null);

    await expect(run()).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.apiKey.create).not.toHaveBeenCalled();
  });

  it('lanza 400 si el proyecto está inactivo', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'p1', status: ProjectStatus.INACTIVE });

    await expect(run()).rejects.toBeInstanceOf(BadRequestException);
    expect(generator.generate).not.toHaveBeenCalled();
    expect(prisma.apiKey.create).not.toHaveBeenCalled();
  });

  it('guarda solo el hash y devuelve la llave en claro una única vez', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'p1', status: ProjectStatus.ACTIVE });
    const saved = { id: 'k1', name: 'Mi llave', prefix: 'ntf_live_abc123', createdAt: new Date() };
    prisma.apiKey.create.mockResolvedValue(saved);

    const result = await run();

    expect(generator.hash).toHaveBeenCalledWith('ntf_live_abc123_secret');
    expect(prisma.apiKey.create).toHaveBeenCalledWith({
      data: {
        projectId: 'p1',
        name: 'Mi llave',
        prefix: 'ntf_live_abc123',
        keyHash: 'hashed-key',
      },
      select: { id: true, name: true, prefix: true, createdAt: true },
    });
    expect(result).toEqual({ ...saved, apikey: 'ntf_live_abc123_secret' });
    expect(result).not.toHaveProperty('keyHash');
  });
});
