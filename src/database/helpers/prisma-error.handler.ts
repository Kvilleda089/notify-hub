import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';


export function handlePrismaError(error: unknown, messageError: string): never {
    if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
    ) {
        throw new ConflictException(messageError);
    }

    throw error;
}