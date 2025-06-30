import crypto from 'crypto';

// Email service for sending password reset emails
class EmailService {
  constructor() {
    this.from = process.env.SMTP_FROM || 'noreply@elouarate.com';
    this.adminEmail = 'marouan.mounib33@gmail.com';
    
    // Email templates
    this.templates = {
      passwordReset: {
        subject: 'ELOUARATE ART - Password Reset Request',
        html: (resetLink, username) => `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset - ELOUARATE ART</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f7fafc; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
              .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
              .subtitle { color: rgba(255,255,255,0.9); font-size: 16px; }
              .content { padding: 40px 30px; }
              .title { color: #2d3748; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
              .message { color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0; }
              .button:hover { opacity: 0.9; }
              .warning { background-color: #fed7d7; border: 1px solid #feb2b2; border-radius: 8px; padding: 15px; margin: 20px 0; color: #742a2a; }
              .footer { background-color: #f7fafc; padding: 30px; text-align: center; color: #718096; font-size: 14px; }
              .security-tips { background-color: #ebf8ff; border: 1px solid #bee3f8; border-radius: 8px; padding: 20px; margin: 20px 0; }
              .security-tips h4 { color: #2c5282; margin-top: 0; }
              .security-tips ul { color: #2d3748; margin: 10px 0; padding-left: 20px; }
              .expiry { color: #e53e3e; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🎨 ELOUARATE ART</div>
                <div class="subtitle">Premium Moroccan Art Gallery</div>
              </div>
              
              <div class="content">
                <h1 class="title">Password Reset Request</h1>
                
                <div class="message">
                  Hello <strong>${username}</strong>,<br><br>
                  
                  We received a request to reset your admin password for ELOUARATE ART. If you made this request, click the button below to reset your password:
                </div>
                
                <div style="text-align: center;">
                  <a href="${resetLink}" class="button">Reset Password</a>
                </div>
                
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong><br>
                  This link will expire in <span class="expiry">15 minutes</span> for security reasons. If you don't reset your password within this time, you'll need to request a new reset link.
                </div>
                
                <div class="security-tips">
                  <h4>🔒 Security Tips:</h4>
                  <ul>
                    <li>Never share your password with anyone</li>
                    <li>Use a strong password with at least 8 characters</li>
                    <li>Include uppercase, lowercase, numbers, and special characters</li>
                    <li>Don't use the same password for multiple accounts</li>
                  </ul>
                </div>
                
                <div class="message">
                  If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                  <br><br>
                  If you're having trouble clicking the button, copy and paste this link into your browser:<br>
                  <code style="background-color: #f7fafc; padding: 5px; border-radius: 3px; word-break: break-all;">${resetLink}</code>
                </div>
              </div>
              
              <div class="footer">
                <p><strong>ELOUARATE ART</strong><br>
                Premium Moroccan Art Gallery<br>
                This is an automated message, please do not reply to this email.</p>
                
                <p style="margin-top: 20px; font-size: 12px; color: #a0aec0;">
                  © 2024 ELOUARATE ART. All rights reserved.<br>
                  Secure admin panel communication
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      },
      
      passwordResetSuccess: {
        subject: 'ELOUARATE ART - Password Successfully Reset',
        html: (username, resetTime) => `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Successful - ELOUARATE ART</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f7fafc; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; }
              .header { background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 40px 20px; text-align: center; }
              .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
              .subtitle { color: rgba(255,255,255,0.9); font-size: 16px; }
              .content { padding: 40px 30px; }
              .title { color: #2d3748; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
              .message { color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
              .success-box { background-color: #f0fff4; border: 1px solid #9ae6b4; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
              .footer { background-color: #f7fafc; padding: 30px; text-align: center; color: #718096; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🎨 ELOUARATE ART</div>
                <div class="subtitle">Premium Moroccan Art Gallery</div>
              </div>
              
              <div class="content">
                <h1 class="title">✅ Password Reset Successful</h1>
                
                <div class="success-box">
                  <h3 style="color: #22543d; margin-top: 0;">Password Updated Successfully!</h3>
                  <p style="color: #2d3748; margin-bottom: 0;">Your admin password has been securely updated.</p>
                </div>
                
                <div class="message">
                  Hello <strong>${username}</strong>,<br><br>
                  
                  Your admin password for ELOUARATE ART has been successfully reset on <strong>${resetTime}</strong>.
                  <br><br>
                  
                  You can now log in to your admin dashboard using your new password.
                  <br><br>
                  
                  If you did not perform this action, please contact support immediately.
                </div>
              </div>
              
              <div class="footer">
                <p><strong>ELOUARATE ART</strong><br>
                Premium Moroccan Art Gallery<br>
                This is an automated message, please do not reply to this email.</p>
                
                <p style="margin-top: 20px; font-size: 12px; color: #a0aec0;">
                  © 2024 ELOUARATE ART. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      }
    };
  }

  // Simulate email sending (in production, integrate with actual email service)
  async sendEmail(to, subject, html) {
    console.log('📧 Simulating email send:');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML: ${html.substring(0, 200)}...`);
    
    // In production, you would use nodemailer or another email service
    // For now, we'll just log the email content
    
    // Simulate sending to your email for testing
    if (to === this.adminEmail) {
      console.log('✅ Email would be sent to admin email');
    }
    
    return {
      success: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      to,
      subject
    };
  }

  // Send password reset email
  async sendPasswordResetEmail(adminData, resetToken) {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/admin/reset-password?token=${resetToken}`;
    
    const html = this.templates.passwordReset.html(resetLink, adminData.username);
    
    return await this.sendEmail(
      adminData.email,
      this.templates.passwordReset.subject,
      html
    );
  }

  // Send password reset success email
  async sendPasswordResetSuccessEmail(adminData) {
    const resetTime = new Date().toLocaleString('en-US', {
      timeZone: 'Africa/Casablanca',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
    
    const html = this.templates.passwordResetSuccess.html(adminData.username, resetTime);
    
    return await this.sendEmail(
      adminData.email,
      this.templates.passwordResetSuccess.subject,
      html
    );
  }

  // Generate secure reset token
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate reset token hash for database storage
  hashResetToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Verify reset token
  verifyResetToken(token, hashedToken) {
    const tokenHash = this.hashResetToken(token);
    return tokenHash === hashedToken;
  }
}

// Create and export a singleton instance
const emailService = new EmailService();
export default emailService; 