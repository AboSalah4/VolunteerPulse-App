const { Resend } = require("resend");

// Initialize Resend with your new API Key
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  try {
    await resend.emails.send({
      // Resend requires using this 'from' address for free/unverified domains
      from: "VolunteerPulse <onboarding@resend.dev>",
      to: options.email,
      subject: options.subject,
      text: options.message,
      // Helps you filter by project in your Resend Dashboard
      tags: [{ name: "project", value: "volunteer-pulse" }],
    });
    console.log("✅ Email sent successfully via Resend API");
  } catch (error) {
    console.error("🔴 Resend API Error:", error);
    throw error;
  }
};

module.exports = sendEmail;
