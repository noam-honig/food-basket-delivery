import {
  BackendMethod,
  Allowed,
  EntityBase,
  FieldMetadata,
  Allow,
  isBackend,
  remult,
  ValidateFieldEvent
} from 'remult'
import { DataControl } from '../common-ui-elements/interfaces'
export function CustomColumn(
  info: () => customColumnInfo,
  includeInApi?: Allowed
) {
  return (target, key) => {
    DataControl({
      valueList: () => info().values?.map((x) => ({ id: x, caption: x })),
      visible: () => info().visible
    })(target, key)
    return Fields.string(
      {
        includeInApi: includeInApi
      },
      (options) => (options.caption = info().caption)
    )(target, key)
  }
}

import { Location, AddressHelper } from '../shared/googleApiHelpers'
import { Entity, ValueListFieldType } from 'remult'
import { logChanges } from '../model-shared/types'
import { Phone } from '../model-shared/phone'
import { Roles } from '../auth/roles'
import { DeliveryStatus } from '../families/DeliveryStatus'
import {
  Language,
  use,
  TranslationOptions,
  Field,
  FieldType,
  Fields,
  langByCode
} from '../translate'

import { FamilySources } from '../families/FamilySources'
import { Self } from '@angular/core'

import { BasketType } from '../families/BasketType'
import { Sites, getLang, isSderot, setLangForSite } from '../sites/sites'
import { routeStrategy } from '../asign-family/route-strategy'

import { GroupsValue } from './groups'
import { recordChanges } from '../change-log/change-log'
import { ManageController } from './manage.controller'
import { VolunteerNeedType } from './VolunteerNeedType'

@ValueListFieldType()
export class RemovedFromListExcelImportStrategy {
  static displayAsError = new RemovedFromListExcelImportStrategy(
    0,
    'הצג כשגיאה'
  )
  static showInUpdate = new RemovedFromListExcelImportStrategy(
    1,
    'הצג במשפחות לעדכון'
  )
  static ignore = new RemovedFromListExcelImportStrategy(
    2,
    'התעלם והוסף משפחה חדשה'
  )
  constructor(public id: number, public caption: string) {}
}

@Entity<ApplicationSettings>('ApplicationSettings', {
  allowApiRead: true,
  allowApiUpdate: Roles.admin,
  saving: async (self) => {
    if (isBackend()) {
      if (self.$.smsPasswordInput.valueChanged()) {
        if (self.smsPasswordInput)
          self.smsCredentials = {
            password: self.smsPasswordInput
          }
        else {
          self.smsCredentials = {
            password: ''
          }
        }
      }
      await self.addressHelper.updateApiResultIfChanged()

      for (const l of [self.$.message1Link, self.$.message2Link]) {
        if (l.value) {
          if (l.value.trim().indexOf(':') < 0)
            l.value = 'http://' + l.value.trim()
        }
      }
      if (self.helpPhone)
        self.helpPhone = new Phone(Phone.fixPhoneInput(self.helpPhone.thePhone))
      if (self.forWho)
        setLangForSite(Sites.getValidSchemaFromContext(), self.forWho)
      setSettingsForSite(Sites.getValidSchemaFromContext(), self)
      logChanges(self._, remult, {
        excludeColumns: [
          self.$.currentUserIsValidForAppLoadTest,
          self.$.smsCredentials,
          self.$.smsPasswordInput
        ]
      })
      recordChanges(self, {
        excludeColumns: (s) => [
          s.currentUserIsValidForAppLoadTest,
          s.smsPasswordInput
        ],
        excludeValues: (s) => [s.smsCredentials]
      })
    }
  },
  saved: (self) => {
    if (!isBackend()) self.updateStaticTexts()
  }
})
export class ApplicationSettings extends EntityBase {
  updateStaticTexts() {
    BasketType.boxes1Name = this.boxes1Name
    BasketType.boxes2Name = this.boxes2Name
    DeliveryStatus.FailedBadAddress.caption = this.AddressProblemStatusText
    DeliveryStatus.FailedNotHome.caption = this.NotHomeProblemStatusText
    DeliveryStatus.FailedDoNotWant.caption = this.DoNotWantProblemStatusText
    DeliveryStatus.FailedOther.caption = this.OtherProblemStatusText

    setCustomColumnInfo(
      customColumnInfo[1],
      this.familyCustom1Caption,
      this.familyCustom1Values
    )
    setCustomColumnInfo(
      customColumnInfo[2],
      this.familyCustom2Caption,
      this.familyCustom2Values
    )
    setCustomColumnInfo(
      customColumnInfo[3],
      this.familyCustom3Caption,
      this.familyCustom3Values
    )
    setCustomColumnInfo(
      customColumnInfo[4],
      this.familyCustom4Caption,
      this.familyCustom4Values
    )
    setCustomColumnInfo(
      questionForVolunteers[1],
      this.questionForVolunteer1Caption,
      this.questionForVolunteer1Values
    )
    setCustomColumnInfo(
      questionForVolunteers[2],
      this.questionForVolunteer2Caption,
      this.questionForVolunteer2Values
    )
    setCustomColumnInfo(
      questionForVolunteers[3],
      this.questionForVolunteer3Caption,
      this.questionForVolunteer3Values
    )
    setCustomColumnInfo(
      questionForVolunteers[4],
      this.questionForVolunteer4Caption,
      this.questionForVolunteer4Values
    )
    setCustomColumnInfo(
      registerQuestionForVolunteers[1],
      this.questionForRegistration1Caption,
      this.questionForRegistration1Values
    )
    setCustomColumnInfo(
      registerQuestionForVolunteers[2],
      this.questionForRegistration2Caption,
      this.questionForRegistration2Values
    )
    setCustomColumnInfo(
      registerQuestionForVolunteers[3],
      this.questionForRegistration3Caption,
      this.questionForRegistration3Values
    )
    setCustomColumnInfo(
      registerQuestionForVolunteers[4],
      this.questionForRegistration4Caption,
      this.questionForRegistration4Values
    )
  }
  @Fields.boolean<ApplicationSettings>({
    serverExpression: (self) =>
      !!self.smsCredentials?.password &&
      !!self.smsUsername &&
      !!self.smsClientNumber
  })
  bulkSmsEnabled: boolean

  get getInternationalPhonePrefix() {
    let r = this.forWho.args.internationalPrefixForSmsAndAws
    if (!r) r = '+972'
    return r
  }
  googleMapCountry() {
    let r = this.forWho.args.googleMapCountry
    if (!r) r = 'IL'
    return r
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async getPhoneOptions(deliveryId: string) {
    let ActiveFamilyDeliveries = await (
      await import('../families/FamilyDeliveries')
    ).ActiveFamilyDeliveries
    let d = await remult.repo(ActiveFamilyDeliveries).findFirst({
      id: deliveryId,
      $and: [ActiveFamilyDeliveries.isAllowedForUser()]
    })
    if (!d) return []
    let Families = await (await import('../families/families')).Families
    let family =
      await Families.getSpecificFamilyWithoutUserRestrictionsBackendOnly(
        d.family
      )
    let r: phoneOption[] = []
    let settings = await ApplicationSettings.getAsync()
    for (const x of settings.getPhoneStrategy()) {
      if (x.option) {
        await x.option.build({
          family: family,
          d: d,
          phoneItem: x,
          settings,
          addPhone: (name, phone) => r.push({ name: name, phone: phone })
        })
      }
    }
    return r
  }
  showVideo() {
    return (
      this.lang.languageCode == 'iw' &&
      !this.isSytemForMlt &&
      !this.hideVolunteerVideo
    )
  }

  @Fields.integer()
  id: number
  @Fields.string()
  organisationName: string

  @Fields.string({
    translation: (l) => l.smsMessageContentCaption,
    validate: validateSmsContent
  })
  smsText: string
  @Fields.string({
    translation: (l) => l.smsReminderMessageContentCaption,
    validate: validateSmsContent
  })
  reminderSmsText: string

  @Fields.string({ includeInApi: Roles.admin })
  confirmEventParticipationMessage: string = ''

  @Fields.string({
    translation: (l) => l.emailDonorContentCaption,
    validate: validateSmsContent
  })
  registerFamilyReplyEmailText: string
  @Fields.string({
    translation: (l) => l.emailHelperContentCaption,
    validate: validateSmsContent
  })
  registerHelperReplyEmailText: string
  @Fields.string({ caption: 'gMail UserName', includeInApi: Roles.admin })
  gmailUserName: string
  @Fields.string({ caption: 'gMail password', includeInApi: Roles.admin })
  gmailPassword: string
  @Fields.string()
  logoUrl: string
  @Fields.string()
  addressApiResult: string
  @Fields.string({
    translation: (l) => l.deliveryCenterAddress,
    customInput: (i) => i.addressInput()
  })
  address: string
  addressHelper = new AddressHelper(
    () => this.$.address,
    () => this.$.addressApiResult
  )
  @Fields.string({ translation: (l) => l.successMessageColumnName })
  commentForSuccessDelivery: string
  @Fields.string({ translation: (l) => l.leftByDoorMessageColumnName })
  commentForSuccessLeft: string
  @Fields.string({ translation: (l) => l.problemCommentColumnName })
  commentForProblem: string
  @Fields.string({ translation: (l) => l.messageForVolunteerWhenDoneCaption })
  messageForDoneDelivery: string
  @Fields.string({
    translation: (l) => l.messageEncouragementForVolunteer,
    includeInApi: isSderot()
  })
  messageEncouragement: string
  @Fields.string({ translation: (l) => l.helpName })
  helpText: string
  @Field(() => Phone)
  helpPhone: Phone
  @Fields.string()
  phoneStrategy: string

  getPhoneStrategy(): PhoneItem[] {
    try {
      return JSON.parse(this.phoneStrategy).map((x) => {
        return {
          name: x.name,
          phone: x.phone,
          option: PhoneOption[x.option]
        }
      })
    } catch {
      return [{ option: PhoneOption.assignerOrOrg }]
    }
  }
  getQuestions(): qaItem[] {
    try {
      return JSON.parse(this.commonQuestions)
    } catch {
      return []
    }
  }
  @Fields.string()
  commonQuestions: string
  @Fields.integer({ allowApiUpdate: false })
  dataStructureVersion: number
  @Fields.string({ translation: (l) => l.successButtonSettingName })
  deliveredButtonText: string
  @Fields.string({ translation: (l) => l.problemButtonSettingName })
  problemButtonText: string
  @Fields.string()
  AddressProblemStatusText: string
  @Fields.string()
  NotHomeProblemStatusText: string
  @Fields.string()
  DoNotWantProblemStatusText: string
  @Fields.string()
  OtherProblemStatusText: string

  @Fields.string({
    translation: (l) => l.descriptionInOrganizationList,
    customInput: (x) => x.textArea()
  })
  descriptionInOrganizationList: string
  @Field(() => Phone, { translation: (l) => l.phoneInOrganizationList })
  phoneInOrganizationList: Phone
  @Field(() => VolunteerNeedType, { caption: 'צריכים מתנדבים' })
  volunteerNeedStatus: VolunteerNeedType = VolunteerNeedType.none

  @Fields.string({
    translation: (l) => l.freeText1ForVolunteer,
    customInput: (x) => x.textArea()
  })
  message1Text: string
  @Fields.string({ translation: (l) => l.urlFreeText1 })
  message1Link: string
  @Fields.boolean({ translation: (l) => l.showText1OnlyWhenDone })
  message1OnlyWhenDone: boolean
  @Fields.string({
    translation: (l) => l.freeText2ForVolunteer,
    customInput: (x) => x.textArea()
  })
  message2Text: string
  @Fields.string({ translation: (l) => l.urlFreeText2 })
  message2Link: string
  @Fields.boolean({ translation: (l) => l.showText2OnlyWhenDone })
  message2OnlyWhenDone: boolean
  @Fields.boolean({ translation: (l) => l.hideVolunteerVideo })
  hideVolunteerVideo: boolean
  @Field(() => TranslationOptions)
  forWho: TranslationOptions = TranslationOptions.Families
  get lang() {
    return langByCode(this.forWho.args.languageFile)
  }
  @Fields.boolean({ dbName: 'forSoldiers' })
  _old_for_soliders: boolean
  @Fields.boolean({ translation: (l) => l.enableSelfPickupModule })
  usingSelfPickupModule: boolean
  @Fields.boolean()
  usingCallModule: boolean
  @Fields.string({
    caption: 'הנחיה בראש המסך',
    customInput: (x) => x.textArea()
  })
  callModuleMessageText: string
  @Fields.string({ caption: 'כתובת אינטרנט להנחיה בראש המסך' })
  callModuleMessageLink: string
  @Fields.boolean({ includeInApi: Roles.familyAdmin })
  defaultDeliveryStatusIsEnquireDetails: boolean
  getDefaultStatus(): DeliveryStatus {
    return this.usingCallModule && this.defaultDeliveryStatusIsEnquireDetails
      ? DeliveryStatus.enquireDetails
      : DeliveryStatus.ReadyForDelivery
  }

  get isSytemForMlt() {
    return this.forWho == TranslationOptions.donors
  }

  @Fields.boolean({ translation: (l) => l.showVolunteerCompany })
  showCompanies: boolean
  @Fields.boolean({ translation: (l) => l.activateEscort })
  manageEscorts: boolean
  @Fields.boolean()
  showHelperComment: boolean
  @Fields.boolean({ translation: (l) => l.filterFamilyGroups })
  showGroupsOnAssing: boolean
  @Fields.boolean({ translation: (l) => l.filterCity })
  showCityOnAssing: boolean
  @Fields.boolean({ translation: (l) => l.filterRegion })
  showAreaOnAssing: boolean
  @Fields.boolean({ translation: (l) => l.filterBasketType })
  showBasketOnAssing: boolean
  @Fields.boolean({ translation: (l) => l.selectNumberOfFamilies })
  showNumOfBoxesOnAssing: boolean
  @Fields.boolean({ translation: (l) => l.showLeftByHouseButton })
  showLeftThereButton: boolean
  @Fields.boolean()
  redTitleBar: boolean
  @Fields.string({ translation: (l) => l.defaultPhonePrefixForExcelImport })
  defaultPrefixForExcelImport: string
  @Fields.boolean()
  checkIfFamilyExistsInDb: boolean
  @Field(() => RemovedFromListExcelImportStrategy, {
    translation: (l) => l.existsInRemovedFromListStrategy
  })
  removedFromListStrategy: RemovedFromListExcelImportStrategy
  @Fields.boolean()
  checkIfFamilyExistsInFile: boolean
  @Fields.boolean()
  excelImportAutoAddValues: boolean
  @Fields.boolean()
  excelImportUpdateFamilyDefaultsBasedOnCurrentDelivery: boolean
  @Fields.boolean()
  checkDuplicatePhones: boolean
  @Fields.boolean()
  volunteerCanUpdateComment: boolean
  @Fields.boolean()
  volunteerCanUpdateDeliveryComment: boolean
  @Fields.boolean()
  hideFamilyPhoneFromVolunteer: boolean

  static serverHasPhoneProxy = false
  @Fields.boolean({ allowApiUpdate: false })
  usePhoneProxy: boolean
  @Fields.boolean()
  showOnlyLastNamePartToVolunteer: boolean
  @Fields.boolean()
  showTzToVolunteer: boolean
  @Fields.boolean({ allowApiUpdate: false })
  allowSendSuccessMessageOption: boolean
  @Fields.boolean()
  sendSuccessMessageToFamily: boolean
  @Fields.string()
  successMessageText: string
  @Fields.boolean()
  requireEULA: boolean
  @Fields.boolean()
  requireConfidentialityApprove: boolean
  @Fields.boolean()
  requireComplexPassword: boolean
  @Fields.integer()
  timeToDisconnect: number
  @Fields.integer()
  daysToForcePasswordChange: number
  @Fields.boolean()
  showDeliverySummaryToVolunteerOnFirstSignIn: boolean
  @Fields.boolean()
  showDistCenterAsEndAddressForVolunteer: boolean
  @Field(() => routeStrategy)
  routeStrategy: routeStrategy
  @Fields.integer({ translation: (l) => l.maxDeliveriesBeforeBusy })
  BusyHelperAllowedFreq_nom: number
  @Fields.integer({ translation: (l) => l.daysCountForBusy })
  BusyHelperAllowedFreq_denom: number
  @Fields.integer()
  MaxItemsQuantityInDeliveryThatAnIndependentVolunteerCanSee: number
  @Fields.integer()
  MaxDeliverisQuantityThatAnIndependentVolunteerCanAssignHimself: number
  @Fields.boolean()
  donotShowEventsInGeneralList: boolean
  @DataControl({
    clickIcon: 'mark_email_read'
  })
  @Fields.string<ApplicationSettings>({
    includeInApi: Roles.admin,
    clickWithTools: async (self, col, ui) => {
      if (await ui.YesNoPromise(use.language.sendTestEmail)) {
        await self.save()
        ui.Info(
          await ManageController.sendTestVolunteerRegistrationNotification()
        )
      }
    }
  })
  emailForVolunteerRegistrationNotification: string

  @Field(() => DeliveryStatus, {
    translation: (l) => l.defaultStatusType
  })
  @DataControl({
    valueList: [DeliveryStatus.ReadyForDelivery, DeliveryStatus.SelfPickup]
  })
  defaultStatusType: DeliveryStatus

  @Fields.string({ translation: (l) => l.boxes1NameCaption })
  boxes1Name: string
  @Fields.string({ translation: (l) => l.boxes2NameCaption })
  boxes2Name: string
  @Fields.string({
    translation: (l) => l.customColumn + ' 1 ' + l.caption,
    includeInApi: Roles.familyAdmin
  })
  familyCustom1Caption: string
  @Fields.string({
    translation: (l) => l.customColumn + ' 1 ' + l.optionalValues,
    includeInApi: Roles.familyAdmin
  })
  familyCustom1Values: string
  @Fields.string({
    translation: (l) => l.customColumn + ' 2 ' + l.caption,
    includeInApi: Roles.familyAdmin
  })
  familyCustom2Caption: string
  @Fields.string({
    translation: (l) => l.customColumn + ' 2 ' + l.optionalValues,
    includeInApi: Roles.familyAdmin
  })
  familyCustom2Values: string
  @Fields.string({
    translation: (l) => l.customColumn + ' 3 ' + l.caption,
    includeInApi: Roles.familyAdmin
  })
  familyCustom3Caption: string
  @Fields.string({
    translation: (l) => l.customColumn + ' 3 ' + l.optionalValues,
    includeInApi: Roles.familyAdmin
  })
  familyCustom3Values: string
  @Fields.string({
    translation: (l) => l.customColumn + ' 4 ' + l.caption,
    includeInApi: Roles.familyAdmin
  })
  familyCustom4Caption: string
  @Fields.string({
    translation: (l) => l.customColumn + ' 4 ' + l.optionalValues,
    includeInApi: Roles.familyAdmin
  })
  familyCustom4Values: string
  @Fields.boolean<ApplicationSettings>({
    serverExpression: (self) => remult.authenticated()
  })
  currentUserIsValidForAppLoadTest: boolean
  @Fields.string({
    translation: (l) => l.questionForVolunteer + ' 1 ' + l.caption
  })
  questionForVolunteer1Caption: string
  @Fields.string({
    translation: (l) => l.questionForVolunteer + ' 1 ' + l.optionalValues
  })
  questionForVolunteer1Values: string
  @Fields.string({
    translation: (l) => l.questionForVolunteer + ' 2 ' + l.caption
  })
  questionForVolunteer2Caption: string
  @Fields.string({
    translation: (l) => l.questionForVolunteer + ' 2 ' + l.optionalValues
  })
  questionForVolunteer2Values: string
  @Fields.string({
    translation: (l) => l.questionForVolunteer + ' 3 ' + l.caption
  })
  questionForVolunteer3Caption: string
  @Fields.string({
    translation: (l) => l.questionForVolunteer + ' 3 ' + l.optionalValues
  })
  questionForVolunteer3Values: string
  @Fields.string({
    translation: (l) => l.questionForVolunteer + ' 4 ' + l.caption
  })
  questionForVolunteer4Caption: string
  @Fields.string({
    translation: (l) => l.questionForVolunteer + ' 4 ' + l.optionalValues
  })
  questionForVolunteer4Values: string

  @Fields.string({
    translation: (l) => l.questionForRegistration + ' 1 ' + l.caption
  })
  questionForRegistration1Caption: string
  @Fields.string({
    translation: (l) => l.questionForRegistration + ' 1 ' + l.optionalValues
  })
  questionForRegistration1Values: string
  @Fields.string({
    translation: (l) => l.questionForRegistration + ' 2 ' + l.caption
  })
  questionForRegistration2Caption: string
  @Fields.string({
    translation: (l) => l.questionForRegistration + ' 2 ' + l.optionalValues
  })
  questionForRegistration2Values: string
  @Fields.string({
    translation: (l) => l.questionForRegistration + ' 3 ' + l.caption
  })
  questionForRegistration3Caption: string
  @Fields.string({
    translation: (l) => l.questionForRegistration + ' 3 ' + l.optionalValues
  })
  questionForRegistration3Values: string
  @Fields.string({
    translation: (l) => l.questionForRegistration + ' 4 ' + l.caption
  })
  questionForRegistration4Caption: string
  @Fields.string({
    translation: (l) => l.questionForRegistration + ' 4 ' + l.optionalValues
  })
  questionForRegistration4Values: string

  @Fields.boolean()
  registerAskTz: boolean
  @Fields.boolean()
  registerRequireTz: boolean

  @Fields.boolean()
  registerAskEmail: boolean
  @Fields.boolean()
  registerAskPreferredDistributionAreaAddress: boolean
  @Fields.boolean()
  registerAskPreferredFinishAddress: boolean
  @Fields.boolean()
  askVolunteerForLocationOnDelivery: boolean
  @Fields.boolean()
  askVolunteerForAPhotoToHelp: boolean
  @Fields.string()
  questionForVolunteerWhenUploadingPhoto: string
  @Fields.boolean({ includeInApi: Roles.admin })
  createBasketsForAllFamiliesInCreateEvent: boolean
  @Field(() => GroupsValue, { includeInApi: Roles.admin })
  includeGroupsInCreateEvent: GroupsValue
  @Field(() => GroupsValue, { includeInApi: Roles.admin })
  excludeGroupsInCreateEvent: GroupsValue

  @Fields.object({ includeInApi: false, allowNull: true })
  smsCredentials?: {
    password: string
  }
  @Fields.string({ includeInApi: Roles.admin })
  smsClientNumber: string
  @Fields.string({ includeInApi: Roles.admin })
  smsUsername: string
  @Fields.string<ApplicationSettings>({
    includeInApi: Roles.admin,
    inputType: 'password',
    serverExpression: (self) => (self.smsCredentials?.password ? '****' : '')
  })
  smsPasswordInput: string
  @Fields.string({ includeInApi: Roles.admin })
  smsVirtualPhoneNumber: string

  @Fields.string({
    includeInApi: Roles.admin && isSderot()
  })
  firebaseCredentials: string
  @Fields.string({
    includeInApi: Roles.admin && isSderot()
  })
  firebaseConfig: string
  @Fields.string({ includeInApi: Roles.admin && isSderot() })
  firebaseVapidKey: string

  @Fields.boolean({ includeInApi: Roles.admin })
  familySelfOrderEnabled: boolean
  @Fields.string({ includeInApi: Roles.admin })
  familySelfOrderMessage: string
  @Fields.boolean({ includeInApi: Roles.admin })
  familyConfirmDetailsEnabled: boolean

  @Fields.string({ includeInApi: Roles.admin })
  inviteVolunteersMessage: string
  @Fields.boolean({ allowApiUpdate: Roles.admin })
  allowVolunteerToSeePreviousActivities: boolean

  @Fields.string({ allowApiUpdate: Roles.superAdmin })
  customSmsOriginForSmsToVolunteer: string

  @Fields.boolean({ allowApiUpdate: Roles.superAdmin })
  allowSmsToFamily: boolean

  @Fields.boolean({ allowApiUpdate: Roles.superAdmin })
  sendOnTheWaySMSToFamily: boolean
  @Fields.boolean({ allowApiUpdate: Roles.superAdmin })
  sendOnTheWaySMSToFamilyOnSendSmsToVolunteer: boolean

  @Fields.string({ allowApiUpdate: Roles.superAdmin })
  customSmsOriginForSmsToFamily: string
  @Fields.boolean({ allowApiUpdate: Roles.superAdmin })
  enableOtp: boolean

  @Fields.string()
  webhookUrl = ''

  static get() {
    return getSettings()
  }
  static async getAsync(): Promise<ApplicationSettings> {
    return await remult
      .repo(ApplicationSettings)
      .findFirst(undefined, { useCache: true })
  }
  setDefaultsForProblemStatuses() {
    this.problemButtonText = this.lang.ranIntoAProblem
    this.AddressProblemStatusText = this.lang.notDeliveredBadAddress
    this.NotHomeProblemStatusText = this.lang.notDeliveredNotHome
    this.DoNotWantProblemStatusText = this.lang.notDeliveredDontWant
    this.OtherProblemStatusText = this.lang.notDeliveredOther
  }
}
export class PhoneOption {
  static assignerOrOrg = new PhoneOption(
    'assignerOrOrg',
    'הטלפון ממנו יצא הSMS',
    async (args) => {
      if (args.d.distributionCenter?.phone1?.thePhone) {
        args.addPhone(
          args.d.distributionCenter.phone1Description,
          args.d.distributionCenter.phone1.displayValue
        )
        if (args.d.distributionCenter.phone2)
          args.addPhone(
            args.d.distributionCenter.phone2Description,
            args.d.distributionCenter.phone2.displayValue
          )
      } else if (args.settings.helpText) {
        args.addPhone(
          args.settings.helpText,
          args.settings.$.helpPhone.displayValue
        )
      } else {
        let h = args.d.courierAssignUser
        args.addPhone(h.name, h.phone.displayValue)
      }
    }
  )
  static familyHelpPhone = new PhoneOption(
    'familyHelpPhone',
    'איש קשר לבירור כפי שמוגדר למשפחה',
    async (args) => {
      if (args.family.socialWorker && args.family.socialWorkerPhone1) {
        args.addPhone(
          args.family.socialWorker,
          args.family.socialWorkerPhone1.displayValue
        )
      }
      if (args.family.socialWorker && args.family.socialWorkerPhone2) {
        args.addPhone(
          args.family.socialWorker,
          args.family.socialWorkerPhone2.displayValue
        )
      }
    }
  )
  static defaultVolunteer = new PhoneOption(
    'defaultVolunteer',
    use ? use.language.defaultVolunteer : '',
    async (args) => {
      if (
        args.family.fixedCourier &&
        args.d.courier != args.family.fixedCourier
      ) {
        let h = await args.family.fixedCourier
        args.addPhone(
          getLang().defaultVolunteer + ': ' + h.name,
          h.phone.displayValue
        )
      }
    }
  )

  static familySource = new PhoneOption(
    'familySource',
    'טלפון גורם מפנה',
    async (args) => {
      if (args.family.familySource) {
        let s = args.family.familySource
        if (s && s.phone) {
          let name = s.contactPerson
          if (!name || name.length == 0) {
            name = s.name
          }
          args.addPhone(name, s.phone.displayValue)
        }
      }
    }
  )
  static otherPhone = new PhoneOption(
    'otherPhone',
    'טלפון אחר',
    async (args) => {
      if (args.phoneItem.phone) {
        args.addPhone(
          args.phoneItem.name,
          args.settings.forWho.formatPhone(args.phoneItem.phone)
        )
      }
    }
  )
  constructor(
    public key: string,
    public name: string,
    public build: (args: phoneBuildArgs) => Promise<void>
  ) {}
}
export interface PhoneItem {
  option: PhoneOption
  name?: string
  phone?: string
}
export interface phoneOption {
  name: string
  phone: string
}
export interface qaItem {
  question?: string
  answer?: string
}
export interface phoneBuildArgs {
  family: import('../families/families').Families
  d: import('../families/FamilyDeliveries').FamilyDeliveries
  phoneItem: PhoneItem
  settings: ApplicationSettings
  addPhone: (name: string, value: string) => void
}

export const customColumnInfo: customColumnInfo[] = [{}, {}, {}, {}, {}]
export const questionForVolunteers: customColumnInfo[] = [{}, {}, {}, {}, {}]
export const registerQuestionForVolunteers: customColumnInfo[] = [
  {},
  {},
  {},
  {},
  {}
]

export function getCustomColumnVisible(defs: FieldMetadata) {
  return defs.caption != undefined
}

export function setCustomColumnInfo(
  v: customColumnInfo,
  caption: string,
  values: string
) {
  v.visible = !!caption
  v.caption = caption
  v.values = undefined
  if (values) {
    v.values = values.split(',').map((x) => x.trim())
  }
}
export const settingsForSite = new Map<string, SmallSettings>()
export function setSettingsForSite(
  site: string,
  settings: ApplicationSettings
) {
  const {
    usingSelfPickupModule,
    familySelfOrderEnabled,
    familyConfirmDetailsEnabled,
    manageEscorts,
    requireComplexPassword,
    forWho,
    getInternationalPhonePrefix,
    boxes2Name,
    boxes1Name,
    isSytemForMlt,
    addressHelper,
    helpPhone,
    helpText,
    bulkSmsEnabled,
    logoUrl,
    organisationName,
    hideFamilyPhoneFromVolunteer,
    allowVolunteerToSeePreviousActivities,
    usingCallModule,
    phoneInOrganizationList,
    descriptionInOrganizationList,
    volunteerNeedStatus,
    sendOnTheWaySMSToFamily,
    sendOnTheWaySMSToFamilyOnSendSmsToVolunteer
  } = settings
  const { ok, getAddress, getCity, getlonglat, location } = addressHelper
  settingsForSite.set(site, {
    defaultStatus: settings.getDefaultStatus(),
    usingCallModule,
    usingSelfPickupModule,
    familySelfOrderEnabled,
    familyConfirmDetailsEnabled,
    manageEscorts,
    requireComplexPassword,
    forWho,
    getInternationalPhonePrefix,
    boxes2Name,
    boxes1Name,
    isSytemForMlt,
    addressHelper: {
      ok,
      getAddress,
      getCity,
      getlonglat,
      location
    },
    helpPhone,
    helpText,
    bulkSmsEnabled,
    logoUrl,
    organisationName,
    hideFamilyPhoneFromVolunteer,
    allowVolunteerToSeePreviousActivities,
    descriptionInOrganizationList,
    volunteerNeedStatus,
    phoneInOrganizationList: phoneInOrganizationList?.thePhone,
    phoneInOrganizationListDisplay: phoneInOrganizationList?.displayValue,
    anyFamilySms: settings.allowSmsToFamily || settings.sendOnTheWaySMSToFamily,
    allowSmsToFamily: settings.allowSmsToFamily,
    sendOnTheWaySMSToFamily,
    sendOnTheWaySMSToFamilyOnSendSmsToVolunteer:
      sendOnTheWaySMSToFamilyOnSendSmsToVolunteer && sendOnTheWaySMSToFamily,
    registerRequireTz: settings.registerAskTz && settings.registerRequireTz
  })
}
export function getSettings(): SmallSettings {
  let r = settingsForSite.get(Sites.getValidSchemaFromContext())
  if (r) return r
  //if (context.backend) {
  return new SmallSettings()
  throw "can't find application settings on server for this request"
}
export class SmallSettings {
  defaultStatus: DeliveryStatus = DeliveryStatus.ReadyForDelivery
  allowVolunteerToSeePreviousActivities: boolean = false
  usingSelfPickupModule: boolean = false
  usingCallModule: boolean = false
  familySelfOrderEnabled: boolean = false
  familyConfirmDetailsEnabled = false
  manageEscorts: boolean = false
  requireComplexPassword: boolean = false
  forWho: TranslationOptions
  getInternationalPhonePrefix: string = ''
  boxes2Name: string = ''
  boxes1Name: string = ''
  isSytemForMlt: boolean = false
  addressHelper: SmallAdressHelper = new SmallAdressHelper()
  helpPhone: Phone = new Phone('')
  helpText: string = ''
  bulkSmsEnabled: boolean = false
  logoUrl: string = ''
  organisationName: string = ''
  hideFamilyPhoneFromVolunteer: boolean = false
  volunteerNeedStatus: VolunteerNeedType = VolunteerNeedType.none
  descriptionInOrganizationList: string = ''
  phoneInOrganizationList: string = ''
  phoneInOrganizationListDisplay: string = ''
  anyFamilySms: boolean
  allowSmsToFamily: boolean
  sendOnTheWaySMSToFamily: boolean
  sendOnTheWaySMSToFamilyOnSendSmsToVolunteer: boolean
  registerRequireTz: boolean
}
export class SmallAdressHelper {
  ok: boolean = false
  getAddress: string = ''
  getCity: string = ''
  getlonglat: string = ''
  location: Location = undefined
}

interface customColumnInfo {
  caption?: string
  visible?: boolean
  values?: string[]
}
export function includePhoneInApi() {
  var s = getSettings()
  if (!s.hideFamilyPhoneFromVolunteer) return true
  if (remult.isAllowed(Roles.distCenterAdmin)) return true
  return false
}
export function validateSmsContent(
  entity: unknown,
  c: ValidateFieldEvent<unknown, string>
) {
  return
  if (c.value && c.value.indexOf('!אתר!') < 0 && c.value.indexOf('!URL!') < 0)
    c.error = this.lang.mustIncludeUrlKeyError
}
