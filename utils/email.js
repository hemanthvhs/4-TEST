const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.from = `<Hemanth Vennelakanti ${process.env.EMAIL_FROM}>`;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'hemanthvennelakanti@gmail.com',
          pass: 'hemu@1996',
        },
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(template, subject) {
    // 1) CREATE THE HTML TEMPLATE
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject,
      }
    );

    // 2) CONFIGURE OPTIONS
    const mailOptions = {
      from: 'hemanthskn@gmail.com',
      to: this.to,
      subject,
      html,
      text: htmlToText.convert(html), // Sometimes user prefer to load only text but not to see the html. For that we need to strip all the html elements & keep the data. For that we use the package html-to-text
    };

    // 3) CREATING THE TRANSPORT & SENDING EMAIL BY PASSING THE MAIL OPTIONS
    await this.newTransport().sendMail(mailOptions); // NOTE HERE: THE METHOD IS sendMail() but not sendEmail()
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for 10 minutes only)'
    );
  }
};
