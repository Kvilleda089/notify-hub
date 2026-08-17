import { Module } from '@nestjs/common';
import { PrismaModule } from './database/prisma.module';
import { CqrsModule } from '@nestjs/cqrs';
import { ProjectsModule } from './modules/projects/projects.module';

@Module({
  imports: [
    PrismaModule,
    CqrsModule.forRoot(),
    ProjectsModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
