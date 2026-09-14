import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/database/prisma.module';
import { CreateProjectHandler } from './application/handler/create-product.handler';
import { ProjectControllers } from './presentation/controller/project.controller';
import { AdminTokenGuard } from 'src/common/guards/admin-token.guard';

@Module({
    imports:[PrismaModule],
    controllers: [ProjectControllers],
    providers:[
        CreateProjectHandler,
        AdminTokenGuard,
    ],
})
export class ProjectsModule {}
