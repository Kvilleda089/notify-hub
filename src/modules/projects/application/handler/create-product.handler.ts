import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CreateProjectCommand } from "../commands/create-project.command";
import { PrismaService } from "src/database/prisma.service";
import { Logger } from "@nestjs/common";
import { handlePrismaError } from 'src/database/helpers/prisma-error.handler';

@CommandHandler(CreateProjectCommand)
export class CreateProjectHandler implements ICommandHandler<CreateProjectCommand> {
    private readonly logger = new Logger('CreateProjectHandler')
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async execute(command: CreateProjectCommand) {
        this.logger.log(`Created Project  ${JSON.stringify(command)}`)
        const { name, slug } = command;
        try {
            
           const project =  await this.prisma.project.create({
                data: {
                    name,
                    slug
                },
            });

            this.logger.log(`Created project  Success. `)
            return project;

        } catch (error) {
            this.logger.error(`Error to created project error: ${error}`)
            handlePrismaError(
                error, 
                `A project with the slug ${slug} already exists. `
            );
        }
    }
}