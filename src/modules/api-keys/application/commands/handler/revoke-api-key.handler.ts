import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { RevokeApiKeyCommand } from "../impl/revoke-api-key.command";
import { Logger } from "@nestjs/common";
import { PrismaService } from "src/database/prisma.service";
import { handlePrismaError } from "src/database/helpers/prisma-error.handler";


@CommandHandler(RevokeApiKeyCommand)
export class RevokeApiKeyHandler implements ICommandHandler<RevokeApiKeyCommand> {

    private readonly logger = new Logger(`${RevokeApiKeyHandler.name}`);

    constructor(
        private readonly prismaServive: PrismaService,
    ) { }


    async execute(command: RevokeApiKeyCommand): Promise<any> {
        try {

            const { apiKeyId } = command;
            const result = await this.prismaServive.apiKey.update({
                where: {
                    id: apiKeyId,
                },
                data: {
                    revokedAt: new Date()
                }
            });

            this.logger.log(`Revoke update ApiKey ${apiKeyId}`);

            return result;

        } catch (error) {
            this.logger.error(`Error revoking apiKey: ${error} `)
            handlePrismaError(
                error,
                `Error revoking apiKey: ${error} `
            );
        }

    }

}