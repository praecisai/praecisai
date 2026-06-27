import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsNumber, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_SERVICE_ROLE_KEY: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  BOLNA_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  BOLNA_AGENT_ID: string;

  @IsOptional()
  @IsString()
  BOLNA_WEBHOOK_SECRET?: string;

  @IsString()
  @IsNotEmpty()
  BOLNA_HANDOFF_NUMBER: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsNumber()
  @IsNotEmpty()
  PORT: number;

  @IsOptional()
  @IsString()
  BOLNA_FROM_NUMBER?: string;

  @IsOptional()
  @IsString()
  SENTRY_DSN?: string;

  @IsOptional()
  @IsString()
  POSTHOG_KEY?: string;

  @IsOptional()
  @IsString()
  ANTHROPIC_API_KEY?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    const missingVars = errors.map((error) => error.property).join(', ');
    throw new Error(`Environment validation failed. Missing or invalid variables: ${missingVars}`);
  }
  return validatedConfig;
}
