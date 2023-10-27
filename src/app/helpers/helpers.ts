import {
  remult,
  IdEntity,
  UserInfo,
  Filter,
  Entity,
  BackendMethod,
  FieldOptions,
  Validators,
  FieldRef,
  FieldMetadata,
  FieldsMetadata,
  Allow,
  isBackend,
  SqlDatabase,
  Fields as remultFields,
  ValueConverters
} from 'remult'
import {
  DataControl,
  DataControlSettings,
  GridSettings,
  InputField
} from '../common-ui-elements/interfaces'
import {
  DateTimeColumn,
  logChanges,
  ChangeDateColumn,
  Email
} from '../model-shared/types'
import { SqlBuilder, SqlFor } from '../model-shared/SqlBuilder'
import { isPhoneValidForIsrael, Phone } from '../model-shared/phone'

import { Roles } from '../auth/roles'

import { getLang } from '../sites/sites'
import { AddressHelper, Location } from '../shared/googleApiHelpers'
import { routeStats } from '../asign-family/route-strategy'
import { ApplicationSettings, getSettings } from '../manage/ApplicationSettings'

import { FamilyStatus } from '../families/FamilyStatus'

import { use, Field, FieldType, Fields } from '../translate'
import { DistributionCenters } from '../manage/distribution-centers'

import { EntityFilter } from 'remult'
import { UITools } from './init-context'
import { recordChanges } from '../change-log/change-log'
import { GroupsValue } from '../manage/groups'
import { ValueConverter } from '@angular/compiler/src/render3/view/template'

export function CompanyColumn<entityType = any>(
  settings?: FieldOptions<entityType, string>
) {
  return (target, key) => {
    DataControl<any, string>({
      width: '300'
    })(target, key)

    return Field<entityType, string>({
      clickWithTools: (e, col, ui) => ui.selectCompany((x) => (col.value = x)),
      translation: (l) => l.company,
      ...settings
    })(target, key)
  }
}

@FieldType<HelpersBase>({
  displayValue: (e, x) => (x ? x.name : ''),
  translation: (l) => l.volunteer,
  valueConverter: {
    toJson: (x) => (x != undefined ? x : ''),
    fromJson: (x) => (x ? x : null)
  },
  clickWithTools: async (e, col, ui) =>
    ui.selectHelper({
      onSelect: (s) => (col.value = s)
    })
})
@DataControl<any, Helpers>({
  getValue: (e, val) => (val.value ? val.value.name : ''),
  hideDataOnInput: true
})
@Entity<HelpersBase>('HelpersBase', {
  dbName: 'Helpers',
  allowApiCrud: false,
  allowApiRead: Allow.authenticated,
  apiPrefilter: () => ({
    id: !remult.authenticated()
      ? []
      : remult.isAllowed([Roles.admin, Roles.distCenterAdmin, Roles.lab])
      ? undefined
      : [remult.user?.id, remult.user?.theHelperIAmEscortingId]
  })
})
export class HelpersBase extends IdEntity {
  getHelper(): Promise<Helpers> {
    return remult.repo(Helpers).findId(this.id)
  }
  isCurrentUser(): boolean {
    return this.id == remult.user.id
  }

  @Field<HelpersBase>({
    translation: (l) => l.volunteerName,
    validate: (h) => {
      if (!h.name) h.$.name.error = getLang().nameIsTooShort
    }
  })
  name: string

  @Field({ translation: (l) => l.phone })
  phone: Phone
  @DateTimeColumn({ translation: (l) => l.smsDate })
  smsDate: Date

  @Field()
  doNotSendSms: boolean = false
  @CompanyColumn()
  company: string
  @Fields.integer({ allowApiUpdate: Roles.distCenterAdmin })
  totalKm: number
  @Fields.integer({ allowApiUpdate: Roles.distCenterAdmin })
  totalTime: number
  @Field({ includeInApi: Roles.distCenterAdmin })
  shortUrlKey: string

  @Field({ allowApiUpdate: Roles.admin })
  distributionCenter: DistributionCenters

  @Field({
    translation: (l) => l.helperComment,
    allowApiUpdate: Roles.admin,
    customInput: (c) => c.textArea()
  })
  eventComment: string

  @Field({
    allowApiUpdate: Roles.admin
  })
  needEscort: boolean

  @Field({
    translation: (l) => l.assignedDriver,
    allowApiUpdate: Roles.admin,
    lazy: true
  })
  theHelperIAmEscorting: HelpersBase

  @Field({
    translation: (l) => l.escort,
    allowApiUpdate: Roles.admin,
    lazy: true
  })
  escort: HelpersBase

  @Field({
    translation: (l) => l.leadHelper,
    allowApiUpdate: Roles.admin,
    lazy: true
  })
  leadHelper: HelpersBase
  @Field({
    allowApiUpdate: Roles.admin,
    includeInApi: Roles.admin,
    translation: (l) => l.myGiftsURL
  })
  myGiftsURL: string
  @Field({
    allowApiUpdate: Roles.admin,
    includeInApi: Roles.admin
  })
  archive: boolean

  @Field({
    allowApiUpdate: Allow.authenticated,
    includeInApi: Allow.authenticated
  })
  @Fields.dateOnly()
  frozenTill: Date
  @Field({
    allowApiUpdate: Roles.admin,
    includeInApi: Roles.admin,
    translation: (l) => l.helperInternalComment
  })
  internalComment: string
  @remultFields.object<Helpers, string[]>({
    valueConverter: {
      fieldTypeInDb: 'json',
      toDb: ValueConverters.JsonString.toDb,
      fromDb: (x) => (!x ? [] : x)
    }
  })
  blockedFamilies: string[]
  @Field<Helpers>({
    sqlExpression: async (selfDefs) => {
      let sql = new SqlBuilder()
      let self = SqlFor(selfDefs)
      return sql.case(
        [
          {
            when: [
              sql.or(
                sql.build(self.frozenTill, ' is null'),
                self.where({ frozenTill: { '<=': new Date() } })
              )
            ],
            then: false
          }
        ],
        true
      )
    }
  })
  isFrozen: boolean

  static active: EntityFilter<HelpersBase> = {
    archive: false
  }
  async deactivate() {
    this.archive = true
    this.save()
  }

  async reactivate() {
    this.archive = false
    this.save()
  }

  getRouteStats(): routeStats {
    return {
      totalKm: this.totalKm,
      totalTime: this.totalTime
    }
  }
}

@Entity<Helpers>('Helpers', {
  allowApiRead: Allow.authenticated,
  allowApiDelete: false,
  allowApiUpdate: Allow.authenticated,
  allowApiInsert: true,
  saving: async (self) => {
    if (self._disableOnSavingRow) return
    if (self.escort) {
      if (self.escort.id == self.id) self.escort = null
    }

    if (isBackend()) {
      let canUpdate = false
      if (self.isNew()) canUpdate = true
      else {
        let updatingMyOwnHelperInfo = self.$.id.originalValue == remult.user.id
        if (updatingMyOwnHelperInfo) {
          if (
            !self.$.admin.originalValue &&
            !self.$.distCenterAdmin.originalValue
          )
            canUpdate = true
          if (
            self.$.admin.originalValue &&
            remult.isAllowed([Roles.admin, Roles.overview])
          )
            canUpdate = true
          if (
            self.$.distCenterAdmin.originalValue &&
            remult.isAllowed(Roles.distCenterAdmin)
          )
            canUpdate = true
          if (!self.realStoredPassword && self.realStoredPassword.length == 0)
            //it's the first time I'm setting the password
            canUpdate = true
          if (
            [self.$.admin, self.$.distCenterAdmin, self.$.password].filter(
              (x) => x.valueChanged()
            ).length == 0
          )
            canUpdate = true
        } else {
          if (remult.isAllowed(Roles.admin)) canUpdate = true

          if (remult.isAllowed(Roles.distCenterAdmin)) {
            if (
              !self.$.admin.originalValue &&
              !self.$.distCenterAdmin.originalValue
            ) {
              canUpdate = true
              if (self.distCenterAdmin) {
                self.distributionCenter =
                  await remult.context.getUserDistributionCenter()
              }
            }
            if (
              self.$.distCenterAdmin.originalValue &&
              self.$.distributionCenter.originalValue &&
              self.$.distributionCenter.originalValue.matchesCurrentUser()
            )
              canUpdate = true
            if (self.$.distCenterAdmin.originalValue || self.admin) {
              if (!canUpdate)
                canUpdate =
                  [
                    self.$.name,
                    self.$.phone,
                    self.$.password,
                    self.$.distCenterAdmin,
                    self.$.distributionCenter,
                    self.$.admin
                  ].filter((x) => x.valueChanged()).length == 0
            }
          }
        }
      }
      if (
        self.$.leadHelper.valueChanged() &&
        !self.$.leadHelper.valueIsNull()
      ) {
        if (
          self.leadHelper?.id == self.id ||
          self.leadHelper?.leadHelper?.id == self.id
        ) {
          self.$.leadHelper.error = getLang().invalidValue
          return
        }
      }

      if (!canUpdate) throw 'Not Allowed'
      if (
        self.password &&
        self.$.password.valueChanged() &&
        self.password != Helpers.emptyPassword
      ) {
        let password = self.$.password
        validatePasswordColumn(password)
        if (self.$.password.error) return
        //throw self.password.metadata.caption + " - " + self.password.validationError;
        self.realStoredPassword = await Helpers.generateHash(self.password)
        self.passwordChangeDate = new Date()
      }
      if (self.isNew() && (await remult.repo(Helpers).count()) == 0) {
        self.admin = true
      }
      self.phone = new Phone(Phone.fixPhoneInput(self.phone?.thePhone))
      if (!self._disableDuplicateCheck)
        await Validators.unique(
          self,
          self.$.phone,
          remult.context.lang?.alreadyExist
        )
      if (self.isNew()) self.createDate = new Date()
      self.veryUrlKeyAndReturnTrueIfSaveRequired()
      if (!self.needEscort) self.escort = null
      if (self.$.escort.valueChanged()) {
        let h = self.escort
        if (self.$.escort.originalValue) {
          self.$.escort.originalValue.theHelperIAmEscorting =
            await remult.context.getCurrentUser()
          await self.$.escort.originalValue.save()
        }
        if (self.escort) {
          h.theHelperIAmEscorting = self
          await h.save()
        }
      }
      await self.preferredDistributionAreaAddressHelper.updateApiResultIfChanged()
      await self.preferredFinishAddressHelper.updateApiResultIfChanged()

      logChanges(self._, remult, {
        excludeColumns: [
          self.$.smsDate,
          self.$.createDate,
          self.$.lastSignInDate,
          self.$.reminderSmsDate,
          self.$.totalKm,
          self.$.totalTime,
          self.$.allowedIds,
          self.$.addressApiResult,
          self.$.addressApiResult2,
          self.$.preferredDistributionAreaAddressCity,
          self.$.preferredFinishAddressCity,
          self.$.password,
          self.$.shortUrlKey,
          self.$.passwordChangeDate
        ],
        excludeValues: [self.$.realStoredPassword]
      })
      recordChanges(self, {
        excludeColumns: (f) => [
          f.smsDate,
          f.createDate,
          f.lastSignInDate,
          f.reminderSmsDate,
          f.totalKm,
          f.totalTime,
          f.allowedIds,
          f.addressApiResult,
          f.addressApiResult2,
          f.preferredDistributionAreaAddressCity,
          f.preferredFinishAddressCity,
          f.password,
          f.shortUrlKey,
          f.passwordChangeDate
        ],
        excludeValues: (f) => [f.realStoredPassword]
      })
    }
  },
  apiPrefilter: () => ({
    id: !remult.authenticated() ? [] : undefined,
    allowedIds: !remult.isAllowed([
      Roles.admin,
      Roles.distCenterAdmin,
      Roles.lab
    ])
      ? { $contains: remult.user?.id }
      : undefined
  })
})
export class Helpers extends HelpersBase {
  static async generateHash(password: string) {
    return await (await import('password-hash')).generate(password)
  }
  static async verifyHash(password: string, hash: string) {
    return (await import('password-hash')).verify(password, hash)
  }

  async getHelper(): Promise<Helpers> {
    return this
  }
  async displayEditDialog(ui: UITools, onSave?: VoidFunction) {
    let settings = await remult.context.getSettings()
    await ui.inputAreaDialog({
      title: this.isNew() ? settings.lang.newVolunteers : this.name,
      ok: async () => {
        await this.save()
        onSave?.()
      },
      validate: async () => {
        if (!this.phone) {
          this.phone = new Phone('')
        }
        this.$.phone.error = ''
        this.phone = new Phone(Phone.fixPhoneInput(this.phone.thePhone))
        Phone.validatePhone(this.$.phone, true)
        if (this.$.phone.error) throw this.$.phone.error
      },
      cancel: () => {
        this._.undoChanges()
      },
      fields: Helpers.selectColumns(this._.repository.metadata.fields).map(
        (map) => ({
          ...map,
          field: this.$.find(map.field ? (map.field as any) : map)
        })
      ),
      buttons: [
        {
          text: settings.lang.deliveries,
          click: () => this.showDeliveryHistory(ui)
        }
      ],
      menu: [
        {
          name: remult.context.lang.volunteerOpportunities,
          click: async () => {
            ui.gridDialog({
              settings: new GridSettings(
                remult.repo((await import('../events/events')).Event),
                {
                  knowTotalRows: true,
                  orderBy: {
                    eventDate: 'desc'
                  },
                  columnSettings: (e) => [e.name, e.eventDate, e.type],
                  where: {
                    id: (
                      await remult
                        .repo(
                          (
                            await import('../events/events')
                          ).volunteersInEvent
                        )
                        .find({
                          where: {
                            helper: this,
                            canceled: false
                          }
                        })
                    ).map((ve) => ve.eventId)
                  }
                }
              ),
              title:
                remult.context.lang.volunteerOpportunities + ' - ' + this.name
            })
          }
        },
        {
          name: remult.context.lang.smsMessages,
          click: async () => {
            this.smsMessages(ui)
          }
        },
        {
          name: 'משפחות חסומות',
          click: () => {
            ui.editBlockedFamilies(this)
          }
        }
      ]
    })
  }
  async addCommunicationHistoryDialog(
    ui: UITools,
    defaultMessage = '',
    onSave: VoidFunction = () => {}
  ) {
    let hist = remult
      .repo(
        (await import('../in-route-follow-up/in-route-helpers'))
          .HelperCommunicationHistory
      )
      .create({
        volunteer: this,
        message: defaultMessage
      })
    ui.inputAreaDialog({
      title: 'הוסף הערה לתכתובות של המתנדב',
      ok: async () => {
        await hist.save()
      },
      fields: [hist.$.message]
    })
  }
  static selectColumns(self: FieldsMetadata<Helpers>) {
    let settings = getSettings()
    let r: DataControlSettings<Helpers>[] = [
      {
        field: self.name,
        width: '150'
      },
      {
        field: self.phone,
        width: '150'
      }
    ]
    r.push({
      field: self.eventComment,
      width: '120'
    })

    if (remult.isAllowed(Roles.admin) && settings.isSytemForMlt) {
      r.push({
        field: self.isIndependent,
        width: '120'
      })
    }

    if (remult.isAllowed(Roles.admin)) {
      r.push({
        field: self.admin,
        width: '160'
      })
    }
    if (remult.isAllowed(Roles.distCenterAdmin)) {
      r.push({
        field: self.distCenterAdmin,
        width: '160'
      })
    }
    if (remult.isAllowed(Roles.familyAdmin)) {
      r.push({
        field: self.familyAdmin,
        width: '160'
      })
    }
    if (settings.usingCallModule && remult.isAllowed(Roles.admin)) {
      r.push({
        field: self.caller,
        width: '160'
      })
      r.push(self.callQuota, self.includeGroups, self.excludeGroups)
    }
    let hadCenter = false
    if (remult.isAllowed(Roles.lab) && settings.isSytemForMlt) {
      r.push({
        field: self.labAdmin,
        width: '120'
      })
      hadCenter = true
      r.push({
        field: self.distributionCenter,
        width: '150'
      })
    }

    r.push({
      field: self.preferredDistributionAreaAddress,
      width: '120'
    })
    r.push({
      field: self.preferredFinishAddress,
      width: '120'
    })
    r.push(self.createDate)

    if (remult.isAllowed(Roles.admin) && settings.isSytemForMlt) {
      r.push({
        field: self.frozenTill,
        width: '120'
      })
      r.push({
        field: self.internalComment,
        width: '120'
      })
    }

    if (remult.isAllowed(Roles.admin) && settings.isSytemForMlt) {
      r.push({
        field: self.referredBy,
        width: '120'
      })
    }

    r.push({
      field: self.company,
      width: '120'
    })

    if (remult.isAllowed(Roles.admin) && !hadCenter) {
      r.push(self.distributionCenter)
    }
    r.push(self.email)
    if (settings.manageEscorts) {
      r.push(self.escort, self.theHelperIAmEscorting, self.needEscort)
    }

    r.push({
      field: self.socialSecurityNumber,
      width: '80'
    })
    r.push(self.leadHelper)
    if (settings.bulkSmsEnabled) {
      r.push(self.doNotSendSms)
      r.push({
        field: self.frozenTill,
        width: '120'
      })
    }

    return r
  }

  userRequiresPassword() {
    return (
      this.admin ||
      this.distCenterAdmin ||
      this.labAdmin ||
      this.isIndependent ||
      (this.caller && getSettings().usingCallModule)
    )
  }
  async showDeliveryHistory(ui: UITools) {
    let ctx = remult.repo(
      (await import('../families/FamilyDeliveries')).FamilyDeliveries
    )
    const settings = new GridSettings(ctx, {
      numOfColumnsInGrid: 7,
      knowTotalRows: true,
      allowSelection: true,
      rowButtons: [
        {
          name: '',
          icon: 'edit',
          showInLine: true,
          click: async (fd) => {
            fd.showDetailsDialog({
              ui: ui
            })
          },
          textInMenu: () => use.language.deliveryDetails
        }
      ],
      gridButtons: [
        {
          name: use.language.updateDefaultVolunteer,
          visible: () => settings.selectedRows.length > 0,
          click: async () => {
            let deliveries: import('../families/FamilyDeliveries').FamilyDeliveries[] =
              settings.selectedRows
            await this.setAsDefaultVolunteerToDeliveries(deliveries, ui)
          }
        }
      ],
      rowCssClass: (fd) => fd.getCss(),
      columnSettings: (fd) => {
        let r: FieldMetadata[] = [
          fd.deliverStatus,
          fd.deliveryStatusDate,
          fd.basketType,
          fd.quantity,
          fd.name,
          fd.address,
          fd.courierComments,
          fd.distributionCenter
        ]
        r.push(
          ...[...fd]
            .filter((c) => !r.includes(c) && c != fd.id && c != fd.familySource)
            .sort((a, b) => a.caption.localeCompare(b.caption))
        )
        return r
      },

      where: { courier: this },
      orderBy: { deliveryStatusDate: 'desc' },
      rowsInPage: 25
    })
    ui.gridDialog({
      title: use.language.deliveriesFor + ' ' + this.name,
      stateName: 'deliveries-for-volunteer',
      settings
    })
  }

  static usingCompanyModule: boolean

  @Field<Helpers>({
    sqlExpression: async (selfDefs) => {
      let self = SqlFor(selfDefs)
      let sql = new SqlBuilder()
      return sql.build(
        self.id,
        ' || ',
        self.escort,
        ' || ',
        self.theHelperIAmEscorting
      )
    }
  })
  allowedIds: string

  _disableOnSavingRow = false
  _disableDuplicateCheck = false
  public static emptyPassword = 'password'

  @Field({ translation: (l) => l.phone, allowApiUpdate: isNotSmsSignIn })
  phone: Phone
  @ChangeDateColumn()
  lastSignInDate: Date
  @Field({
    dbName: 'password',
    includeInApi: false
  })
  realStoredPassword: string
  @Field({ translation: (l) => l.socialSecurityNumber })
  socialSecurityNumber: string
  @Field()
  email: Email
  @Field()
  addressApiResult: string
  @Field({ customInput: (i) => i.addressInput() })
  preferredDistributionAreaAddress: string
  preferredDistributionAreaAddressHelper = new AddressHelper(
    () => this.$.preferredDistributionAreaAddress,
    () => this.$.addressApiResult,
    () => this.$.preferredDistributionAreaAddressCity
  )
  @Field()
  preferredDistributionAreaAddressCity: string

  async setAsDefaultVolunteerToDeliveries(
    deliveries: import('../families/FamilyDeliveries').FamilyDeliveries[],
    ui: UITools
  ) {
    let ids: string[] = []
    let i = 0

    await ui.doWhileShowingBusy(async () => {
      for (const fd of deliveries) {
        if (ids.includes(fd.family)) continue
        ids.push(fd.family)
        i++
        let f = await remult
          .repo((await import('../families/families')).Families)
          .findId(fd.family)
        f.fixedCourier = fd.courier
        f.routeOrder = fd.routeOrder
        await f.save()
      }
    })

    let otherFamilies = await remult
      .repo((await import('../families/families')).Families)
      .find({
        where: {
          fixedCourier: this,
          status: FamilyStatus.Active,
          id: { $ne: ids }
        }
      })
    if (otherFamilies.length > 0) {
      if (
        await ui.YesNoPromise(
          use.language.thisVolunteerIsSetAsTheDefaultFor +
            ' ' +
            otherFamilies.length +
            ' ' +
            use.language.familiesDotCancelTheseAssignments
        )
      ) {
        for (const f of otherFamilies) {
          f.fixedCourier = null
          await f.save()
          i++
        }
      }
    }

    ui.Info(i + ' ' + use.language.familiesUpdated)
  }
  @BackendMethod({ allowed: true })
  async mltRegister() {
    if (!this.isNew()) throw 'מתנדב קיים'
    let error = false
    for (const col of [
      this.$.name,
      this.$.preferredDistributionAreaAddress,
      this.$.phone,
      this.$.socialSecurityNumber
    ]) {
      col.error = ''
      if (!col.value) {
        col.error = 'שדה חובה'
        error = true
      }
    }
    if (error) throw 'יש למלא שדות חובה' + '(שם, כתובת, טלפון ות.ז.)'
    if (!isPhoneValidForIsrael(this.phone.thePhone)) {
      this.$.phone.error = 'טלפון לא תקין'
      throw this.$.phone.error
    }
    let settings = await ApplicationSettings.getAsync()
    if (!settings.isSytemForMlt) throw 'Not Allowed'
    remult.user = {
      id: 'WIX',
      name: 'WIX',
      roles: [],
      distributionCenter: '',
      escortedHelperName: undefined,
      theHelperIAmEscortingId: undefined
    }
    await this.save()

    if (
      settings.registerHelperReplyEmailText &&
      settings.registerHelperReplyEmailText != ''
    ) {
      let message = (
        await import('../asign-family/send-sms-action')
      ).SendSmsAction.getMessage(
        settings.registerHelperReplyEmailText,
        settings.organisationName,
        '',
        this.name,
        remult.user.name,
        ''
      )

      try {
        await this.email.Send(settings.lang.thankYouForHelp, message)
      } catch (err) {
        console.error('send mail', err)
      }
    }
  }

  @Field()
  addressApiResult2: string
  @Field({
    dbName: 'preferredDistributionAreaAddress2',
    customInput: (i) => i.addressInput()
  })
  preferredFinishAddress: string
  preferredFinishAddressHelper = new AddressHelper(
    () => this.$.preferredFinishAddress,
    () => this.$.addressApiResult2,
    () => this.$.preferredFinishAddressCity
  )
  @Field()
  preferredFinishAddressCity: string

  @Field<Helpers>({
    inputType: 'password',
    allowApiUpdate: isNotSmsSignIn,
    serverExpression: (self) =>
      self.realStoredPassword ? Helpers.emptyPassword : ''
  })
  password: string
  @ChangeDateColumn()
  createDate: Date
  @ChangeDateColumn()
  passwordChangeDate: Date
  @ChangeDateColumn()
  EULASignDate: Date
  //    confidentialityConfirmDate = new changeDate();

  @DateTimeColumn({
    translation: (l) => l.remiderSmsDate
  })
  reminderSmsDate: Date
  @Field({ includeInApi: Roles.admin })
  referredBy: string
  @Field({
    allowApiUpdate: Roles.admin,
    includeInApi: Roles.admin,
    dbName: 'isAdmin'
  })
  admin: boolean
  @Field({
    translation: (l) => l.lab,
    allowApiUpdate: Roles.lab,
    includeInApi: Roles.lab
  })
  labAdmin: boolean
  @Field({
    translation: (l) => l.indie,
    allowApiUpdate: Roles.admin,
    includeInApi: Roles.admin
  })
  isIndependent: boolean

  @Field<Helpers>({
    translation: (l) => l.responsibleForAssign,
    allowApiUpdate: Roles.distCenterAdmin,
    includeInApi: Roles.distCenterAdmin,

    validate: (self) => {
      if (remult.isAllowed(Roles.admin) || !self._disableOnSavingRow) {
        return
      }
      if (self.$.distCenterAdmin)
        if (self.$.admin.originalValue) {
          self.$.distCenterAdmin.error =
            use.language.notAllowedToUpdateVolunteer
        } else if (
          self.distributionCenter &&
          !self.distributionCenter.matchesCurrentUser()
        ) {
          self.$.distributionCenter.error =
            use.language.notAllowedToUpdateVolunteer
        }
    }
  })
  distCenterAdmin: boolean
  @Field<Helpers>({
    allowApiUpdate: Roles.familyAdmin,
    includeInApi: Roles.familyAdmin,

    validate: (self) => {
      if (remult.isAllowed(Roles.admin) || !self._disableOnSavingRow) {
        return
      }
      if (self.$.distCenterAdmin || self.$.familyAdmin)
        if (self.$.admin.originalValue) {
          self.$.distCenterAdmin.error =
            use.language.notAllowedToUpdateVolunteer
        } else if (
          self.distributionCenter &&
          !self.distributionCenter.matchesCurrentUser()
        ) {
          self.$.distributionCenter.error =
            use.language.notAllowedToUpdateVolunteer
        }
    }
  })
  familyAdmin: boolean
  @Field({
    allowApiUpdate: Roles.admin,
    includeInApi: Roles.admin
  })
  caller: boolean

  @Field({ translation: (l) => l.includeGroups })
  @DataControl<Helpers>({ visible: (self) => self.caller })
  includeGroups: GroupsValue
  @Field({ translation: (l) => l.excludeGroups })
  @DataControl<Helpers>({ visible: (self) => self.caller })
  excludeGroups: GroupsValue
  @Fields.integer({ translation: (l) => l.callQuota })
  @DataControl<Helpers>({ visible: (self) => self.caller, width: '70' })
  callQuota: number

  static deliveredPreviously = Filter.createCustom<Helpers, { city: string }>(
    ({ city }) => {
      return SqlDatabase.rawFilter(async (c) => {
        let fd = SqlFor(
          remult.repo(
            (await import('../families/FamilyDeliveries')).FamilyDeliveries
          )
        )
        let helpers = SqlFor(remult.repo(Helpers))
        let sql = new SqlBuilder()
        c.sql = await sql.build(
          helpers.id,
          ' in (',
          sql.query({
            select: () => [sql.build('distinct ', fd.courier)],
            from: fd,
            where: () => [
              fd.where({
                archive: true,
                city: { $contains: city }
              })
            ]
          }),
          ')'
        )
      })
    }
  )

  veryUrlKeyAndReturnTrueIfSaveRequired() {
    if (!this.shortUrlKey || this.shortUrlKey.length < 10) {
      this.shortUrlKey = makeId()
      return true
    }
    return false
  }

  static recentHelpers: HelpersBase[] = []
  static addToRecent(h: HelpersBase) {
    if (!h) return
    if (h.isNew()) return
    let index = Helpers.recentHelpers.findIndex((x) => x.id == h.id)
    if (index >= 0) Helpers.recentHelpers.splice(index, 1)
    Helpers.recentHelpers.splice(0, 0, h)
  }
  async getActiveEventsRegistered() {
    let events = await import('../events/events')
    let result: import('../events/events').volunteersInEvent[] = []
    let yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    for (const event of await remult.repo(events.Event).find({
      where: {
        eventStatus: events.eventStatus.active,
        eventDate: { '>=': yesterday }
      }
    })) {
      for (const v of await remult.repo(events.volunteersInEvent).find({
        where: { helper: this, eventId: event.id }
      })) {
        result.push(v)
      }
    }
    return result
  }
  async sendSmsToCourier(ui: UITools, message = '') {
    let h = this
    const comment = new InputField<string>({
      customInput: (c) => c.textArea(),
      caption: remult.context.lang.sendMessageToVolunteer,
      defaultValue: () =>
        remult.context.lang.hello + ' ' + h.name + '\n' + message
    })
    ui.inputAreaDialog({
      ok: async () => {
        ui.Info(await Helpers.SendCustomMessageToCourier(this, comment.value))
      },
      fields: [comment],
      title: remult.context.lang.sendMessageToVolunteer + ' ' + h.name
    })
  }
  @BackendMethod({ allowed: Roles.admin })
  static async SendCustomMessageToCourier(h: HelpersBase, message: string) {
    return await new (
      await import('../asign-family/send-sms-action')
    ).SendSmsUtils().sendSms(h.phone.thePhone, message, h)
  }
  async smsMessages(ui: UITools) {
    const HelperCommunicationHistory = (
      await import('../in-route-follow-up/in-route-helpers')
    ).HelperCommunicationHistory
    const settings = new GridSettings(remult.repo(HelperCommunicationHistory), {
      where: {
        volunteer: this
      },
      columnSettings: (com) => [
        com.message,
        com.incoming,
        com.createDate,
        com.automaticAction,
        com.apiResponse
      ],
      numOfColumnsInGrid: 4
    })
    ui.gridDialog({
      settings,
      buttons: [
        {
          text: remult.context.lang.customSmsMessage,
          click: () => {
            this.sendSmsToCourier(ui)
            settings.reloadData()
          }
        }
      ],
      title: remult.context.lang.smsMessages + ' ' + this.name
    })
  }
}

export function validatePasswordColumn(password: FieldRef<any, string>) {
  if (getSettings().requireComplexPassword) {
    var l = getLang()
    if (password.value.length < 8) password.error = l.passwordTooShort
    if (!password.value.match(/^(?=.*[0-9])(?=.*[a-zA-Z])([a-zA-Z0-9]+)$/))
      password.error = l.passwordCharsRequirement
  }
}

export function makeId() {
  var text = ''
  var possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  for (var i = 0; i < 10; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  return text
}

function isNotSmsSignIn() {
  return remult.authenticated && !remult.isAllowed(Roles.smsSignIn)
}
