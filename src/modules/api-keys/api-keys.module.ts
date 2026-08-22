import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/database/prisma.module';
import { CreateApiKeyHandler } from './application/handler/create-api-key.handler';
import { ApiKeyGeneratorService } from './infrastructure/security/api-key-generator.service';
import { ApiKeysController } from './application/controllers/api-keys.controller';
import { AdminTokenGuard } from 'src/common';
import { ApiKeyGuard } from './application/guards/api-key.guard';
import { ProjectContextController } from './application/controllers/project-context.controller';

@Module({

    imports: [PrismaModule],
    controllers: [
        ApiKeysController, 
        ProjectContextController,
    ],
    providers: [
        CreateApiKeyHandler, 
        ApiKeyGeneratorService,
        AdminTokenGuard,
        ApiKeyGuard,
    ],
    exports: [ApiKeyGeneratorService]
})
export class ApiKeysModule {}
