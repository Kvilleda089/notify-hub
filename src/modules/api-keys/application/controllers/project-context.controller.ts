import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiKeyGuard } from "../guards/api-key.guard";
import type { AuthenticationRequest } from 'src/common';

@Controller('v1/projects')
@UseGuards(ApiKeyGuard)
export class ProjectContextController {

    @Get('me') 
    getProject(@Req() request: AuthenticationRequest) {
        return {
            projectId: request.auth.projectId,
        };
    }

}