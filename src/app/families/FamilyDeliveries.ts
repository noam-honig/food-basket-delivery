import { ChangeDateColumn, relativeDateName } from '../model-shared/types'
import { SqlBuilder, SqlFor } from '../model-shared/SqlBuilder'
import { Phone } from '../model-shared/phone'
import * as fetch from 'node-fetch'

import {
  IdEntity,
  Filter,
  FieldRef,
  Allow,
  BackendMethod,
  isBackend,
  EntityFilter,
  SqlDatabase,
  remult,
  IdFieldRef,
  getValueList
} from 'remult'
import { BasketType } from './BasketType'
import {
  Families,
  autocompleteResult,
  iniFamilyDeliveriesInFamiliesCode,
  parseUrlInAddress
} from './families'
import { DeliveryStatus } from './DeliveryStatus'
import { Helpers, HelpersBase } from '../helpers/helpers'

import { Roles } from '../auth/roles'
import { DistributionCenters } from '../manage/distribution-centers'
import { YesNo } from './YesNo'

import {
  Location,
  toLongLat,
  isGpsAddress,
  openWaze,
  AddressHelper,
  openGoogleMaps,
  GeocodeResult
} from '../shared/googleApiHelpers'

import {
  use,
  FieldType,
  Field,
  ValueListFieldType,
  Entity,
  Fields
} from '../translate'
import {
  includePhoneInApi,
  getSettings,
  ApplicationSettings,
  CustomColumn,
  questionForVolunteers
} from '../manage/ApplicationSettings'
import { getLang } from '../sites/sites'
import {
  DataAreaFieldsSetting,
  DataControl,
  IDataAreaSettings,
  InputField
} from '../common-ui-elements/interfaces'

import { Groups, GroupsValue } from '../manage/groups'

import { FamilySources } from './FamilySources'
import { DeliveryImage, FamilyImage } from './DeiveryImages'
import { ImageInfo } from '../images/images.component'

import { isDesktop } from '../shared/utils'
import { UITools } from '../helpers/init-context'
import { messageMerger } from '../edit-custom-message/messageMerger'
import { DeliveryType } from './deliveryType'

@ValueListFieldType({
  translation: (l) => l.messageStatus
})
export class MessageStatus {
  static noVolunteer = new MessageStatus(0, use.language.noAssignedVolunteer)
  static notSent = new MessageStatus(1, use.language.smsNotSent)
  static notOpened = new MessageStatus(2, use.language.smsNotOpened)
  static opened = new MessageStatus(3, use.language.smsOpened)
  constructor(public id: number, public caption: string) {}
}
async function documentChange(fd: FamilyDeliveries, deleted = false) {
  await remult.repo(DeliveryChanges).insert({
    deliveryId: fd.id,
    deliveryName: fd.name,
    familyId: fd.family,
    courier: fd.courier,
    previousCourier: fd.$.courier.originalValue,
    deleted,
    status: fd.deliverStatus,
    previousDeliveryStatus: fd.$.deliverStatus.originalValue
  })
}

@Entity<FamilyDeliveries>('FamilyDeliveries', {
  dbName: 'FamilyDeliveries',
  translation: (l) => l.deliveries,
  allowApiRead: Allow.authenticated,
  allowApiInsert: false,
  allowApiUpdate: Allow.authenticated,
  allowApiDelete: Roles.familyAdmin,
  deleted: async (self) => {
    if (isBackend()) {
      await documentChange(self, true)
    }
  },
  saving: async (self) => {
    //SqlDatabase.LogToConsole = true
    if (self.isNew()) {
      self.createDate = new Date()
      self.createUser = await remult.context.getCurrentUser()
      self.deliveryStatusDate = new Date()
      self.deliveryStatusUser = await remult.context.getCurrentUser()
    }
    if (self.quantity < 1) self.quantity = 1
    if (self.distributionCenter == null)
      self.distributionCenter = await remult
        .repo(DistributionCenters)
        .findFirst({ archive: false })
    if (self.$.courier.valueChanged() && !self.isNew()) {
      if (!self.disableRouteReCalc) self.routeOrder = 0
      self.onTheWayDate = null
    }

    if (isBackend()) {
      if (!self.disableChangeLogging) {
        if (!self.isNew() || self.courier)
          logChanged(
            self.$.courier,
            self.$.courierAssingTime,
            self.$.courierAssignUser,
            async () => {
              if (!self._disableMessageToUsers) {
                self.distributionCenter.SendMessageToBrowser(
                  Families.GetUpdateMessage(self, 2, self.courier?.name)
                )
              }
            }
          )
        if (
          (!self.isNew() && self.$.courier.valueChanged()) ||
          self.$.deliverStatus.valueChanged()
        ) {
          await self.$.courier.load()
          await documentChange(self, false)
        }
        if (
          !self.isNew() &&
          self.$.courierComments.valueChanged() &&
          self.courierComments.length > 0
        )
          self.courierCommentsDate = new Date()
        if (self.$.deliverStatus.valueChanged()) {
          let env = process.env['ESHEL']
          if (env && remult.authenticated()) {
            if (env.split(',').includes(remult.context.getSite())) {
              if (
                self.courier?.id === remult.user.id &&
                self.deliverStatus.IsAResultStatus()
              ) {
                const fam = await remult.repo(Families).findId(self.family)
                if (fam.iDinExcel) {
                  const eshelUrl = `https://ok-rsoft.com/EshelIT.Service.Phone/IVRDriverConfirmation.aspx?cphone=${
                    self.courier.phone
                  }&accountId=${fam.iDinExcel}&action=${
                    self.deliverStatus.isProblem ? 2 : 1
                  }&text=${encodeURI(self.courierComments)}`
                  console.log({ eshelUrl })
                  fetch.default(eshelUrl).catch((err) => {
                    console.error('failed', { eshelUrl, err })
                  })
                }
              }
            }
          }
        }

        logChanged(
          self.$.deliverStatus,
          self.$.deliveryStatusDate,
          self.$.deliveryStatusUser,
          async () => {
            if (!self._disableMessageToUsers) {
              self.distributionCenter.SendMessageToBrowser(
                Families.GetUpdateMessage(
                  self,
                  1,
                  self.courier ? await self.courier.name : ''
                )
              )
            }
          }
        )
        logChanged(
          self.$.needsWork,
          self.$.needsWorkDate,
          self.$.needsWorkUser,
          async () => {}
        )
        logChanged(
          self.$.archive,
          self.$.archiveDate,
          self.$.archiveUser,
          async () => {}
        )
      }
      if (
        !self.deliverStatus.IsAResultStatus() &&
        self.$.deliverStatus.originalValue &&
        self.$.deliverStatus.originalValue.IsAResultStatus()
      ) {
        let f = await remult.repo(Families).findId(self.family)
        if (f) f.updateDelivery(self)
      }
      if (self.isNew() && !self._disableMessageToUsers) {
        self.distributionCenter.SendMessageToBrowser(getLang().newDelivery)
      }
    }
  },
  apiPrefilter: () => FamilyDeliveries.isAllowedForUser()
})
export class FamilyDeliveries extends IdEntity {
  getCss(): string {
    return this.deliverStatus.getCss(this.courier)
  }
  disableRouteReCalc = false
  @BackendMethod<FamilyDeliveries>({
    allowed: Allow.authenticated
  })
  static async getFamilyImages(
    family: string,
    delivery: string
  ): Promise<ImageInfo[]> {
    if (!Roles.distCenterAdmin) {
      let d = await remult.repo(FamilyDeliveries).findId(delivery)
      if (d.courier?.id != (await remult.context.getCurrentUser())?.id)
        return []
    }
    let r = (
      await remult.repo(FamilyImage).find({ where: { familyId: family } })
    ).map(({ image }) => ({ image } as ImageInfo))
    return r
  }

  @BackendMethod<FamilyDeliveries>({
    allowed: Allow.authenticated
  })
  static async hasFamilyImages(
    family: string,
    delivery: string
  ): Promise<boolean> {
    if (!Roles.distCenterAdmin) {
      let d = await remult.repo(FamilyDeliveries).findId(delivery)
      if (d.courier?.id != (await remult.context.getCurrentUser())?.id)
        return false
    }
    let r = (await remult.repo(FamilyImage).count({ familyId: family })) > 0
    return r
  }
  async loadVolunteerImages(): Promise<
    import('../images/images.component').ImageInfo[]
  > {
    return (
      await remult.repo(DeliveryImage).find({ where: { deliveryId: this.id } })
    ).map(
      (i) =>
        ({
          image: i.image,
          entity: i
        } as ImageInfo)
    )
  }
  addStatusExcelColumn(
    addColumn: (
      caption: string,
      v: string,
      t: import('xlsx/types').ExcelDataType
    ) => void
  ) {
    addColumn(getLang().statusSummary, this.statusSammary(), 's')
  }
  statusSammary() {
    var status = this.deliverStatus.caption
    switch (this.deliverStatus) {
      case DeliveryStatus.ReadyForDelivery:
      case DeliveryStatus.DriverPickedUp:
        if (this.courier) status = getLang().onTheWay
        else status = getLang().unAsigned
        break
      case DeliveryStatus.SelfPickup:

      case DeliveryStatus.Frozen:
        break
      case DeliveryStatus.Success:
      case DeliveryStatus.SuccessPickedUp:
      case DeliveryStatus.SuccessLeftThere:
        status = getLang().delivered
        break
      case DeliveryStatus.FailedBadAddress:
      case DeliveryStatus.FailedNotHome:
      case DeliveryStatus.FailedDoNotWant:

      case DeliveryStatus.FailedNotReady:
      case DeliveryStatus.FailedTooFar:

      case DeliveryStatus.FailedOther:
        status = getLang().problem
        break
    }
    return status
  }

  changeRequireStatsRefresh() {
    return (
      [
        this.$.deliverStatus,
        this.$.courier,
        this.$.basketType,
        this.$.quantity,
        this.$.items
      ].filter((x) => x.valueChanged()).length > 0
    )
  }
  copyFrom(originalDelivery: FamilyDeliveries) {
    this.distributionCenter = originalDelivery.distributionCenter
    this.special = originalDelivery.special
    this.basketType = originalDelivery.basketType
    this.quantity = originalDelivery.quantity
    this.deliveryComments = originalDelivery.deliveryComments
  }
  async duplicateCount() {
    return await remult.repo(ActiveFamilyDeliveries).count({
      family: this.family,
      deliverStatus: DeliveryStatus.isNotAResultStatus(),
      basketType: this.basketType,
      distributionCenter: this.distributionCenter
    })
  }

  @Field({
    translation: (l) => l.familyIdInHagaiApp,
    allowApiUpdate: false
  })
  family: string
  @Field({
    allowApiUpdate: false,
    translation: (l) => l.familyName,
    sqlExpression: async (entity) => {
      let r =
        remult.isAllowed(Roles.distCenterAdmin) ||
        !(await remult.context.getSettings())?.showOnlyLastNamePartToVolunteer
          ? undefined
          : "regexp_replace(name, '^.* ', '')"
      return r
    }
  })
  name: string

  @Field({
    //translation: l => l.basketType,
    allowApiUpdate: [Roles.familyAdmin, Roles.callPerson]
  })
  basketType: BasketType
  @Fields.quantity({
    allowApiUpdate: [Roles.familyAdmin, Roles.callPerson]
  })
  @DataControl({ width: '100' })
  quantity: number

  @Field<FamilyDeliveries, string>({
    translation: (l) => l.items,
    clickWithTools: (_, fr, ui) => {
      editItems(fr, ui)
    }
  })
  items: string = ''
  isLargeQuantity() {
    return getSettings().isSytemForMlt && this.quantity > 10
  }

  @Field({
    allowApiUpdate: Roles.admin
  })
  distributionCenter: DistributionCenters

  isDistCenterInactive() {
    return this.distributionCenter && this.distributionCenter.isFrozen
  }
  @Field()
  deliverStatus: DeliveryStatus = DeliveryStatus.ReadyForDelivery
  @Field({
    translation: (l) => l.volunteer,
    allowApiUpdate: Roles.distCenterAdmin,
    clickWithTools: async (self, _, ui) =>
      ui.selectHelper({
        onSelect: (helper) => (self.courier = helper),
        location: self.getDrivingLocation(),
        familyId: self.family
      })
  })
  courier: HelpersBase
  @Field({ translation: (l) => l.commentsWritteByVolunteer })
  courierComments: string
  @ChangeDateColumn()
  courierCommentsDate: Date
  @Field({ includeInApi: Roles.admin })
  internalDeliveryComment: string
  @Fields.integer({
    allowApiUpdate: true
  })
  routeOrder: number
  @Field({ includeInApi: Roles.admin, translation: (l) => l.specialAsignment })
  special: YesNo
  @ChangeDateColumn()
  deliveryStatusDate: Date
  relativeDeliveryStatusDate() {
    return relativeDateName({ d: this.deliveryStatusDate })
  }
  @Field({
    allowApiUpdate: false,
    translation: (l) => l.courierAsignUser,
    includeInApi: Roles.distCenterAdmin
  })
  courierAssignUser: HelpersBase
  @ChangeDateColumn({ translation: (l) => l.courierAsignDate })
  courierAssingTime: Date
  @Field({
    translation: (l) => l.statusChangeUser,
    allowApiUpdate: false,
    includeInApi: Roles.admin
  })
  deliveryStatusUser: HelpersBase
  @ChangeDateColumn({
    includeInApi: Roles.admin,
    translation: (l) => l.deliveryCreateDate
  })
  createDate: Date
  @Field({
    includeInApi: Roles.admin,
    translation: (l) => l.deliveryCreateUser,
    allowApiUpdate: false
  })
  createUser: HelpersBase
  @Field({
    translation: (l) => l.requireFollowUp
  })
  needsWork: boolean

  @Field({
    translation: (l) => l.requireFollowUpUpdateUser,
    includeInApi: Roles.distCenterAdmin
  })
  needsWorkUser: HelpersBase
  @ChangeDateColumn({ translation: (l) => l.requireFollowUpUpdateDate })
  needsWorkDate: Date
  @Field({
    translation: (l) => l.commentForVolunteer,
    allowApiUpdate: [Roles.familyAdmin, Roles.callPerson]
  })
  deliveryComments: string
  @Field({
    translation: (l) => l.commentForReception,
    allowApiUpdate: [Roles.lab, Roles.callPerson]
  })
  receptionComments: string
  @Field({
    includeInApi: Roles.admin,
    allowApiUpdate: false,
    translation: (l) => l.familySource
  })
  familySource: FamilySources
  @Field({
    includeInApi: Roles.distCenterAdmin,
    allowApiUpdate: false
  })
  groups: GroupsValue

  @Field({
    allowApiUpdate: false
  })
  address: string
  @Field({
    allowApiUpdate: false
  })
  floor: string
  @Field({
    allowApiUpdate: false
  })
  appartment: string
  @Field({
    allowApiUpdate: false
  })
  entrance: string
  @Field({
    allowApiUpdate: false
  })
  buildingCode: string
  @Field({
    translation: (l) => l.cityAutomaticallyUpdatedByGoogle,
    allowApiUpdate: false
  })
  city: string
  @Field({ translation: (l) => l.region, allowApiUpdate: false })
  area: string
  @Field({
    allowApiUpdate: false
  })
  addressComment: string
  @Field({
    allowApiUpdate: false
  })
  //שים לב - אם המשתמש הקליד כתובת GPS בכתובת - אז הנקודה הזו תהיה הנקודה שהמשתמש הקליד ולא מה שגוגל מצא
  addressLongitude: number
  @Field({
    allowApiUpdate: false
  })
  addressLatitude: number
  @Field({
    allowApiUpdate: false
  })
  //זו התוצאה שחזרה מהGEOCODING כך שהיא מכוונת לכביש הקרוב
  drivingLongitude: number
  @Field({
    allowApiUpdate: false
  })
  drivingLatitude: number
  @Field({ allowApiUpdate: false })
  addressByGoogle: string
  @Field({
    allowApiUpdate: false
  })
  addressOk: boolean
  @Field({
    translation: (l) => l.defaultVolunteer,
    allowApiUpdate: false,
    includeInApi: Roles.distCenterAdmin
  })
  fixedCourier: HelpersBase
  @Fields.integer({ allowApiUpdate: false })
  familyMembers: number
  @Field({
    dbName: 'phone',
    includeInApi: () => includePhoneInApi(),
    allowApiUpdate: false
  })
  phone1: Phone
  @Field({
    includeInApi: () => includePhoneInApi(),
    allowApiUpdate: false
  })
  phone1Description: string
  @Field({
    includeInApi: () => includePhoneInApi(),
    allowApiUpdate: false
  })
  phone2: Phone
  @Field({
    includeInApi: () => includePhoneInApi(),
    allowApiUpdate: false
  })
  phone2Description: string
  @Field({
    includeInApi: () => includePhoneInApi(),
    allowApiUpdate: false
  })
  phone3: Phone
  @Field({
    includeInApi: () => includePhoneInApi(),
    allowApiUpdate: false
  })
  phone3Description: string
  @Field({
    includeInApi: () => includePhoneInApi(),
    allowApiUpdate: false
  })
  phone4: Phone
  @Field({
    includeInApi: () => includePhoneInApi(),
    allowApiUpdate: false
  })
  phone4Description: string

  @Field({
    sqlExpression: async (self) => {
      var sql = new SqlBuilder()

      var fd = SqlFor(remult.repo(FamilyDeliveries))
      let f = SqlFor(self)
      sql.addEntity(f, 'FamilyDeliveries')
      sql.addEntity(fd, 'fd')
      return sql.columnWithAlias(
        sql.case(
          [
            {
              when: [sql.ne(f.courier, "''")],
              then: sql.build(
                'exists (select 1 from ',
                fd,
                ' as ',
                'fd',
                ' where ',
                sql.and(
                  sql.not(sql.eq(fd.id, f.id)),
                  sql.eq(fd.family, f.family),
                  sql.eq(fd.courier, f.courier),
                  fd.where({ deliverStatus: DeliveryStatus.isAResultStatus() })
                ),
                ')'
              )
            }
          ],
          false
        ),
        'courierBeenHereBefore'
      )
    }
  })
  courierBeenHereBefore: boolean
  @Field({
    allowApiUpdate: (c) =>
      remult.authenticated() &&
      (getSettings().isSytemForMlt || remult.isAllowed(Roles.familyAdmin))
  })
  archive: boolean
  @ChangeDateColumn({
    includeInApi: Roles.admin,
    translation: (l) => l.archiveDate
  })
  archiveDate: Date

  @Field({ allowApiUpdate: false, allowNull: true })
  onTheWayDate: Date
  @Field({ includeInApi: Roles.admin, translation: (l) => l.archiveUser })
  archiveUser: HelpersBase
  @Field({
    sqlExpression: async (selfDefs) => {
      var sql = new SqlBuilder()
      let self = SqlFor(selfDefs)
      return sql.case(
        [
          {
            when: [
              sql.or(
                sql.gtAny(self.deliveryStatusDate, 'current_date -1'),
                self.where({
                  deliverStatus: [
                    DeliveryStatus.ReadyForDelivery,
                    DeliveryStatus.DriverPickedUp
                  ]
                })
              )
            ],
            then: true
          }
        ],
        false
      )
    }
  })
  visibleToCourier: boolean
  @Field({
    sqlExpression: async (self) => {
      var sql = new SqlBuilder()

      var helper = SqlFor(remult.repo(Helpers))
      let f = SqlFor(self)
      sql.addEntity(f, 'FamilyDeliveries')
      sql.addEntity(helper, 'h')
      return sql.case(
        [
          {
            when: [sql.ne(f.courier, "''")],
            then: sql.build(
              'COALESCE ((select ',
              sql.case(
                [
                  {
                    when: [sql.gt(helper.lastSignInDate, f.courierAssingTime)],
                    then: MessageStatus.opened.id
                  },
                  {
                    when: [sql.gt(helper.smsDate, f.courierAssingTime)],
                    then: MessageStatus.notOpened.id
                  }
                ],
                MessageStatus.notSent.id
              ),
              ' from ',
              await helper.metadata.getDbName(),
              ' as h where ',
              sql.eq(helper.id, f.courier),
              '), ' + MessageStatus.noVolunteer.id + ')'
            )
          }
        ],
        MessageStatus.noVolunteer.id
      )
    }
  })
  messageStatus: MessageStatus
  @CustomColumn(() => questionForVolunteers[1])
  a1: string
  @CustomColumn(() => questionForVolunteers[2])
  a2: string
  @CustomColumn(() => questionForVolunteers[3])
  a3: string
  @CustomColumn(() => questionForVolunteers[4])
  a4: string

  @Field({
    includeInApi: Roles.admin,
    sqlExpression: async (selfDefs) => {
      let self = SqlFor(selfDefs)
      let images = SqlFor(remult.repo(DeliveryImage))
      let sql = new SqlBuilder()
      return sql.columnCount(self, {
        from: images,
        where: () => [sql.eq(images.deliveryId, self.id)]
      })
    }
  })
  numOfPhotos: number

  @Field({
    includeInApi: Roles.callPerson,
    allowApiUpdate: Roles.callPerson,
    translation: (l) => l.caller
  })
  caller: HelpersBase
  @Field({
    includeInApi: Roles.callPerson,
    allowApiUpdate: Roles.callPerson,
    customInput: (c) => c.textArea()
  })
  callerComment: string
  @Field({
    includeInApi: Roles.callPerson,
    allowApiUpdate: false,
    allowNull: true
  })
  lastCallDate: Date
  @Field({ includeInApi: Roles.callPerson, allowApiUpdate: false })
  callerAssignDate: Date
  @Field({
    includeInApi: Roles.callPerson,
    allowApiUpdate: false,
    dbName: 'callCount'
  })
  callCounter: number
  @Field<FamilyDeliveries>({
    translation: (l) => l.familyHelpContact,
    includeInApi: Roles.distCenterAdmin,
    sqlExpression: async (selfDefs) => {
      let sql = new SqlBuilder()
      let self = SqlFor(selfDefs)
      let f = SqlFor(remult.repo(Families))
      return sql.columnInnerSelect(self, {
        from: f,
        select: () => [f.socialWorker],
        where: () => [sql.eq(f.id, self.family)]
      })
    }
  })
  socialWorker: string

  @DataControl<FamilyDeliveries>({
    readonly: (self) => self.deliverStatus.IsAResultStatus()
  })
  @Field({
    allowApiUpdate: Roles.familyAdmin
  })
  deliveryType: DeliveryType = DeliveryType.delivery
  @DataControl<FamilyDeliveries>({
    readonly: (self) => !self.deliveryType.inputPickupVolunteer
  })
  @Field<FamilyDeliveries, HelpersBase>({
    translation: (l) => 'מתנדב לאיסוף',
    allowApiUpdate: Roles.familyAdmin,

    clickWithTools: async (self, _, ui) =>
      ui.selectHelper({
        onSelect: async (helper) => {
          self.pickupVolunteer = helper
          if (self.deliveryType.inputPickupVolunteer) {
            const h = helper && (await helper.getHelper())
            self.address_2 =
              h?.preferredDistributionAreaAddress ||
              h?.preferredFinishAddress ||
              ''
            self.addressApiResult_2 = h?.preferredDistributionAreaAddress
              ? h?.addressApiResult
              : h?.addressApiResult2

            self.phone1_2 = h.phone || undefined
            self.phone1Description_2 = h.name || ''
          }
        },
        location: self.getDrivingLocation(),
        familyId: self.family
      })
  })
  pickupVolunteer: HelpersBase

  @Field({ allowApiUpdate: Roles.familyAdmin })
  addressApiResult_2: string

  @Field<FamilyDeliveries, string>({
    allowApiUpdate: Roles.familyAdmin,
    translation: (t) => t.address + ' 2',
    customInput: (c) =>
      c.addressInput((x, d) => {
        d.addressApiResult_2 = JSON.stringify(x.autoCompleteResult)
      })
  })
  @DataControl<FamilyDeliveries>({
    readonly: (self) => !self.deliveryType.inputSecondAddress,
    valueChange: (self) => {
      if (!self.address_2) return
      let y = parseUrlInAddress(self.address_2)
      if (y != self.address_2) self.address_2 = y
    }
  })
  address_2: string
  addressHelper_2 = new AddressHelper(
    () => this.$.address_2,
    () => this.$.addressApiResult_2
  )
  @DataControl({ readonly: (self) => !self.deliveryType.inputSecondAddress })
  @Field({
    translation: (t) => t.floor + ' כתובת 2',
    allowApiUpdate: Roles.familyAdmin
  })
  floor_2: string
  @Field({
    translation: (t) => t.appartment + ' כתובת 2',
    allowApiUpdate: Roles.familyAdmin
  })
  appartment_2: string
  @DataControl({ readonly: (self) => !self.deliveryType.inputSecondAddress })
  @Field({
    translation: (t) => t.entrance + ' כתובת 2',
    allowApiUpdate: Roles.familyAdmin
  })
  entrance_2: string

  @Field({
    translation: (t) => t.addressComment + ' כתובת 2',
    allowApiUpdate: Roles.familyAdmin
  })
  @DataControl({ readonly: (self) => !self.deliveryType.inputSecondAddress })
  addressComment_2: string
  @Field({
    translation: (t) => t.phone1 + ' כתובת 2',
    allowApiUpdate: Roles.familyAdmin
  })
  @DataControl({ readonly: (self) => !self.deliveryType.inputSecondAddress })
  phone1_2: Phone
  @Field({
    translation: (t) => t.phone1Description + ' כתובת 2',
    allowApiUpdate: Roles.familyAdmin
  })
  @DataControl({ readonly: (self) => !self.deliveryType.inputSecondAddress })
  phone1Description_2: string
  @Field({ translation: (t) => t.phone2 + ' כתובת 2' })
  @DataControl({ readonly: (self) => !self.deliveryType.inputSecondAddress })
  phone2_2: Phone
  @Field({ translation: (t) => t.phone2Description + ' כתובת 2' })
  @DataControl({ readonly: (self) => !self.deliveryType.inputSecondAddress })
  phone2Description_2: string

  static customFilter = Filter.createCustom<
    FamilyDeliveries,
    {
      city: string
      group: string
      area: string
      basketId: string
    }
  >(async ({ city, group, area, basketId }) => {
    let basket = await remult.repo(BasketType).findId(basketId)
    return {
      deliverStatus: DeliveryStatus.ReadyForDelivery,
      courier: null,
      distributionCenter: remult.context.filterCenterAllowedForUser(),
      groups: group ? { $contains: group } : undefined,
      city: city ? city : undefined,
      area:
        area !== undefined && area != remult.context.lang.allRegions
          ? area
          : undefined,
      basketType: basket != null ? basket : undefined
    }
  })
  static isAllowedForUser = Filter.createCustom<FamilyDeliveries>(async () => {
    if (!remult.authenticated()) return { id: [] }
    let result: EntityFilter<FamilyDeliveries>[] = []
    let user = await remult.context.getCurrentUser()
    if (!remult.isAllowed([Roles.admin, Roles.lab])) {
      if (!remult.isAllowed(Roles.familyAdmin))
        result.push(FamilyDeliveries.active)
      let $or: EntityFilter<FamilyDeliveries>[] = []
      if (remult.isAllowed(Roles.distCenterAdmin))
        $or.push({
          distributionCenter: remult.context.filterCenterAllowedForUser()
        })
      if (user.theHelperIAmEscorting)
        $or.push({
          courier: user.theHelperIAmEscorting,
          visibleToCourier: true
        })
      else $or.push({ courier: user, visibleToCourier: true })
      if (remult.isAllowed(Roles.callPerson))
        $or.push(FamilyDeliveries.inProgressCallerDeliveries())
      if ($or) result.push({ $or })
    }
    return { $and: result }
  })
  static inProgressCallerDeliveries = Filter.createCustom<FamilyDeliveries>(
    async () => {
      return {
        caller: await remult.context.getCurrentUser(),
        deliverStatus: DeliveryStatus.enquireDetails,
        archive: false
      }
    }
  )
  static readyFilter(
    city?: string,
    group?: string,
    area?: string,
    basket?: BasketType
  ) {
    return this.customFilter({ city, group, area, basketId: basket?.id })
  }
  static onTheWayFilter = Filter.createCustom<FamilyDeliveries>(() => ({
    deliverStatus: [
      DeliveryStatus.ReadyForDelivery,
      DeliveryStatus.DriverPickedUp
    ],
    courier: { '!=': null }
  }))

  static active: EntityFilter<FamilyDeliveries> = {
    archive: false
  }
  static notActive: EntityFilter<FamilyDeliveries> = {
    archive: true
  }

  disableChangeLogging = false
  _disableMessageToUsers = false

  static async loadFamilyInfoForExcepExport(
    deliveries: ActiveFamilyDeliveries[]
  ) {
    let families = await remult.repo(Families).find({
      limit: deliveries.length,
      where: { id: deliveries.map((d) => d.family) }
    })
    for (const d of deliveries) {
      d.familyForExcelExport = families.find((f) => f.id == d.family)
    }
  }
  private familyForExcelExport: Families
  async addFamilyInfoToExcelFile(addColumn) {
    var f = this.familyForExcelExport
    let settings = await ApplicationSettings.getAsync()
    if (f) {
      let x = f.addressHelper.getGeocodeInformation
      let street = f.address
      let house = ''
      let lastName = ''
      let firstName = ''
      if (f.name != undefined) lastName = f.name.trim()
      let i = lastName.lastIndexOf(' ')
      if (i >= 0) {
        firstName = lastName.substring(i, lastName.length).trim()
        lastName = lastName.substring(0, i).trim()
      }
      {
        try {
          for (const addressComponent of x.info.results[0].address_components) {
            switch (addressComponent.types[0]) {
              case 'route':
                street = addressComponent.short_name
                break
              case 'street_number':
                house = addressComponent.short_name
                break
            }
          }
        } catch {}
      }
      addColumn(use.language.email, f.$.email.displayValue, 's')
      for (const x of [
        [settings.familyCustom1Caption, f.custom1],
        [settings.familyCustom2Caption, f.custom2],
        [settings.familyCustom3Caption, f.custom3],
        [settings.familyCustom4Caption, f.custom4]
      ]) {
        if (x[0]) {
          addColumn(x[0], x[1], 's')
        }
      }

      addColumn(f.$.socialWorker.metadata.caption, f.socialWorker, 's')
      addColumn('X' + use.language.lastName, lastName, 's')
      addColumn('X' + use.language.firstName, firstName, 's')
      addColumn('X' + use.language.streetName, street, 's')
      addColumn('X' + use.language.houseNumber, house, 's')
      addColumn('X' + f.$.tz.metadata.caption, f.tz, 's')
      addColumn('X' + f.$.tz2.metadata.caption, f.tz2, 's')
      addColumn('X' + f.$.iDinExcel.metadata.caption, f.iDinExcel, 's')
    }
  }

  getShortDeliveryDescription() {
    return this.staticGetShortDescription(
      this.deliverStatus,
      this.deliveryStatusDate,
      this.courier,
      this.courierComments
    )
  }
  staticGetShortDescription(
    deliverStatus: DeliveryStatus,
    deliveryStatusDate: Date,
    courier: HelpersBase,
    courierComments: string
  ) {
    let r = deliverStatus.caption + ' '
    if (deliverStatus.IsAResultStatus() && deliveryStatusDate) {
      if (
        deliveryStatusDate.valueOf() <
        new Date().valueOf() - 7 * 86400 * 1000
      )
        r += getLang().on + ' ' + deliveryStatusDate.toLocaleDateString('he-il')
      else r += relativeDateName({ d: deliveryStatusDate })
      if (courierComments) {
        r += ': ' + courierComments
      }
      if (
        courier &&
        deliverStatus != DeliveryStatus.SelfPickup &&
        deliverStatus != DeliveryStatus.SuccessPickedUp
      )
        r += ' ' + getLang().by + ' ' + courier.name
    }
    return r
  }
  static readyAndSelfPickup(): EntityFilter<FamilyDeliveries> {
    return {
      deliverStatus: [
        DeliveryStatus.ReadyForDelivery,
        DeliveryStatus.SelfPickup
      ],
      courier: null
    }
  }

  getDeliveryDescription() {
    switch (this.deliverStatus) {
      case DeliveryStatus.ReadyForDelivery:
      case DeliveryStatus.DriverPickedUp:
        if (this.courier) {
          let c = this.courier

          let r =
            (this.messageStatus == MessageStatus.opened
              ? use.language.onTheWay
              : use.language.assigned) +
            ': ' +
            c.name +
            (c.eventComment ? ' (' + c.eventComment + ')' : '') +
            ', ' +
            use.language.assigned +
            ' ' +
            relativeDateName({ d: this.courierAssingTime }) +
            ' '
          switch (this.messageStatus) {
            case MessageStatus.notSent:
              r += use.language.smsNotSent
              break
            case MessageStatus.notOpened:
              r += use.language.smsNotOpened
              break
          }
          return r
        }
        break
      case DeliveryStatus.Success:
      case DeliveryStatus.SuccessLeftThere:
      case DeliveryStatus.FailedBadAddress:
      case DeliveryStatus.FailedNotHome:
      case DeliveryStatus.FailedDoNotWant:
      case DeliveryStatus.FailedNotReady:
      case DeliveryStatus.FailedTooFar:
      case DeliveryStatus.FailedOther:
        let duration = ''
        if (this.courierAssingTime && this.deliveryStatusDate)
          duration =
            ' ' +
            getLang().within +
            ' ' +
            Math.round(
              (this.deliveryStatusDate.valueOf() -
                this.courierAssingTime.valueOf()) /
                60000
            ) +
            ' ' +
            getLang().minutes
        return (
          this.deliverStatus.caption +
          (this.courierComments ? ', ' + this.courierComments + ' - ' : '') +
          (this.courier ? ' ' + getLang().by + ' ' + this.courier.name : '') +
          ' ' +
          relativeDateName({ d: this.deliveryStatusDate }) +
          duration
        )
    }
    return this.deliverStatus.caption
  }
  describe() {
    return Families.GetUpdateMessage(this, 1, this.courier && this.courier.name)
  }

  getDrivingLocation(): Location {
    if (this.drivingLatitude != 0 && false)
      return {
        lat: this.drivingLatitude,
        lng: this.drivingLongitude
      }
    else
      return {
        lat: this.addressLatitude,
        lng: this.addressLongitude
      }
  }
  createConfirmDetailsMessage() {
    let s = this.name.split(' ')

    let message = new messageMerger(
      [
        { token: 'שם מלא', value: this.name },
        { token: 'שם חלקי', value: s[s.length - 1] },
        {
          token: 'קישור',
          caption: 'קישור שישמש את המשפחה לאישור הפרטים',
          value: this.confirmDetailsLink(),
          enabled: getSettings().familyConfirmDetailsEnabled
        },
        { token: 'ארגון', value: getSettings().organisationName }
      ],
      'family-confirm'
    )
    return message
  }
  confirmDetailsLink(): string {
    return (
      remult.context.getOrigin() +
      '/' +
      remult.context.getSite() +
      '/fcd/' +
      this.id
    )
  }

  async createConfirmDetailsUserText() {
    let s = this.name.split(' ')

    let message = new messageMerger(
      [
        { token: 'שם מלא', value: this.name },
        { token: 'שם חלקי', value: s[s.length - 1] },
        { token: 'ארגון', value: getSettings().organisationName }
      ],
      'family-confirm-on-screen'
    )
    return message
  }
  openWaze() {
    const toLocation = toLongLat(this.getDrivingLocation())
    const address = this.address
    openWaze(toLocation, address)
  }
  openGoogleMaps() {
    openGoogleMaps(this.addressByGoogle)
  }
  showOnGoogleMaps() {
    window.open(
      'https://maps.google.com/maps?q=' +
        toLongLat(this.getDrivingLocation()) +
        '&hl=' +
        getLang().languageCode,
      '_blank'
    )
  }
  showOnGovMap() {
    window.open(
      'https://www.govmap.gov.il/?q=' + this.address + '&z=10',
      '_blank'
    )
  }
  isGpsAddress() {
    return isGpsAddress(this.address)
  }
  getAddressDescription() {
    if (this.isGpsAddress()) {
      return getLang().gpsLocationNear + ' ' + this.addressByGoogle
    }
    return this.address
  }

  checkAllowedForUser(): boolean {
    if (this.courier?.id == remult.user.id) return true
    return this.distributionCenter.checkAllowedForUser()
  }
  checkNeedsWork() {
    if (
      this.courierComments &&
      this.deliverStatus != DeliveryStatus.ReadyForDelivery &&
      this.deliverStatus != DeliveryStatus.DriverPickedUp
    )
      this.needsWork = true
    switch (this.deliverStatus) {
      case DeliveryStatus.FailedBadAddress:
      case DeliveryStatus.FailedNotHome:
      case DeliveryStatus.FailedDoNotWant:
      case DeliveryStatus.FailedNotReady:
      case DeliveryStatus.FailedTooFar:
      case DeliveryStatus.FailedOther:
        this.needsWork = true
        break
    }
  }
  async showDetailsDialog(callerHelper: {
    refreshDeliveryStats?: () => void
    reloadDeliveries?: () => void
    onSave?: () => Promise<void>
    focusOnAddress?: boolean
    ui: UITools
  }) {
    let showFamilyDetails = remult.isAllowed(Roles.familyAdmin)
    if (showFamilyDetails) {
      let f = await remult.repo(Families).findId(this.family)
      if (f) {
        await callerHelper.ui.updateFamilyDialog({
          familyDelivery: this,
          focusOnAddress: callerHelper.focusOnAddress,
          onSave: async () => {
            if (callerHelper && callerHelper.onSave) await callerHelper.onSave()
          },
          afterSave: (y) => {
            if (y.refreshDeliveryStatistics)
              if (callerHelper && callerHelper.refreshDeliveryStats)
                callerHelper.refreshDeliveryStats()
            if (y.reloadDeliveries)
              if (callerHelper && callerHelper.reloadDeliveries)
                callerHelper.reloadDeliveries()
          }
        })
      } else {
        await callerHelper.ui.Error(getLang().familyWasNotFound)
        showFamilyDetails = false
      }
    }
    if (!showFamilyDetails) {
      await this.showDeliveryOnlyDetail(callerHelper)
    }
  }
  async showDeliveryOnlyDetail(callerHelper: {
    refreshDeliveryStats?: () => void
    onSave?: () => Promise<void>
    focusOnDelivery?: boolean
    ui: UITools
  }) {
    callerHelper.ui.inputAreaDialog({
      title: getLang().deliveryDetailsFor + ' ' + this.name,
      ok: async () => {
        this.save()

        if (callerHelper) {
          if (
            this.changeRequireStatsRefresh() &&
            callerHelper.refreshDeliveryStats
          )
            callerHelper.refreshDeliveryStats()
          if (callerHelper.onSave) callerHelper.onSave()
        }
      },
      cancel: () => {
        this._.undoChanges()
      },
      fields: this.deilveryDetailsAreaSettings(callerHelper.ui)
    })
  }
  secondAddressFieldsForUI() {
    return [
      {
        field: this.$.deliveryType
      },
      {
        field: this.$.pickupVolunteer,
        visible: () => this.deliveryType.inputPickupVolunteer
      },
      {
        field: this.$.address_2,
        visible: () => this.deliveryType.inputSecondAddress
      },
      [
        {
          field: this.$.appartment_2,
          visible: () => this.deliveryType.inputSecondAddress
        },
        {
          field: this.$.floor_2,
          visible: () => this.deliveryType.inputSecondAddress
        },
        {
          field: this.$.entrance_2,
          visible: () => this.deliveryType.inputSecondAddress
        }
      ],
      {
        field: this.$.addressComment_2,
        visible: () => this.deliveryType.inputSecondAddress
      },
      {
        caption: use.language.addressByGoogle,
        getValue: () => this.addressHelper_2.getAddress,
        visible: () => this.deliveryType.inputSecondAddress
      },
      [
        {
          field: this.$.phone1_2,
          visible: () => this.deliveryType.inputSecondAddress
        },
        {
          field: this.$.phone1Description_2,
          visible: () => this.deliveryType.inputSecondAddress
        }
      ],
      [
        {
          field: this.$.phone2_2,
          visible: () => this.deliveryType.inputSecondAddress
        },
        {
          field: this.$.phone2Description_2,
          visible: () => this.deliveryType.inputSecondAddress
        }
      ]
    ]
  }

  deilveryDetailsAreaSettings(ui: UITools): DataAreaFieldsSetting[] {
    return [
      [
        { width: '', field: this.$.basketType },
        { width: '', field: this.$.quantity }
      ],
      [{ width: '', field: this.$.deliverStatus }, this.$.deliveryStatusDate],
      this.$.deliveryComments,
      this.$.items,
      this.$.courier,
      { field: this.$.distributionCenter, visible: () => ui.hasManyCenters },
      ...this.secondAddressFieldsForUI(),
      this.$.needsWork,
      this.$.courierComments,
      this.$.a1,
      this.$.a2,
      this.$.a3,
      this.$.a4,
      this.$.internalDeliveryComment,
      this.$.special,
      [
        { field: this.$.caller, visible: () => getSettings().usingCallModule },
        {
          field: this.$.callerAssignDate,
          visible: () => getSettings().usingCallModule
        }
      ],
      [
        {
          field: this.$.callCounter,
          visible: () => getSettings().usingCallModule
        },
        {
          field: this.$.lastCallDate,
          visible: () => getSettings().usingCallModule
        }
      ],
      {
        field: this.$.callerComment,
        visible: () => getSettings().usingCallModule
      }
    ]
  }
}
SqlBuilder.filterTranslators.push({
  translate: async (f) => {
    return Filter.translateCustomWhere<FamilyDeliveries>(
      f,
      remult.repo(FamilyDeliveries).metadata,
      remult
    )
  }
})

@Entity<FamilyDeliveries>('ActiveFamilyDeliveries', {
  backendPrefilter: { ...FamilyDeliveries.active }
})
export class ActiveFamilyDeliveries extends FamilyDeliveries {
  static filterPhone = Filter.createCustom<ActiveFamilyDeliveries, string>(
    (phone) => {
      return SqlDatabase.rawFilter(async (x) => {
        var phoneParam = x.addParameterAndReturnSqlToken(phone)
        var sql = new SqlBuilder()
        var fd = SqlFor(remult.repo(ActiveFamilyDeliveries))
        let filter = []
        for (const col of [fd.phone1, fd.phone2, fd.phone3, fd.phone4]) {
          filter.push(
            sql.and(
              sql.build(
                sql.extractNumberChars(col),
                ' like ',
                "'%'||",
                sql.extractNumberChars(phoneParam),
                "||'%'"
              ),
              sql.build(sql.extractNumber(phoneParam), ' <> ', 0)
            )
          )
        }
        x.sql = await sql.or(...filter)
      })
    }
  )
}

iniFamilyDeliveriesInFamiliesCode(FamilyDeliveries, ActiveFamilyDeliveries)

function editItems(fr: FieldRef<FamilyDeliveries, string>, ui: UITools) {
  const field = new InputField<string>({
    customInput: (c) => c.textArea(),
    caption: fr.metadata.caption
  })
  field.value = fr.value
    .split(',')
    .map((x) => x.trim())
    .join('\n')
  ui.inputAreaDialog({
    fields: [field],
    ok: () => {
      fr.value = field.value
        .split('\n')
        .map((x) => x.trim())
        .join(', ')
    }
  })
}

function logChanged(
  col: FieldRef<any>,
  dateCol: FieldRef<any, Date>,
  user: IdFieldRef<any, HelpersBase>,
  wasChanged: () => void
) {
  if (col.value != col.originalValue) {
    dateCol.value = new Date()
    user.setId(remult.user?.id)
    wasChanged()
  }
}

@Entity<DeliveryChanges>('deliveryChanges', {
  allowApiRead: Roles.distCenterAdmin,
  defaultOrderBy: {
    changeDate: 'desc'
  }
})
export class DeliveryChanges extends IdEntity {
  @Field()
  deliveryId: string = ''
  @Field({
    translation: (l) => l.family
  })
  deliveryName: string = ''
  @Field()
  familyId: string = ''
  @Field()
  appUrl: string = remult.context.requestRefererOnBackend
  @Field()
  apiUrl: string = remult.context.requestUrlOnBackend
  @Field({ translation: (l) => l.lastUpdateDate })
  changeDate: Date = new Date()
  @Field()
  userId: string = remult.user?.id
  @Field({
    translation: (l) => l.lastUpdateUser
  })
  userName: string = remult.user?.name
  @DataControl({ width: '100' })
  @Field({
    translation: (l) => l.volunteer
  })
  courier: HelpersBase
  @DataControl({ width: '100' })
  @Field({
    translation: (l) => l.volunteer + ' ' + l.previous
  })
  previousCourier: HelpersBase
  @Field({ translation: (l) => l.deliveryStatus })
  status: DeliveryStatus
  @Field({ translation: (l) => l.deliveryStatus + ' ' + l.previous })
  previousDeliveryStatus: DeliveryStatus
  @DataControl({ width: '100' })
  @Field()
  deleted: boolean
}
