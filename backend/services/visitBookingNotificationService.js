/**
 * Visit Booking Notification Service
 * Handles email and SMS notifications for visit bookings
 * 
 * TODO: Integrate with email service (Resend, SendGrid, etc.)
 * TODO: Integrate with SMS service (Twilio, Semaphore, etc.)
 */

/**
 * Send booking confirmation to visitor
 * @param {Object} booking - The booking data
 */
exports.sendBookingConfirmation = async (booking) => {
  try {
    // TODO: Implement email sending
    console.log('📧 Sending confirmation email to:', booking.contact_email);
    
    const emailContent = {
      to: booking.contact_email,
      subject: 'Visit Booking Confirmation - Museo',
      html: generateConfirmationEmail(booking)
    };

    // TODO: Send email using your email service
    // await emailService.send(emailContent);

    // TODO: Implement SMS sending (optional)
    if (booking.contact_phone) {
      console.log('📱 Sending confirmation SMS to:', booking.contact_phone);
      
      const smsContent = {
        to: booking.contact_phone,
        message: `Thank you for booking a visit to Museo! Your booking ID: ${booking.id}. We will contact you within 24 hours to confirm your visit on ${booking.preferred_date}.`
      };

      // TODO: Send SMS using your SMS service
      // await smsService.send(smsContent);
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending booking confirmation:', error);
    return { success: false, error };
  }
};

/**
 * Send status update notification to visitor
 * @param {Object} booking - The booking data
 */
exports.sendStatusUpdateNotification = async (booking) => {
  try {
    const statusMessages = {
      approved: 'Your visit booking has been approved!',
      rejected: 'Unfortunately, your visit booking has been declined.',
      completed: 'Thank you for visiting Museo!',
      cancelled: 'Your visit booking has been cancelled.'
    };

    console.log('📧 Sending status update email to:', booking.contact_email);
    
    const emailContent = {
      to: booking.contact_email,
      subject: `Visit Booking ${booking.status.toUpperCase()} - Museo`,
      html: generateStatusUpdateEmail(booking, statusMessages[booking.status])
    };

    // TODO: Send email
    // await emailService.send(emailContent);

    // TODO: Send SMS (optional)
    if (booking.contact_phone) {
      console.log('📱 Sending status update SMS to:', booking.contact_phone);
      
      const smsContent = {
        to: booking.contact_phone,
        message: `Museo: ${statusMessages[booking.status]} Booking ID: ${booking.id}. Visit date: ${booking.preferred_date}.`
      };

      // TODO: Send SMS
      // await smsService.send(smsContent);
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending status update:', error);
    return { success: false, error };
  }
};

/**
 * Send reminder notification (1 day before visit)
 * @param {Object} booking - The booking data
 */
exports.sendVisitReminder = async (booking) => {
  try {
    console.log('📧 Sending visit reminder to:', booking.contact_email);
    
    const emailContent = {
      to: booking.contact_email,
      subject: 'Reminder: Your Visit to Museo Tomorrow',
      html: generateReminderEmail(booking)
    };

    // TODO: Send email
    // await emailService.send(emailContent);

    // TODO: Send SMS (optional)
    if (booking.contact_phone) {
      console.log('📱 Sending visit reminder SMS to:', booking.contact_phone);
      
      const smsContent = {
        to: booking.contact_phone,
        message: `Reminder: Your visit to Museo is tomorrow (${booking.preferred_date}). We look forward to seeing you!`
      };

      // TODO: Send SMS
      // await smsService.send(smsContent);
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending reminder:', error);
    return { success: false, error };
  }
};

/**
 * Send notification to admin about new booking
 * @param {Object} booking - The booking data
 */
exports.notifyAdminNewBooking = async (booking) => {
  try {
    // TODO: Get admin emails from database or config
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@museo.com';

    console.log('📧 Notifying admin about new booking:', booking.id);
    
    const emailContent = {
      to: adminEmail,
      subject: `New Visit Booking - ${booking.visitor_type}`,
      html: generateAdminNotificationEmail(booking)
    };

    // TODO: Send email
    // await emailService.send(emailContent);

    return { success: true };
  } catch (error) {
    console.error('Error notifying admin:', error);
    return { success: false, error };
  }
};

// ============================================
// EMAIL TEMPLATES
// ============================================

function generateConfirmationEmail(booking) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6e4a2e; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8f5f0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { background: #d4b48a; color: #6e4a2e; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #d4b48a; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏛️ Museo Visit Booking</h1>
        </div>
        <div class="content">
          <h2>Thank you for your booking!</h2>
          <p>Dear ${booking.contact_name},</p>
          <p>We have received your visit booking request. Our team will review it and contact you within 24 hours.</p>
          
          <div class="info-box">
            <h3>Booking Details</h3>
            <p><strong>Booking ID:</strong> ${booking.id}</p>
            <p><strong>Visitor Type:</strong> ${booking.visitor_type}</p>
            ${booking.organization_name ? `<p><strong>Organization:</strong> ${booking.organization_name}</p>` : ''}
            <p><strong>Number of Visitors:</strong> ${booking.number_of_visitors}</p>
            <p><strong>Preferred Date:</strong> ${booking.preferred_date}</p>
            ${booking.preferred_time ? `<p><strong>Preferred Time:</strong> ${booking.preferred_time}</p>` : ''}
            <p><strong>Purpose:</strong> ${booking.purpose_of_visit}</p>
            <p><strong>Status:</strong> <span style="color: #d4b48a; font-weight: bold;">PENDING</span></p>
          </div>

          <p>If you have any questions, please contact us at:</p>
          <p>📧 Email: info@museo.com<br>
          📞 Phone: (123) 456-7890</p>
        </div>
        <div class="footer">
          <p>© 2025 Museo. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateStatusUpdateEmail(booking, message) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6e4a2e; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8f5f0; }
        .status-approved { color: #4caf50; font-weight: bold; }
        .status-rejected { color: #f44336; font-weight: bold; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #d4b48a; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏛️ Booking Status Update</h1>
        </div>
        <div class="content">
          <h2>${message}</h2>
          <p>Dear ${booking.contact_name},</p>
          
          <div class="info-box">
            <p><strong>Booking ID:</strong> ${booking.id}</p>
            <p><strong>Visit Date:</strong> ${booking.preferred_date}</p>
            <p><strong>Status:</strong> <span class="status-${booking.status}">${booking.status.toUpperCase()}</span></p>
            ${booking.admin_notes ? `<p><strong>Notes:</strong> ${booking.admin_notes}</p>` : ''}
          </div>

          ${booking.status === 'approved' ? `
            <p>We look forward to welcoming you to Museo!</p>
            <p><strong>What to bring:</strong></p>
            <ul>
              <li>Valid ID</li>
              <li>This confirmation email</li>
            </ul>
          ` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateReminderEmail(booking) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6e4a2e; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8f5f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏛️ Visit Reminder</h1>
        </div>
        <div class="content">
          <h2>Your visit is tomorrow!</h2>
          <p>Dear ${booking.contact_name},</p>
          <p>This is a friendly reminder that your visit to Museo is scheduled for tomorrow, ${booking.preferred_date}.</p>
          <p>We look forward to seeing you!</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateAdminNotificationEmail(booking) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .info-box { background: #f8f5f0; padding: 15px; margin: 10px 0; border-left: 4px solid #d4b48a; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>🔔 New Visit Booking Received</h2>
        
        <div class="info-box">
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Visitor Type:</strong> ${booking.visitor_type}</p>
          ${booking.organization_name ? `<p><strong>Organization:</strong> ${booking.organization_name}</p>` : ''}
          <p><strong>Number of Visitors:</strong> ${booking.number_of_visitors}</p>
          <p><strong>Contact:</strong> ${booking.contact_name}</p>
          <p><strong>Email:</strong> ${booking.contact_email}</p>
          <p><strong>Phone:</strong> ${booking.contact_phone}</p>
          <p><strong>Preferred Date:</strong> ${booking.preferred_date}</p>
          <p><strong>Purpose:</strong> ${booking.purpose_of_visit}</p>
        </div>

        <p><a href="${process.env.ADMIN_DASHBOARD_URL}/visit-bookings/${booking.id}">View in Admin Dashboard</a></p>
      </div>
    </body>
    </html>
  `;
}
