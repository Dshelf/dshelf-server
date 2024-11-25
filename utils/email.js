const nodemailer = require("nodemailer");

const sendEmail = (otp, reciepient, next) => {
  try {
    // Create a transporter object using your SMTP server details
    console.log("called in here here");
    const transporter = nodemailer.createTransport({
      service: "Gmail", // e.g., "Gmail", "Outlook", "Yahoo", or use your SMTP server details
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // Bypass SSL verification
      },
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: reciepient,
      subject: "Otp verification",
      // text: `This is a test email sent from Node.js using Nodemailer on Sarturn. ${otp} `,
      html: `
      <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Otp/Email</title>
        </head>
        <body style="width: 100vw; height: 100vh; margin: 0; padding: 0; background-color: #7746C1;">
          <table width="100%" height="100%" cellpadding="0" cellspacing="0" border="0" style="text-align: center; vertical-align: middle;">
            <tr>
              <td style="font-size: 1.125rem; line-height: 0.75rem; color: #fff; margin-bottom: 5px;">PayBeforeService</td>
            </tr>
            <tr>
              <td>
                <table style="width: 70%; background-color: #fff; border-radius: 0.25rem; color: #4A4A4A; padding: 1rem; margin: 0 auto;">
                  <tr>
                    <td style="text-align: center;">
                      <img src="https://img.icons8.com/clouds/100/000000/handshake.png" alt="" style="max-width: 50%; height: auto; display: block; margin: 0.75rem auto 0;">
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center;">
                      <div style="font-weight: 700;">Otp Confirmation</div>
                      <small style="font-size: 0.75rem; line-height: 1rem; font-weight: 600;">use the otp below to verify your account</small>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size: 1.5rem; line-height: 2rem; font-weight: 700; text-align: center;">${otp}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="margin-top: 1.25rem; font-size: 1.5rem; line-height: 2rem; font-weight: 600;">Contact us</td>
            </tr>
          </table>
        </body>
        </html>    
      `,
    };

    // Send email
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        throw error;
      }
      return info.response;
    });
  } catch (error) {
    next(error);
  }
};

const sendPasswordEmail = async (link, recipient, next) => {
  try {
    // Set up transporter
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // HTML email template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333333;
              margin: 0;
              padding: 0;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .email-header {
              background-color: #ffffff;
              padding: 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .email-body {
              background-color: #ffffff;
              padding: 20px;
              margin-top: 20px;
              border-radius: 8px;
            }
            .reset-button {
              display: inline-block;
              padding: 12px 24px;
              margin: 20px 0;
              background-color: #4CAF50;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 4px;
              font-weight: bold;
              text-align: center;
            }
            .reset-button:hover {
              background-color: #45a049;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 12px;
              color: #666666;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="email-header">
              <h2 style="color: #333333; margin: 0;">Password Reset Request</h2>
            </div>
            <div class="email-body">
              <p>Hello,</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              
              <div style="text-align: center;">
                <a href="${link}" class="reset-button">
                  Reset Password
                </a>
              </div>
              
              <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
              
              <p>This link will expire in 1 hour for security reasons.</p>
              
              <p>Best regards,<br>Your Support Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply to this email.</p>
              <p>If you're having trouble clicking the button, copy and paste this URL into your browser:<br>
                <span style="color: #4CAF50;">${link}</span>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Define email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipient,
      subject: "Password Reset Request",
      text: `Please use the following link to reset your password: ${link}`, // Plain text version
      html: htmlContent, // HTML version
    };

    // Attempt to send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.response}`);
    return info.response;
  } catch (error) {
    console.error("Error sending email:", error);
    next(
      new ErrorResponse(
        "Failed to send reset email. Please try again later.",
        500
      )
    );
  }
};

const sendPaymentInfo = (info, reciepient, next) => {
  try {
    // Create a transporter object using your SMTP server details
    const transporter = nodemailer.createTransport({
      service: "Gmail", // e.g., "Gmail", "Outlook", "Yahoo", or use your SMTP server details
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // Bypass SSL verification
      },
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: reciepient,
      subject: "Payment info",
      // text: `This is a test email to show you your payment details ${info} `,
      html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Otp/Email</title>
      </head>
      <body style="width: 100vw; height: 100vh; margin: 0; padding: 0; background-color: #7746C1;">
        <table width="100%" height="100%" cellpadding="0" cellspacing="0" border="0" style="text-align: center; vertical-align: middle;">
          <tr>
            <td style="font-size: 1.125rem; line-height: 0.75rem; color: #fff; margin-bottom: 5px;">PayBeforeService</td>
          </tr>
          <tr>
            <td>
              <table style="width: 70%; background-color: #fff; border-radius: 0.25rem; color: #4A4A4A; padding: 1rem; margin: 0 auto;">
                <tr>
                  <td style="text-align: center;">
                    <img src="https://img.icons8.com/clouds/100/000000/handshake.png" alt="" style="max-width: 50%; height: auto; display: block; margin: 0.75rem auto 0;">
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <div style="font-weight: 700;">Payment Successfull</div>
                    <small style="font-size: 0.75rem; line-height: 1rem; font-weight: 600;">below is the reedem code for this payment</small>
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 1.5rem; line-height: 2rem; font-weight: 700; text-align: center;">${info}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="margin-top: 1.25rem; font-size: 1.5rem; line-height: 2rem; font-weight: 600;">Contact us</td>
          </tr>
        </table>
      </body>
      </html> 
      `,
    };

    // Send email
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        throw error;
      }
      return info;
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendEmail, sendPasswordEmail, sendPaymentInfo };
