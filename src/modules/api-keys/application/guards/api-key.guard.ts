import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "src/database/prisma.service";
import { ApiKeyGeneratorService } from "../../infrastructure/security/api-key-generator.service";
import { AuthenticationRequest } from "src/common";
import { ProjectSatus } from "@prisma/client";

@Injectable()
export class ApiKeyGuard implements CanActivate {

    constructor(
        private readonly prisma: PrismaService,
        private readonly apiKeyGenerator: ApiKeyGeneratorService,
    ){}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticationRequest>();
        const rawApiKey = this.extractApiKey(request);

        const keyHash = this.apiKeyGenerator.hash(rawApiKey);

        const apiKey = await this.prisma.apiKey.findUnique({
            where: {keyHas: keyHash},
            select: {
                id: true,
                revokedAt: true,
                expiresAt: true,
                project: {
                    select: {
                        id: true,
                        status: true,
                    }
                }
            }
        });

        if(
            !apiKey ||
      apiKey.revokedAt ||
      (apiKey.expiresAt && apiKey.expiresAt < new Date()) ||
      apiKey.project.status !== ProjectSatus.ACTIVE
        ) {
            throw new UnauthorizedException('Invalid API key.');
        }

        await this.prisma.apiKey.update({
            where: {id: apiKey.id},
            data: {
                lastUsedAt: new Date(),
            },
        });

        request.auth = {
            projectId: apiKey.project.id,
            apiKeyId: apiKey.id,
        }

        return true;
    }

    private extractApiKey(request: AuthenticationRequest): string {
        const authorization = request.headers.authorization;

        if(!authorization?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing API key.');
        }

        const rawApiKey = authorization.slice(7).trim();

        if(!rawApiKey.startsWith('ntf_live_')) {
            throw new UnauthorizedException('Invalid API key.');
        }
        
        return rawApiKey;
    }

}