import nodemailer from "nodemailer";

const isProduction = process.env.NODE_ENV === "production";
const hasEmailConfig = Boolean(process.env.EMAIL && process.env.PASS);

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, 
  auth: {
    user: process.env.EMAIL || "",
    pass: process.env.PASS || "", 
  },
});

if (!isProduction && hasEmailConfig) {
  transporter.verify((error) => {
    if (error) {
      console.warn("Email transporter verify failed (local dev):", error.message);
    } else {
      console.log("Email transporter is ready to send messages");
    }
  });
} else {
  console.log("⚠️ Email transporter disabled in production environment");
}
