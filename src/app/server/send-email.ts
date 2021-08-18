//import('nodemailer');
import { EmailSvc } from '../shared/utils';
import { Remult } from 'remult';
import { ApplicationSettings } from '../manage/ApplicationSettings'

EmailSvc.sendMail = async (subject: string, message: string, email: string, context: Remult) => {
    let settings = await ApplicationSettings.getAsync(context);
    if (!settings.isSytemForMlt())
        return;
    if (!email || !email.includes('@'))
        return;
    var nodemailer = await import('nodemailer');
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
            user: settings.gmailUserName,
            pass: settings.gmailPassword
        }
    });

    var mailOptions = {
        from: 'hello@mitchashvim.org.il',
        to: email,
        subject: subject,
        html: message
    };
    new Promise((res, rej) => {
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                rej(error);
            } else {
                res(true);
                console.log('Email sent: ' + info.response);
            }
        });
    });
    return true;

}
