export interface SendOtpEmailParams {
  to: string;
  otp: string;
  expiryMinutes: number;
  ipAddress?: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendEmailResult {
  messageId: string;
}

export interface EmailProvider {
  name: string;
  sendOtp(params: SendOtpEmailParams): Promise<SendEmailResult>;
  send(params: SendEmailParams): Promise<SendEmailResult>;
}
