//import('nodemailer');
import { EmailSvc } from '../shared/utils';

EmailSvc.sendMail = async (subject: string, message: string, email: string) => {
    var nodemailer = await import('nodemailer');

    var transporter = nodemailer.createTransport({
        service: 'gmail',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
            user: 'hello@mitchashvim.org.il',
            pass: 'TAnwd1234'
        }
    });

    var mailOptions = {
        from: 'hello@mitchashvim.org.il',
        to: email,
        subject: subject,
        html: message
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
    return null;
}
