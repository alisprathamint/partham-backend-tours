import { getContactTransporter } from '../../../config/email.js';
import {
  generateAdminContactEmailHTML,
  generateCustomerContactEmailHTML
} from '../../../utils/emailTemplates.js';
import prisma from '../../../config/prisma.js';
import { broadcast } from '../../../utils/wsManager.js';

export const handleContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !phone || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Save as a Lead in database
    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone,
        destination: subject,
        source: 'WEBSITE',
        status: 'NEW',
        type: 'LEAD',
        notes: {
          create: {
            content: `Contact Form Message: ${message}`,
            createdBy: 0
          }
        }
      }
    });

    // Real-time broadcast to admin panel
    broadcast('lead_updated', { action: 'create', leadId: lead.id });

    const { transporter: activeTransporter, from: fromEmail } = getContactTransporter();

    const adminEmailHtml = generateAdminContactEmailHTML(name, email, phone, subject, message);

    const adminMailOptions = {
      from: fromEmail,
      to: "contact.us.pratham-tours@gmail.com",
      subject: `New Contact Inquiry: ${subject}`,
      html: adminEmailHtml,
    };

    const customerEmailHtml = generateCustomerContactEmailHTML(name, subject, message);

    const customerMailOptions = {
      from: fromEmail,
      to: email,
      subject: `Thanks for contacting Pratham Tours: ${subject}`,
      html: customerEmailHtml,
    };

    await activeTransporter.sendMail(adminMailOptions);
    console.log(`[Contact] Inquiry notification sent to contact.us.pratham-tours@gmail.com`);

    try {
      await activeTransporter.sendMail(customerMailOptions);
      console.log(`[Contact] Confirmation email sent to customer: ${email}`);
    } catch (custError) {
      console.error(`[Contact] Error sending confirmation email to customer:`, custError);
    }

    res.status(200).json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("[Contact] Error handling contact form:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
};
