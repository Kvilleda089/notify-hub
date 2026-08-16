import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from "src/config";
import { PrismaClient } from "src/generated/prisma/client";


@Injectable()
export class PrismaService  extends PrismaClient implements OnModuleInit, OnModuleDestroy {

 private readonly logger = new Logger('PrismaService')
    constructor(){
        const adapter = new PrismaPg({
            connectionString: env.database_url,
        });
        super({adapter})
    }

    async onModuleInit() {
        await this.$connect();
        this.logger.log(`Connection database success.`);
    }

    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log(`Disconected database success.`)
    }   
}