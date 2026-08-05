import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (config.smtp?.host && config.smtp?.user) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port || 587,
      secure: config.smtp.secure === true,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
    logger.info('Email transporter configured (SMTP)');
  } else {
    // Dev fallback – log only, never throws
    transporter = {
      sendMail: async (opts) => {
        logger.info('[EMAIL-DEV] Would send email', {
          to: opts.to,
          subject: opts.subject,
          text: (opts.text || '').slice(0, 200),
        });
        return { messageId: `dev-${Date.now()}` };
      },
    };
    logger.warn('SMTP not configured – emails logged to console only');
  }
  return transporter;
}

/**
 * Send email – non-fatal on failure
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) return null;
  try {
    const info = await getTransporter().sendMail({
      from: config.smtp?.from || 'MaintainIQ <noreply@maintainiq.local>',
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`,
    });
    return info;
  } catch (err) {
    logger.error('Email send failed', { error: err.message, to });
    return null;
  }
};

export const sendNotificationEmail = async (user, { title, message, link }) => {
  if (!user?.email) return null;
  const prefs = user.notificationPreferences || {};
  if (prefs.emailEnabled === false) return null;

  const appUrl = config.clientUrl || 'http://localhost:5173';
  const fullLink = link ? `${appUrl}${link.startsWith('/') ? link : `/${link}`}` : appUrl;

  return sendEmail({
    to: user.email,
    subject: `[MaintainIQ] ${title}`,
    text: `${message}\n\nOpen: ${fullLink}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px">
        <h2 style="color:#0f766e">MaintainIQ</h2>
        <p><strong>${title}</strong></p>
        <p>${message}</p>
        <p><a href="${fullLink}" style="color:#0f766e">Open in app</a></p>
      </div>
    `,
  });
};
