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
export const welcomeEmail = async (email: string, username: string): Promise<void> => {
  try {
    const response = await transporter.sendMail({
      from: '"VOW APP" <process.env.EMAIL>',
      to: email,
      subject: "Welcome!",
      text: "Welcome Message",
      html: getWelcomeEmailTemplate(username),
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
      <p>This OTP will expire in 2 minutes.</p>
    `,
  });
};

//workspace invite email
export const sendInviteEmail = async (email: string, inviterName: string, workspaceName: string, inviteCode: string): Promise<void> => {
  try {
    await transporter.sendMail({
      from: `"${inviterName}" <${process.env.EMAIL}>`,
      to: email,
      subject: "You've been invited to join a workspace",
      html: `
        <h2>Join Workspace</h2>
        <p>${inviterName} has invited you to join the workspace "${workspaceName}".</p>
        <p>Use the code below to accept the invitation:</p>
        <h1 style="letter-spacing:3px">${inviteCode}</h1>
      `,
    });
  } catch (error) {
    console.error("Error sending invite email:", error);
  }
};
