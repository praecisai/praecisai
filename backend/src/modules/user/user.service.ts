import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';

export class CreateUserDto {
  @IsString() supabaseUid!: string;
  @IsEmail() email!: string;
  @IsEnum(['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER', 'RECOVERY_AGENT'])
  role!: string;
}

export class UpdateUserDto {
  @IsOptional() @IsEnum(['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER', 'RECOVERY_AGENT'])
  role?: string;
  @IsOptional() @IsEnum(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
  status?: string;
}

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAll(businessId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { business_id: businessId },
        skip, take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.user.count({ where: { business_id: businessId } }),
    ]);
    return { data, total, page, limit };
  }

  async findById(businessId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, business_id: businessId },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(businessId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { supabase_uid: dto.supabaseUid },
    });
    if (existing) throw new ConflictException('User already exists');

    return this.prisma.user.create({
      data: {
        business_id: businessId,
        supabase_uid: dto.supabaseUid,
        email: dto.email,
        role: dto.role as any,
      },
    });
  }

  async update(businessId: string, userId: string, dto: UpdateUserDto) {
    await this.findById(businessId, userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: dto as any,
    });
  }

  async remove(businessId: string, userId: string) {
    await this.findById(businessId, userId);
    return this.prisma.user.delete({ where: { id: userId } });
  }
}
