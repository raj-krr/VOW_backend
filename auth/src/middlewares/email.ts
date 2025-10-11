import { transporter } from "./emailConfig";
import { getVerificationEmailTemplate, getWelcomeEmailTemplate } from "../libs/emailTemplate";
import nodemailer from "nodemailer";

// Send OTP verification email
export const sendVerificationCode = async (email: string, verificationCode: string): Promise<void> => {
  try {
    const response = await transporter.sendMail({
      from: '"OTP Verification" <process.env.EMAil>',
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

// Send welcome email
export const welcomeEmail = async (email: string, name: string): Promise<void> => {
  try {
    const response = await transporter.sendMail({
      from: '"Welcome Email" <process.env.EMAIL>',
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
