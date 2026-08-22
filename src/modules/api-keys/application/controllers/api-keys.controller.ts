import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { CreateApiKeyDto } from "../dto";
import { CreateApiKeyCommand } from "../commands/create-api-key.command";
import { AdminTokenGuard } from "src/common";

@Controller('admin/projects/:projectId/api-keys')
@UseGuards(AdminTokenGuard)
export class ApiKeysController  {
    constructor(
        private readonly commandBus: CommandBus,

    ){}

    @Post()
    create(
        @Param('projectId', ParseUUIDPipe) projectId: string,
        @Body() data: CreateApiKeyDto,
    ) {
        return this.commandBus.execute(
            new CreateApiKeyCommand(projectId, data.name)
        )
    }
}