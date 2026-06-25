import { IsEnum, IsNumber, IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { DemoType } from '@prisma/client';

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
}
