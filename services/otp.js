import nodemailer from 'nodemailer';
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

/**
 * OTP Service for email and mobile verification
 */
class OTPService {
  constructor() {
    // Email transporter
    this.transporter = null;
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }

    // Twilio client for SMS
    this.twilioClient = null;
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    // In-memory OTP storage (use Redis in production)
    this.otpStore = new Map();
  }

  /**
   * Generate 6-digit OTP
   */
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP via Email
   */
  async sendEmailOTP(email, otp) {
    try {
      if (!this.transporter) {
        console.warn('⚠️ Email service not configured. OTP:', otp);
        return { success: true, otp }; // For development
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@agridirect.com',
        to: email,
        subject: 'AgriDirect - Email Verification OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #00796b;">AgriDirect Email Verification</h2>
            <p>Your OTP for email verification is:</p>
            <div style="background: #e0f7fa; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${otp}
            </div>
            <p>This OTP is valid for 10 minutes.</p>
            <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('❌ Send email OTP error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send OTP via SMS
   */
  async sendMobileOTP(mobileNumber, otp) {
    try {
      if (!this.twilioClient) {
        console.warn('⚠️ SMS service not configured. OTP:', otp);
        return { success: true, otp }; // For development
      }

      const message = await this.twilioClient.messages.create({
        body: `Your AgriDirect verification OTP is: ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: mobileNumber
      });

      return { success: true, messageSid: message.sid };
    } catch (error) {
      console.error('❌ Send mobile OTP error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store OTP with expiry (10 minutes)
   */
  storeOTP(identifier, otp, type) {
    const key = `${type}:${identifier}`;
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    this.otpStore.set(key, {
      otp,
      expiry,
      attempts: 0
    });

    // Clean up after 10 minutes
    setTimeout(() => {
      this.otpStore.delete(key);
    }, 10 * 60 * 1000);
  }

  /**
   * Verify OTP
   */
  verifyOTP(identifier, otp, type) {
    const key = `${type}:${identifier}`;
    const stored = this.otpStore.get(key);

    if (!stored) {
      return { success: false, error: 'OTP not found or expired' };
    }

    if (Date.now() > stored.expiry) {
      this.otpStore.delete(key);
      return { success: false, error: 'OTP expired' };
    }

    if (stored.attempts >= 5) {
      this.otpStore.delete(key);
      return { success: false, error: 'Too many attempts. Please request a new OTP.' };
    }

    stored.attempts++;

    if (stored.otp !== otp) {
      return { success: false, error: 'Invalid OTP' };
    }

    // OTP verified, remove it
    this.otpStore.delete(key);
    return { success: true };
  }

  /**
   * Generate and send OTP for email
   */
  async generateAndSendEmailOTP(email) {
    const otp = this.generateOTP();
    this.storeOTP(email, otp, 'email');
    
    const result = await this.sendEmailOTP(email, otp);
    return { ...result, otp: process.env.NODE_ENV === 'development' ? otp : undefined };
  }

  /**
   * Generate and send OTP for mobile
   */
  async generateAndSendMobileOTP(mobileNumber) {
    const otp = this.generateOTP();
    this.storeOTP(mobileNumber, otp, 'mobile');
    
    const result = await this.sendMobileOTP(mobileNumber, otp);
    return { ...result, otp: process.env.NODE_ENV === 'development' ? otp : undefined };
  }
}

export default new OTPService();

