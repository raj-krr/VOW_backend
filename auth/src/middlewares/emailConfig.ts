import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: "mr.rajkumar2468@gmail.com",
    pass: "pmzr isik iwzl zzmm", // consider using environment variable for security
  },
});

// Optional: verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("Email transporter error:", error);
  } else {
    console.log("Email transporter is ready to send messages");
  }
});
