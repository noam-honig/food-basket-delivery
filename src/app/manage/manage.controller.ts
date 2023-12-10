import { SendSmsUtils } from '../asign-family/send-sms-action'
import { ApplicationSettings } from './ApplicationSettings'

import {
  BackendMethod,
  ProgressListener,
  Controller,
  SqlDatabase,
  FieldMetadata,
  ControllerBase,
  remult
} from 'remult'

import { Roles } from '../auth/roles'

import { Families } from '../families/families'
import { getDb, SqlBuilder, SqlFor } from '../model-shared/SqlBuilder'

import { FamilyDeliveries } from '../families/FamilyDeliveries'
import { FamilyStatus } from '../families/FamilyStatus'

import { GroupsValue } from './groups'
import { EmailSvc } from '../shared/utils'
import { Field } from '../translate'
import { Phone } from '../model-shared/phone'
import { DeliveryImage, FamilyImage } from '../families/DeiveryImages'
import { ChangeLog } from '../change-log/change-log'

export class ManageController {
  @BackendMethod({ allowed: Roles.admin })
  static async TestSendEmail(to: string, text: string) {
    return await EmailSvc.sendMail('test email', text, to)
  }
  @BackendMethod({ allowed: Roles.admin })
  static async sendTestVolunteerRegistrationNotification() {
    const subject = 'test'
    const message = 'test'
    return ManageController.sendEmailFromHagaiAdmin(subject, message)
  }
  static async sendEmailFromHagaiAdmin(subject: string, message: string) {
    let settings = await ApplicationSettings.getAsync()
    const email = settings.emailForVolunteerRegistrationNotification
    if (!email || !email.includes('@')) return 'Invalid email'

    var nodemailer = await import('nodemailer')
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NOTIFICATION_EMAIL,
        pass: process.env.NOTIFICATION_EMAIL_PASSWORD
      }
    })

    message =
      "<html><body style='white-space: pre-line;' " +
      (settings.forWho.args.leftToRight ? '' : 'dir=rtl') +
      '>' +
      message +
      '</body></html>'

    var mailOptions = {
      from: process.env.NOTIFICATION_EMAIL,
      to: email,
      subject: subject,
      html: message
    }
    try {
      return await new Promise((res, rej) => {
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            rej(error)
          } else {
            console.log(remult.context.getSite() + '/email sent to: ' + email)
            res('Email sent:')
          }
        })
      })
    } catch (err) {
      console.log(err)
      return err.message
    }
  }

  @BackendMethod({ allowed: Roles.admin, queue: true })
  static async deleteFamiliesOnServer(progress?: ProgressListener) {
    let i = 0
    for await (const f of remult.repo(Families).query({
      where: { status: FamilyStatus.ToDelete },
      orderBy: { createDate: 'desc' },
      progress
    })) {
      await ManageController.clearDataFromFamilyDeliveries(f.id)
      await f.delete()
      i++
    }
    return i
  }

  static async clearDataFromFamilyDeliveries(familyId: string) {
    var db = getDb()
    const sql = new SqlBuilder()
    const fd = await SqlFor(remult.repo(FamilyDeliveries))
    const fdi = await SqlFor(remult.repo(DeliveryImage))
    const fi = await SqlFor(remult.repo(FamilyImage))
    await db.execute(
      await sql.delete(
        fdi,
        sql.build(
          fdi.deliveryId,
          sql.func(
            ' in',
            sql.query({
              from: fd,
              select: () => [fd.id],
              where: () => [fd.where({ family: familyId })]
            })
          )
        )
      )
    )
    await db.execute(await sql.delete(fi, fi.where({ familyId })))
    const changeLog = await SqlFor(remult.repo(ChangeLog))
    await db.execute(
      await sql.delete(changeLog, changeLog.where({ relatedId: familyId }))
    )

    const set: [FieldMetadata, any][] = []
    const fieldsToKeep: select<FamilyDeliveries> = {
      id: true,
      family: true
    }
    for (const field of fd.metadata.fields) {
      if (
        (field.valueType == String ||
          field.valueType == Phone ||
          field.valueType == GroupsValue) &&
        !fieldsToKeep[field.key] &&
        !field.dbReadOnly &&
        !field.options.sqlExpression
      ) {
        set.push([field, "''"])
      } else {
        //        console.log(field.key);
      }
    }
    await db.execute(
      await sql.update(fd, {
        set: () => set,
        where: () => [fd.where({ family: familyId })]
      })
    )
  }
}
declare type select<T> = { [Properties in keyof Partial<T>]?: boolean }

@Controller('sendTestSms')
export class SendTestSms extends ControllerBase {
  @Field({ translation: (l) => l.phone })
  phone: string
  @Field({ translation: (l) => l.customSmsMessage })
  message: string
  @BackendMethod({ allowed: Roles.admin })
  async sendTestMessage(forFamily?: boolean) {
    let settings = await ApplicationSettings.getAsync()
    if (!settings.bulkSmsEnabled && !remult.isAllowed(Roles.superAdmin))
      throw 'can only use this with bulk sms enabled'
    return await new SendSmsUtils().sendSms(
      this.phone,
      this.message,
      undefined,
      {
        familyId: forFamily ? 'testFamily' : undefined
      }
    )
  }
}
