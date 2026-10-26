const nodemailer = require('nodemailer');

const sendInvoiceEmail = async (order, customerEmail) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.MAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.productName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.lineTotal}</td>
      </tr>
    `).join('');

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0284c7; text-align: center;">Bluely E-Commerce Invoice</h2>
        <p><strong>Order ID:</strong> #${order.orderNo}</p>
        <p><strong>Customer:</strong> ${order.customerName}</p>
        <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="padding: 8px; text-align: left;">Item</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Price</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
        <div style="text-align: right; font-size: 14px;">
          <p>Subtotal: ₹${order.subtotal}</p>
          <p>GST (18%): ₹${order.tax}</p>
          <h3>Grand Total: ₹${order.totalAmount}</h3>
        </div>
        <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 30px;">Thank you for shopping with Bluely!</p>
      </div>
    `;

    // 1. Send to Admin (`mounttowntech@gmail.com`)
    await transporter.sendMail({
      from: `"Bluely Admin" <${process.env.MAIL_USER}>`,
      to: process.env.MAIL_USER,
      subject: `New POS Order Invoice - #${order.orderNo}`,
      html: emailHtml,
    });

    // 2. Send to Customer if valid email provided
    if (customerEmail && customerEmail.includes('@')) {
      await transporter.sendMail({
        from: `"Bluely E-Commerce" <${process.env.MAIL_USER}>`,
        to: customerEmail,
        subject: `Your Purchase Invoice - #${order.orderNo}`,
        html: emailHtml,
      });
    }
  } catch (error) {
    console.error("Error sending invoice email:", error);
  }
};

module.exports = sendInvoiceEmail;