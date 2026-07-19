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

  // WhatsApp statement messages via AiSensy campaign API
  @IsOptional()
  @IsString()
  AISENSY_API_KEY?: string;

  // Shared secret guarding the public AiSensy inbound webhook (?token=...)
  @IsOptional()
  @IsString()
  AISENSY_INBOUND_TOKEN?: string;

  // ─── Billing (all optional: Razorpay mock mode runs without any of them) ──

  // Master key for AES-256-GCM encryption of tenant API keys (64-char hex or
  // any passphrase). REQUIRED before storing tenant keys via the admin panel.
  @IsOptional()
  @IsString()
  BILLING_ENCRYPTION_KEY?: string;

  @IsOptional()
  @IsString()
  RAZORPAY_KEY_ID?: string;

  @IsOptional()
  @IsString()
  RAZORPAY_KEY_SECRET?: string;

  @IsOptional()
  @IsString()
  RAZORPAY_WEBHOOK_SECRET?: string;

  // Reuse an existing ₹5,900/month plan instead of creating one at runtime
  @IsOptional()
  @IsString()
  RAZORPAY_PLAN_ID?: string;

  // Force mock mode even when keys are present
  @IsOptional()
  @IsString()
  RAZORPAY_MOCK?: string;

  // IMMEDIATE_NEXT_FIRST (default) | FIRST_AFTER_FULL_MONTH
  @IsOptional()
  @IsString()
  BILLING_ANCHOR_MODE?: string;

  // Comma-separated Praecis staff emails allowed into /admin
  @IsOptional()
  @IsString()
  ADMIN_EMAILS?: string;

  // Optional email nudges (low balance / mandate failure) via Resend
  @IsOptional()
  @IsString()
  RESEND_API_KEY?: string;

  @IsOptional()
  @IsString()
  BILLING_EMAIL_FROM?: string;

  // Bolna API base override (default https://api.bolna.dev)
  @IsOptional()
  @IsString()
  BOLNA_API_BASE?: string;
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
