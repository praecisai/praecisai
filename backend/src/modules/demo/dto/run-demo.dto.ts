import { IsEnum, IsNumber, IsString, IsNotEmpty } from 'class-validator';
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
}
