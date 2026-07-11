import { IsEnum, IsNumber, IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DemoType } from '@prisma/client';

// One invoice row for the WhatsApp statement PDF
export class DemoInvoiceDto {
  @IsString()
  @IsNotEmpty()
  billNo: string;

  @IsString()
  billDate: string; // DD/MM/YYYY

  @IsNumber()
  billAmount: number;

  @IsNumber()
  dueAmount: number;

  @IsNumber()
  daysOverdue: number;

  @IsString()
  status: string; // per-invoice segment label shown in the PDF
}

export class RunDemoDto {
  @IsEnum(DemoType)
  demoType: DemoType;

  @IsString()
  @IsNotEmpty()
  partyName: string;

  @IsString()
  @IsNotEmpty()
  mobileNumber: string;

  @IsNumber()
  dueAmount: number;

  @IsNumber()
  daysOverdue: number;

  @IsString()
  @IsNotEmpty()
  billNo: string;

  @IsString()
  @IsNotEmpty()
  segment: string;

  // Partial payment: how much was paid before on this bill
  @IsNumber()
  @IsOptional()
  previousPaidAmount?: number;

  // Original bill amount before any partial payment
  @IsNumber()
  @IsOptional()
  totalOriginalAmount?: number;

  // Multi-invoice: total due across all invoices for this party
  @IsNumber()
  @IsOptional()
  totalDueForParty?: number;

  // Multi-invoice: max days overdue across all invoices for this party
  @IsNumber()
  @IsOptional()
  maxDaysForParty?: number;

  // ── WhatsApp statement PDF fields ──
  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  agentName?: string;

  // All open invoices for this party — rows of the statement table
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DemoInvoiceDto)
  @IsOptional()
  invoices?: DemoInvoiceDto[];
}
