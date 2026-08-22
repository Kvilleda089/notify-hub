import { Body, Controller, Logger, Post, UseGuards } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { CreateProjectDto } from "..";
import { CreateProjectCommand } from "../../application/commands/create-project.command";
import { AdminTokenGuard } from "src/common";



@Controller('admin/projects')
@UseGuards(AdminTokenGuard)
export class ProjectControllers {
    private readonly logger = new Logger('ProjectController')

    constructor(
        private readonly commandBus: CommandBus,
    ){}

    @Post()
    create(@Body() data: CreateProjectDto) {
        return this.commandBus.execute( new CreateProjectCommand(data.name, data.slug))
    }
}