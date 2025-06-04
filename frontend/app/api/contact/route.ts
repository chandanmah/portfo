import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getContactData } from '@/lib/fileStorage';

async function getEmailRouting(): Promise<string> {
  try {
    const contactData = await getContactData();
    return contactData.emailRouting || 'contact@mrmahanta.com';
  } catch (error) {
    // If file doesn't exist, return default email
    return 'contact@mrmahanta.com';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    // Get the current email routing setting
    const routingEmail = await getEmailRouting();

    // Create transporter (you'll need to configure this with your email service)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Email content
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: routingEmail,
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><em>This message was sent from the contact form on your portfolio website.</em></p>
      `,
      replyTo: email,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { message: 'Failed to send message. Please try again later.' },
      { status: 500 }
    );
  }
}