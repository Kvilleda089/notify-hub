import { ConflictException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { handlePrismaError } from '../helpers/prisma-error.handler';

describe('handlePrismaError', () => {
  const prismaError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('prisma error', { code, clientVersion: 'test' });

  it('convierte P2002 (violación de unicidad) en ConflictException con el mensaje dado', () => {
    expect(() => handlePrismaError(prismaError('P2002'), 'ya existe')).toThrow(
      new ConflictException('ya existe'),
    );
  });

  it('relanza otros errores de Prisma sin modificarlos', () => {
    const error = prismaError('P2025');

    expect(() => handlePrismaError(error, 'x')).toThrow(error);
  });

  it('relanza errores genéricos sin modificarlos', () => {
    const error = new Error('boom');

    expect(() => handlePrismaError(error, 'x')).toThrow(error);
  });

  it('relanza valores que no son Error', () => {
    expect(() => handlePrismaError('texto', 'x')).toThrow('texto');
  });
});
