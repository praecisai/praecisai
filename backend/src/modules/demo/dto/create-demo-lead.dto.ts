import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreateDemoLeadDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+91)?\d{10}$/, { message: 'Invalid Indian phone number' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsString()
  @IsNotEmpty()
  businessType: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  partiesRange: string;

  @IsString()
  @IsNotEmpty()
  outstandingRange: string;

  @IsString()
  @IsNotEmpty()
  groupName: string;

  @IsString()
  @IsNotEmpty()
  referenceBy: string;
}
