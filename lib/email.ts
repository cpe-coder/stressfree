import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
	host: process.env.EMAIL_HOST || "smtp.gmail.com",
	port: parseInt(process.env.EMAIL_PORT || "587"),
	secure: false,
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASSWORD,
	},
});

export async function sendVerificationEmail(
	email: string,
	code: string,
	username: string
) {
	// If email not configured, just log the code
	if (!process.env.EMAIL_USER) {
		console.log(`Verification code for ${email}: ${code}`);
		return { success: true, message: "Check console for code" };
	}

	try {
		await transporter.sendMail({
			from: process.env.EMAIL_FROM || "noreply@braingame.com",
			to: email,
			subject: "Brain Break - Email Verification",
			html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8b5cf6;">Welcome to Brain Break! 🧠</h1>
          <p>Hi ${username},</p>
          <p>Thank you for signing up! Please use the following code to verify your email:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #8b5cf6; font-size: 32px; letter-spacing: 8px; margin: 0;">${code}</h2>
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">Brain Break - Relax & Refresh Your Mind</p>
        </div>
      `,
		});
		return { success: true, message: "Email sent" };
	} catch (error) {
		console.error("Email error:", error);
		return { success: false, message: "Failed to send email" };
	}
}
