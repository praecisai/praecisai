export class RetellWebhookDto {
  event: string;
  call?: {
    call_id: string;
    call_analysis?: {
      user_sentiment?: string;
      call_summary?: string;
      custom_analysis_data?: {
        promised_amount?: string;
        promised_date?: string;
        was_transferred?: string;
        transfer_reason?: string;
        customer_mood_summary?: string;
      };
    };
    recording_url?: string;
    duration?: number;
    metadata?: {
      demo_lead_id?: string;
    };
  };
}
