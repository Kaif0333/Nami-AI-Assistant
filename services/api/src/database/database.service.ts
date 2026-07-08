import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly prisma: PrismaClient | null;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL?.trim();

    if (!databaseUrl) {
      this.prisma = null;
      this.logger.warn(
        "DATABASE_URL is not configured. Using in-memory fallback stores."
      );
      return;
    }

    if (!isPostgresConnectionString(databaseUrl)) {
      this.prisma = null;
      this.logger.warn(
        "DATABASE_URL must start with postgresql:// or postgres://. Using in-memory fallback stores."
      );
      return;
    }

    const adapter = new PrismaPg({
      connectionString: databaseUrl
    });

    this.prisma = new PrismaClient({ adapter });
  }

  get enabled() {
    return Boolean(this.prisma);
  }

  get client() {
    return this.prisma;
  }

  async onModuleInit() {
    if (!this.prisma) {
      return;
    }

    await this.prisma.$connect();
    this.logger.log("Database connection established.");
  }

  async onModuleDestroy() {
    await this.prisma?.$disconnect();
  }
}

function isPostgresConnectionString(value: string) {
  return value.startsWith("postgresql://") || value.startsWith("postgres://");
}
