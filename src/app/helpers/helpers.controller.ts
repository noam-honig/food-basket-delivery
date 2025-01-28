import { Helpers } from './helpers'

import { BackendMethod, remult, repo } from 'remult'

import { Roles } from '../auth/roles'
import { ApplicationSettings } from '../manage/ApplicationSettings'

import { Sites } from '../sites/sites'
import { SendSmsUtils } from '../asign-family/send-sms-action'

import { getLang } from '../sites/sites'
import { HelperBasketTypes } from '../helper-register/HelperBasketTypes'
import { BasketType } from '../families/BasketType'

export class HelpersController {
  @BackendMethod({ allowed: Roles.admin })
  static async resetPassword(helperId: string) {
    await remult
      .repo(Helpers)
      .query({ where: { id: helperId } })
      .forEach(async (h) => {
        h.realStoredPassword = ''
        await h.save()
      })
  }
  @BackendMethod({ allowed: Roles.admin })
  static async invalidatePassword(helperId: string) {
    await remult
      .repo(Helpers)
      .query({ where: { id: helperId } })
      .forEach(async (h) => {
        h.passwordChangeDate = new Date(1901, 1, 1)
        await h.save()
      })
  }

  @BackendMethod({ allowed: Roles.distCenterAdmin })
  static async sendInvite(helperId: string) {
    let h = await remult.repo(Helpers).findId(helperId)
    if (!h) return getLang().unfitForInvite
    if (!(h.admin || h.distCenterAdmin)) return getLang().unfitForInvite
    let url =
      remult.context.getOrigin() +
      '/' +
      Sites.getOrganizationFromContext() +
      '/login'
    let s = await ApplicationSettings.getAsync()
    let hasPassword = h.password && h.password.length > 0
    let message =
      getLang().hello +
      ` ${h.name}
  ` +
      getLang().welcomeTo +
      ` ${s.organisationName}.
  ` +
      getLang().pleaseEnterUsing +
      `
  ${url}
  `
    if (!hasPassword) {
      message += getLang().enterFirstTime
    }
    await new SendSmsUtils().sendSms(h.phone.thePhone, message, h)
    return getLang().inviteSentSuccesfully
  }

  @BackendMethod({ allowed: Roles.admin })
  static async clearCommentsOnServer() {
    for await (const h of remult
      .repo(Helpers)
      .query({ where: { eventComment: { '!=': '' } } })) {
      h.eventComment = ''
      await h.save()
    }
  }

  @BackendMethod({ allowed: Roles.admin })
  static async clearEscortsOnServer() {
    for await (const h of remult.repo(Helpers).query()) {
      h.escort = null
      h.needEscort = false
      h.theHelperIAmEscorting = null
      await h.save()
    }
  }

  @BackendMethod({ allowed: true })
  static async saveHelper(
    helperData: any,
    basketTypes?: {
      id: string
      name: string
      intakeCommentInstructions: string
    }[]
  ) {
    try {
      const helper = await remult.repo(Helpers).findFirst(
        { phone: helperData.phone },
        {
          createIfNotFound: true
        }
      )

      if (helper.isNew()) {
        await helper
          .assign({
            name: helperData.name,
            phone: helperData.phone,
            email: helperData.email,
            socialSecurityNumber: helperData.socialSecurityNumber
          })
          .save()
      }

      if (basketTypes.length) {
        for (const basket of basketTypes) {
          const basketType = await repo(BasketType).findId(basket.id)

          if (basketType) {
            try {
              await repo(HelperBasketTypes).insert({
                helperId: helper.id,
                basketType: basketType
              })
            } catch (err) {}
          }
        }
      }
      return true
    } catch (err) {
      console.log(err)

      return false
    }
  }
}
