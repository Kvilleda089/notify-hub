import { ConflictException, Logger } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { CreateProjectCommand } from '../commands/impl/create-project.command';
import { CreateProjectHandler } from '../commands/handler/create-project.handler';

describe('CreateProjectHandler', () => {
  let prisma: any;
  let handler: CreateProjectHandler;

  const run = () => handler.execute(new CreateProjectCommand('Mi proyecto', 'mi-proyecto'));

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    prisma = { project: { create: jest.fn() } };
    handler = new CreateProjectHandler(prisma);
  });

  afterEach(() => jest.restoreAllMocks());

  it('crea el proyecto con nombre y slug', async () => {
    const project = { id: 'p1', name: 'Mi proyecto', slug: 'mi-proyecto' };
    prisma.project.create.mockResolvedValue(project);

    await expect(run()).resolves.toBe(project);
    expect(prisma.project.create).toHaveBeenCalledWith({
      data: { name: 'Mi proyecto', slug: 'mi-proyecto' },
    });
  });

  it('lanza 409 con el slug en el mensaje si ya existe (P2002)', async () => {
    prisma.project.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
    );

    const promise = run();
    await expect(promise).rejects.toBeInstanceOf(ConflictException);
    await expect(promise).rejects.toThrow(/mi-proyecto/);
  });

  it('propaga cualquier otro error', async () => {
    prisma.project.create.mockRejectedValue(new Error('db down'));

    await expect(run()).rejects.toThrow('db down');
  });
});
