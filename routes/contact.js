const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

router.post('/', async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Configure Nodemailer transporter
//   const transporter = nodemailer.createTransport({
//     service: 'gmail', // Use your email service (e.g., Gmail, Outlook)
//     auth: {
//       user: 'your_email@gmail.com', // Replace with your email
//       pass: 'your_email_password', // Replace with your email password or app password
//     },
//   });
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      // from where you want to send msg. make the password in gmail app
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  const mailOptions = {
    from: email,
    to: 'shahfaisalkhan1993@gmail.com', // Replace with the email where you want to receive messages
    subject: `Contact Form: ${subject}`,
    text: `You received a new message from ${name} (${email}):\n\n${message}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
});

module.exports = router;
