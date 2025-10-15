import { transporter } from "./emailConfig";
import { getVerificationEmailTemplate, getWelcomeEmailTemplate } from "../libs/emailTemplate";
import nodemailer from "nodemailer";

//verification email otp
export const sendVerificationCode = async (email: string, verificationCode: string): Promise<void> => {
  try {
    const response = await transporter.sendMail({
    from: '"OTP Verification" <process.env.EMAIL>',
      to: email,
      subject: "Verify your Email",
      text: "Verify Your Email",
      html: getVerificationEmailTemplate(verificationCode),
    });
    console.log("Email sent successfully", response);
  } catch (error) {
    console.error("Email error", error);
  }
};

//welcome email
export const welcomeEmail = async (email: string, name: string): Promise<void> => {
  try {
    const response = await transporter.sendMail({
      from: '"VOW APP" <process.env.EMAIL>',
      to: email,
      subject: "Welcome!",
      text: "Welcome Message",
      html: getWelcomeEmailTemplate(name),
    });
    console.log("Welcome email sent successfully", response);
  } catch (error) {
    console.error("Email error", error);
  }
};

//reset password email
export const sendResetOtpEmail = async (email: string, otp: string) => {
  await transporter.sendMail({
    from: `"VOW App" <${process.env.EMAIL}>`,
    to: email,
    subject: "Password Reset OTP",
    html: `
      <h2>Reset Your Password</h2>
      <p>Your OTP for password reset is:</p>
      <h1 style="letter-spacing:3px">${otp}</h1>
      <p>This OTP will expire in 10 minutes.</p>
    `,
  });
};
