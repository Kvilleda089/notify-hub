import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { CreateApiKeyDto } from "../dto";
import { CreateApiKeyCommand } from "../commands/impl/create-api-key.command";
import { AdminTokenGuard } from "src/common";
import { RevokeApiKeyCommand } from "../commands/impl/revoke-api-key.command";

@Controller('admin/projects/:projectId/api-keys')
@UseGuards(AdminTokenGuard)
export class ApiKeysController {
    constructor(
        private readonly commandBus: CommandBus,

    ) { }

    @Post()
    create(
        @Param('projectId', ParseUUIDPipe) projectId: string,
        @Body() data: CreateApiKeyDto,
    ) {
        return this.commandBus.execute(
            new CreateApiKeyCommand(projectId, data.name)
        )
    };

    @Post(':apiKeyId/revoke')
    revoke(@Param('apiKeyId', ParseUUIDPipe) apiKeyId: string) {
        return this.commandBus.execute(
            new RevokeApiKeyCommand(apiKeyId)
        )
    }
}