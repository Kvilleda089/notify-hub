import { Module } from '@nestjs/common';
import { PrismaModule } from './database/prisma.module';
import { CqrsModule } from '@nestjs/cqrs';
import { ProjectsModule } from './modules/projects/projects.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';

@Module({
  imports: [
    PrismaModule,
    CqrsModule.forRoot(),
    ProjectsModule,
    ApiKeysModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
