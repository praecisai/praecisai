import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Version,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService, ColumnMapping } from './import.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EmailAllowlistGuard } from '../../common/guards/email-allowlist.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BusinessId } from '../../common/decorators/current-user.decorator';
import { IsString, IsArray, IsOptional } from 'class-validator';

class PreviewDto {
  @IsString() history_id!: string;
  @IsArray() mappings!: ColumnMapping[];
}

class ExecuteDto {
  @IsString() history_id!: string;
  @IsArray() mappings!: ColumnMapping[];
  @IsOptional() @IsString() template_name?: string;
}

class SaveTemplateDto {
  @IsString() name!: string;
  @IsArray() mappings!: ColumnMapping[];
}

@Controller('import')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImportController {
  constructor(private importService: ImportService) {}

  // Step 1: Upload file
  @Post('upload')
  @Roles('MANAGER')
  @UseGuards(EmailAllowlistGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  upload(
    @BusinessId() businessId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.importService.upload(businessId, file);
  }

  // Step 2: Preview with mapping
  @Post('map')
  @Roles('MANAGER')
  @UseGuards(EmailAllowlistGuard)
  preview(@BusinessId() businessId: string, @Body() dto: PreviewDto) {
    return this.importService.preview(businessId, dto.history_id, dto.mappings);
  }

  // Step 3: Execute full import
  @Post('execute')
  @Roles('MANAGER')
  @UseGuards(EmailAllowlistGuard)
  execute(@BusinessId() businessId: string, @Body() dto: ExecuteDto) {
    return this.importService.execute(
      businessId,
      dto.history_id,
      dto.mappings,
      dto.template_name,
    );
  }

  // Templates
  @Get('templates')
  getTemplates(@BusinessId() businessId: string) {
    return this.importService.getTemplates(businessId);
  }

  @Post('templates')
  @Roles('MANAGER')
  saveTemplate(@BusinessId() businessId: string, @Body() dto: SaveTemplateDto) {
    return this.importService.saveTemplate(businessId, dto.name, dto.mappings);
  }

  // History
  @Get('history')
  getHistory(
    @BusinessId() businessId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.importService.getHistoryList(businessId, page, limit);
  }

  // Single history row: the dashboard polls this while an import runs in the
  // background (status PROCESSING → COMPLETED/FAILED, result in result_summary)
  @Get('history/:id')
  getHistoryById(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.importService.getHistoryById(businessId, id);
  }
}
