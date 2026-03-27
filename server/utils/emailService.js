const nodemailer = require("nodemailer");

const sendStatusEmail = async (userEmail, userName, taskTitle, newStatus) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD, // This is your App Password from .env
    },
  });

  const mailOptions = {
    from: `"VolunteerPulse" <${process.env.EMAIL_USERNAME}>`,
    to: userEmail,
    subject: `VolunteerPulse: Your Application Status Updated!`,
    html: `
      <h1>Hello ${userName},</h1>
      <p>Good news! The status for your application to <strong>"${taskTitle}"</strong> has been changed to: <strong>${newStatus}</strong>.</p>
      <p>Log in to your dashboard to see more details.</p>
      <br>
      <p>Best regards,<br>The VolunteerPulse Team</p>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = sendStatusEmail;
