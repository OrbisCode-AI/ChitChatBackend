import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { HealthModule } from "@/app/health/health.module";

import { LoggerModule } from "@/shared/logger/logger.module";

import { LlmsModule } from "@/contexts/llms/llms.module";
import { UserModule } from "@/contexts/users/user.module";
import { VectorModule } from "@/contexts/vector/vector.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    LoggerModule,
    HealthModule,
    UserModule,
    LlmsModule,
    VectorModule,
  ],
})
export class AppModule {}
