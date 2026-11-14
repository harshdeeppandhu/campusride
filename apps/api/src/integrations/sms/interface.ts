export interface SendOtpSmsParams {
  phone: string;
  otp: string;
  expiryMinutes: number;
}

export interface SendSmsParams {
  phone: string;
  text: string;
}

export interface SendSmsResult {
  messageId: string;
}

export interface SmsProvider {
  name: string;
  sendOtp(params: SendOtpSmsParams): Promise<SendSmsResult>;
  send(params: SendSmsParams): Promise<SendSmsResult>;
}
