import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CreateApiKeyCommand } from "../commands/create-api-key.command";
import { PrismaService } from "src/database/prisma.service";
import { ApiKeyGeneratorService } from "../../infrastructure/security/api-key-generator.service";
import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { ProjectSatus } from "@prisma/client";


@CommandHandler(CreateApiKeyCommand)
export class CreateApiKeyHandler implements ICommandHandler<CreateApiKeyCommand> {
    private readonly logger = new Logger('CreateApiKeyHandler')
    constructor(
        private readonly prisma: PrismaService,
        private readonly apiKeyGenerator: ApiKeyGeneratorService,
    
    ){}

    async execute(command: CreateApiKeyCommand) {
        const {projectId, name } = command;

        const project = await this.prisma.project.findUnique({
            where: {id: projectId },
            select: {
                id: true,
                status: true,
            }
        });

        if(!project){
            this.logger.log("Project Not found")
            throw new NotFoundException(`Project not found. `)
        }

        if( project.status !== ProjectSatus.ACTIVE){
            this.logger.log("Project is inactive")
            throw new BadRequestException('Project i inactive.')
        };

        const generatedKey = this.apiKeyGenerator.generate();
        const apikey = await this.prisma.apiKey.create({
            data: {
                projectId,
                name,
                prefix: generatedKey.prefix,
                keyHas: this.apiKeyGenerator.hash(generatedKey.rawKey),
            }, 
            select: {
                id: true,
                name: true,
                prefix: true, 
                createdAt: true,
            },
        });

        this.logger.log("Create succes Apikey.")
        return {
            ...apikey,
            apikey: generatedKey.rawKey,
        }
    }

}