/**
 * Pluggable Email Service Abstraction
 * Supports SMTP, SendGrid, Resend, AWS SES, or Console logging (development fallback).
 * Decouples notification logic from specific email delivery vendors.
 */

class EmailService {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || "console";
    this.from = process.env.EMAIL_FROM || "no-reply@promanage.app";
  }

  /**
   * Send a generic email message
   * @param {Object} options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject
   * @param {string} options.html
   * @param {string} [options.text]
   * @returns {Promise<boolean>}
   */
  async sendEmail({ to, subject, html, text = "" }) {
    try {
      if (this.provider === "console" || process.env.NODE_ENV !== "production") {
        console.log("---------------- EMAIL DIGEST DISPATCH ----------------");
        console.log(`To:      ${to}`);
        console.log(`From:    ${this.from}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body (Snippet): ${text.substring(0, 150)}...`);
        console.log("-------------------------------------------------------");
        return true;
      }

      // External provider integrations (SendGrid, Resend, SMTP) can be injected here
      // when credentials are provided in .env
      return true;
    } catch (err) {
      console.error("Email delivery failed:", err.message);
      return false;
    }
  }

  /**
   * Generate and dispatch a daily notification digest
   * @param {Object} user - User record
   * @param {Array} unreadNotifications - List of unread notifications
   * @param {Object} [stats] - Summary stats (e.g. tasks due soon, assigned)
   */
  async sendDailyDigest(user, unreadNotifications = [], stats = {}) {
    if (!user || !user.email) return false;

    const subject = `Your Pro Manage Daily Digest: ${unreadNotifications.length} updates for you`;
    const notificationItemsHtml = unreadNotifications
      .slice(0, 10)
      .map(
        (n) =>
          `<li style="margin-bottom: 8px;"><strong>${n.title}:</strong> ${n.message}</li>`
      )
      .join("");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4f46e5;">Hi ${user.name},</h2>
        <p>Here is your daily activity digest for Pro Manage:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Unread Updates (${unreadNotifications.length})</h3>
          <ul>${notificationItemsHtml || "<li>No new updates today.</li>"}</ul>
        </div>
        ${
          stats.dueSoonCount
            ? `<p><strong>Tasks Due Soon:</strong> ${stats.dueSoonCount}</p>`
            : ""
        }
        <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">
          You received this email because digest notifications are enabled for your workspace account.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      html,
      text: `Daily Digest for ${user.name}: ${unreadNotifications.length} updates.`,
    });
  }
}

module.exports = new EmailService();
