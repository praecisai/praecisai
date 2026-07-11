import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private _supabase: SupabaseClient | null = null;
  private readonly BUCKET = 'imports';
  private readonly STATEMENTS_BUCKET = 'statements';

  constructor(private config: ConfigService) {}

  private get supabase(): SupabaseClient {
    if (!this._supabase) {
      const url = this.config.get<string>('SUPABASE_URL');
      const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
      if (!url || !key) throw new Error('Supabase credentials not configured');
      this._supabase = createClient(url, key);
    }
    return this._supabase;
  }

  async uploadImportFile(
    businessId: string,
    originalName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const ext = originalName.split('.').pop();
    const key = `${businessId}/${uuidv4()}.${ext}`;

    const { error } = await this.supabase.storage
      .from(this.BUCKET)
      .upload(key, buffer, { contentType: mimeType, upsert: false });

    if (error) {
      this.logger.error(`Storage upload failed: ${error.message}`);
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }

    const { data } = this.supabase.storage.from(this.BUCKET).getPublicUrl(key);
    return data.publicUrl;
  }

  /**
   * Upload a statement PDF to the private `statements` bucket and return a
   * signed URL. The URL only needs to live long enough for WhatsApp/AiSensy
   * to fetch the media at send time (it re-hosts the file after that).
   */
  async uploadStatementPdf(
    ownerId: string,
    buffer: Buffer,
    expirySeconds = 24 * 60 * 60,
  ): Promise<string> {
    const key = `${ownerId}/${uuidv4()}.pdf`;

    const { error } = await this.supabase.storage
      .from(this.STATEMENTS_BUCKET)
      .upload(key, buffer, { contentType: 'application/pdf', upsert: false });

    if (error) {
      this.logger.error(`Statement upload failed: ${error.message}`);
      throw new BadRequestException(`Statement upload failed: ${error.message}`);
    }

    const { data, error: signError } = await this.supabase.storage
      .from(this.STATEMENTS_BUCKET)
      .createSignedUrl(key, expirySeconds);

    if (signError || !data?.signedUrl) {
      this.logger.error(`Statement signed URL failed: ${signError?.message}`);
      throw new BadRequestException('Could not create statement link');
    }

    return data.signedUrl;
  }

  async downloadFile(fileUrl: string): Promise<Buffer> {
    // Extract path from public URL
    const urlObj = new URL(fileUrl);
    const pathParts = urlObj.pathname.split(`/storage/v1/object/public/${this.BUCKET}/`);
    const filePath = pathParts[1];

    if (!filePath) {
      throw new BadRequestException('Invalid file URL');
    }

    const { data, error } = await this.supabase.storage
      .from(this.BUCKET)
      .download(filePath);

    if (error || !data) {
      throw new BadRequestException(`File download failed: ${error?.message}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const urlObj = new URL(fileUrl);
    const pathParts = urlObj.pathname.split(`/storage/v1/object/public/${this.BUCKET}/`);
    const filePath = pathParts[1];

    if (filePath) {
      await this.supabase.storage.from(this.BUCKET).remove([filePath]);
    }
  }
}
