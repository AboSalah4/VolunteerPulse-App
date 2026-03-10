const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  // 1. Create a transporter explicitly using IPv4 settings to bypass Render's IPv6 blocks
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    // This tells Node.js to strictly use IPv4, solving the ENETUNREACH error:
    family: 4,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // 2. Define the email options
  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  // 3. Actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
