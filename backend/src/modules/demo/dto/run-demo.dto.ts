import { IsEnum, IsNumber, IsString, IsNotEmpty, IsOptional } from 'class-validator';
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

  @IsNumber()
  @IsOptional()
  previousPaidAmount?: number;
}
