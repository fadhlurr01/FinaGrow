import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (e) {
      console.warn('Prisma initial connection deferred (database might not be running locally yet).');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
