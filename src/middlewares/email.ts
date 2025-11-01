import { transporter } from "./emailConfig";
import { getVerificationEmailTemplate, getWelcomeEmailTemplate } from "../libs/emailTemplate";
import nodemailer from "nodemailer";
import cron from "node-cron";

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


//meeting schedule message
export const sendMeetingScheduledEmail = async (
  attendees: string[],
  title: string,
  description: string,
  startTime: Date,
  endTime: Date,
  organizerName: string
) => {
  try {
    const formattedStart = new Date(startTime).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });

    const formattedEnd = new Date(endTime).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });

    const html = `
      <div style="font-family:Arial,sans-serif;padding:16px;background:#f9f9f9;border-radius:10px;">
        <h2 style="color:#2b6cb0;">📅 Meeting Scheduled</h2>
        <p><b>${title}</b> has been scheduled by ${organizerName}.</p>
        <p><b>Start:</b> ${formattedStart}</p>
        <p><b>End:</b> ${formattedEnd}</p>
        ${description ? `<p>${description}</p>` : ""}
        <hr/>
        <p style="font-size:13px;color:#666;">You will receive a reminder 15 minutes before the meeting starts.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"VOW Scheduler" <${process.env.EMAIL_USER}>`,
      to: attendees.join(", "),
      subject: `📅 Meeting Scheduled: ${title}`,
      html,
    });

    console.log(`Meeting scheduled email sent to: ${attendees.join(", ")}`);
  } catch (error) {
    console.error("Error sending meeting scheduled email:", error);
  }
};

//remainder for meeting
export const scheduleMeetingReminderEmail = (
  attendees: string[],
  title: string,
  startTime: string
) => {
  const alertTime = new Date(new Date(startTime).getTime() - 15 * 60 * 1000);

  cron.schedule(
    `${alertTime.getMinutes()} ${alertTime.getHours()} ${alertTime.getDate()} ${
      alertTime.getMonth() + 1
    } *`,
    async () => {
      try {
        const html = `
          <div style="font-family:Arial,sans-serif;padding:16px;background:#fff4e6;border-radius:10px;">
            <h2 style="color:#d97706;">⏰ Meeting Reminder</h2>
            <p>Your meeting <b>${title}</b> starts in 15 minutes.</p>
            <p><b>Start Time:</b> ${new Date(startTime).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })}</p>
          </div>
        `;

        await transporter.sendMail({
          from: `"VOW Scheduler" <${process.env.EMAIL_USER}>`,
          to: attendees.join(", "),
          subject: `⏰ Reminder: Meeting "${title}" starts in 15 minutes`,
          html,
        });

        console.log(`✅ Reminder email sent for meeting: ${title}`);
      } catch (error) {
        console.error("❌ Error sending meeting reminder:", error);
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  console.log(`⏰ Reminder job scheduled for meeting: ${title}`);
};

export const sendMeetingCancellationEmail = async (
  attendees: string[],
  meetingTitle: string,
  startTime: Date,
  workspaceName?: string
): Promise<void> => {
  if (!attendees?.length) return;

  const formattedDate = new Date(startTime).toLocaleString();

  const emailTemplate = (email: string) => ({
    from: `"${workspaceName || "Workspace"}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Meeting Cancelled: ${meetingTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2 style="color: #d9534f;">Meeting Cancelled</h2>
        <p>The following meeting has been cancelled:</p>
        <ul>
          <li><b>Title:</b> ${meetingTitle}</li>
          <li><b>Scheduled Date:</b> ${formattedDate}</li>
        </ul>
        <p>We apologize for any inconvenience caused.</p>
        <p>— ${workspaceName || "Your Team"}</p>
      </div>
    `,
  });

  try {
    await Promise.all(attendees.map(email => transporter.sendMail(emailTemplate(email))));
    console.log("✅ Cancellation emails sent successfully");
  } catch (err) {
    console.error("❌ Error sending cancellation emails:", err);
  }
};

