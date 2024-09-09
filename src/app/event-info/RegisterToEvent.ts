import {
  DataAreaFieldsSetting,
  DataControl
} from '../common-ui-elements/interfaces'
import {
  BackendMethod,
  Controller,
  getFields,
  Validators,
  EventSource,
  FieldMetadata,
  FieldRef,
  FieldsRef,
  remult
} from 'remult'
import { actionInfo } from 'remult/internals'
import {
  EventInList,
  volunteersInEvent,
  Event,
  eventDisplayDate,
  EventSettings
} from '../events/events'
import { Helpers } from '../helpers/helpers'
import { BELOW_18_ERROR, InitContext, UITools } from '../helpers/init-context'
import {
  CustomColumn,
  getSettings,
  registerQuestionForVolunteers
} from '../manage/ApplicationSettings'
import { ManageController } from '../manage/manage.controller'
import { Phone } from '../model-shared/phone'
import { Email } from '../model-shared/types'
import { doOnRemoteHagai } from '../overview/remoteHagai'
import { Sites } from '../sites/sites'
import { Field, use, Fields } from '../translate'
import { FieldsRefForEntityBase } from 'remult'

function storedInfo(): VolunteerInfo {
  let r = localStorage.getItem(infoKeyInStorage)
  if (r) return JSON.parse(r)
  return {
    phone: '',
    name: '',
    lastName: '',
    over18: false
  }
}

@Controller('event-Info')
export class RegisterToEvent {
  static init() {
    if (!RegisterToEvent.volunteerInfo)
      RegisterToEvent.volunteerInfo = storedInfo()
  }
  questions: {
    field: FieldRef
    show: () => boolean
    helperField?: FieldMetadata
    caption?: string
    values?: string
    getFieldToUpdate: (
      h: FieldsRefForEntityBase<Helpers>,
      e: FieldsRefForEntityBase<volunteersInEvent>
    ) => FieldRef
  }[] = []
  inited = false
  async init(s: EventSettings) {
    if (this.inited) return
    this.inited = true
    if (!actionInfo.runningOnServer) {
      this.phone = new Phone(RegisterToEvent.volunteerInfo.phone)
      this.name = RegisterToEvent.volunteerInfo.name
      this.lastName = RegisterToEvent.volunteerInfo.lastName || ''
      this.over18 = RegisterToEvent.volunteerInfo.over18
      let h = await remult.context.getCurrentUser()
      if (h) {
        this.socialSecurityNumber = h.socialSecurityNumber
        this.email = h.email
        this.preferredDistributionAreaAddress =
          h.preferredDistributionAreaAddress
        this.preferredFinishAddress = h.preferredFinishAddress
      }
    }
    this.questions.push({
      field: this.$.socialSecurityNumber,
      show: () => s.registerAskTz,
      getFieldToUpdate: (h) => h.socialSecurityNumber
    })
    this.questions.push({
      field: this.$.email,
      show: () => s.registerAskEmail,
      getFieldToUpdate: (h) => h.email
    })
    this.questions.push({
      field: this.$.preferredDistributionAreaAddress,
      show: () => s.registerAskPreferredDistributionAreaAddress,
      getFieldToUpdate: (h) => h.preferredDistributionAreaAddress
    })
    this.questions.push({
      field: this.$.preferredFinishAddress,
      show: () => s.registerAskPreferredFinishAddress,
      getFieldToUpdate: (h) => h.preferredFinishAddress
    })
    this.questions.push({
      field: this.$.a1,
      caption: s.questionForRegistration1Caption,
      values: s.questionForRegistration1Values,
      show: () => !!s.questionForRegistration1Caption,
      getFieldToUpdate: (h, e) => e.a1
    })
    this.questions.push({
      field: this.$.a2,
      caption: s.questionForRegistration2Caption,
      values: s.questionForRegistration2Values,
      show: () => !!s.questionForRegistration2Caption,
      getFieldToUpdate: (h, e) => e.a2
    })
    this.questions.push({
      field: this.$.a3,
      caption: s.questionForRegistration3Caption,
      values: s.questionForRegistration3Values,
      show: () => !!s.questionForRegistration3Caption,
      getFieldToUpdate: (h, e) => e.a3
    })
    this.questions.push({
      field: this.$.a4,
      caption: s.questionForRegistration4Caption,
      values: s.questionForRegistration4Values,
      show: () => !!s.questionForRegistration4Caption,
      getFieldToUpdate: (h, e) => e.a4
    })
  }
  static volunteerInfo: VolunteerInfo
  static volunteerInfoChanged = new EventSource()
  @DataControl({ allowClick: () => false })
  @Field<RegisterToEvent, Phone>(() => Phone, {
    translation: (l) => l.phone,
    valueType: Phone,
    validate: (e, c) => {
      if (!remult.authenticated()) {
        if (c.value) c.value = new Phone(Phone.fixPhoneInput(c.value.thePhone))
        Phone.validatePhone(c, true)
      }
    }
  })
  phone: Phone
  @Fields.string<RegisterToEvent>({
    caption: 'שם',
    validate: (e, name) => {
      if (!remult.authenticated()) {
        Validators.required(remult.context.lang.nameIsTooShort)(e, name)
      }
    }
  })
  name: string
  @Fields.string<RegisterToEvent>({
    caption: use.language.lastName
  })
  lastName: string
  @Fields.boolean({ translation: (l) => 'אני מעל גיל 18?' })
  over18: boolean
  @Fields.boolean({
    translation: (l) => 'קראתי את הצהרת ההתנדבות ואני מאשר/ת את הכתוב בה',
    customInput: (x) => x.ugaConfirm()
  })
  agreeToTerms: boolean
  @Fields.boolean({ translation: (l) => l.rememberMeOnThisDevice })
  rememberMeOnThisDevice: boolean

  @Fields.string()
  a1: string = ''
  @Fields.string()
  a2: string = ''
  @Fields.string()
  a3: string = ''
  @Fields.string()
  a4: string = ''
  @Fields.string<RegisterToEvent>({
    translation: (l) => l.socialSecurityNumber,
    validate: (e, tz) => {
      if (getSettings().registerRequireTz) {
        Validators.required(remult.context.lang.requiredField)(e, tz)
      }
    }
  })
  socialSecurityNumber: string = ''
  @Field(() => Email)
  email: Email = new Email('')
  @Fields.string({
    translation: (l) => l.preferredDistributionAreaAddress,
    customInput: (c) => c.addressInput()
  })
  preferredDistributionAreaAddress: string = ''
  @Fields.string({
    dbName: 'preferredDistributionAreaAddress2',
    customInput: (c) => c.addressInput()
  })
  preferredFinishAddress: string = ''

  get $() {
    return getFields<RegisterToEvent>(this, remult)
  }
  async registerToEvent(e: EventInList, ui: UITools) {
    ui.trackVolunteer('register-event:' + e.site)
    if (!e.settings) {
      e.settings = {} as any
    }
    const site = e.site || remult.context.getSite()
    const isUga = site == 'uga' || site === 'test1'
    await this.init(e.settings)
    this.a1 = ''
    this.a2 = ''
    this.a3 = ''
    this.a4 = ''
    const sp = new URLSearchParams(window.location.search)
    for (const f of [this.$.a1, this.$.a2, this.$.a3, this.$.a4]) {
      let val = sp.get(f.metadata.key)
      if (val) f.value = val
    }
    let lang = remult.context.lang
    this.rememberMeOnThisDevice = storedInfo().name != ''
    let currentHelper = await remult.context.getCurrentUser()
    if (remult.authenticated()) {
      this.phone = currentHelper.phone
      this.name = currentHelper.name
    }
    if (
      !remult.authenticated() ||
      this.questions.filter((x) => x.show()).length > 0 ||
      e.remoteUrl
    )
      await ui.inputAreaDialog({
        title: lang.register,
        helpText: lang.registerHelpText,
        fields: [
          { field: this.$.name, visible: () => !remult.authenticated() },
          { field: this.$.lastName, visible: () => !remult.authenticated() },
          { field: this.$.phone, visible: () => !remult.authenticated() },

          ...this.questions
            .filter((x) => x.show())
            .map(
              (x) =>
                ({
                  field: x.field,
                  click: null,
                  caption: x.caption,
                  valueList:
                    x.values && x.values.split(',').map((x) => x.trim())
                } as DataAreaFieldsSetting)
            ),
          {
            field: this.$.over18,
            caption: isUga
              ? 'אני מעל גיל 18 או שאגיע למקום ההתנדבות בליווי מבוגר'
              : this.$.over18.metadata.caption,
            visible: () => e.settings.registerOnlyOver18 || isUga
          },
          {
            field: this.$.agreeToTerms,
            visible: () => isUga
          },
          this.$.rememberMeOnThisDevice
        ],
        cancel: () => {},

        validate: async () => {
          if (isUga) {
            if (!remult.authenticated()) {
              if (!this.over18) {
                throw 'חובה להיות מעל גיל 18 או להגיע בליווי מבוגר'
              }
              if (!this.lastName?.trim()) {
                this.$.lastName.error = 'חסר ערך'
                throw 'חובה להזין שם משפחה'
              }
              if (!this.agreeToTerms) throw 'יש לאשר את הצהרת ההתנדבות'
            }
          }
        },
        ok: async () => {
          this.updateEvent(
            e,
            await this.registerVolunteerToEvent(e.id, e.site, true, e.remoteUrl)
          )

          if (currentHelper) await currentHelper._.reload()
          let refresh = false
          if (this.phone.thePhone != RegisterToEvent.volunteerInfo.phone)
            refresh = true
          RegisterToEvent.volunteerInfo = {
            phone: this.phone.thePhone,
            name: this.name,
            lastName: this.lastName,
            over18: this.over18
          }
          if (this.rememberMeOnThisDevice)
            localStorage.setItem(
              infoKeyInStorage,
              JSON.stringify(RegisterToEvent.volunteerInfo)
            )
          if (refresh) RegisterToEvent.volunteerInfoChanged.fire()
          let message =
            lang.youVeRegisteredTo +
            ' ' +
            e.name +
            ', ' +
            eventDisplayDate(e) +
            lang.thanksForVolunteering
          ui.messageDialog(message).then(() => {
            ui.Info(message)
          })
        }
      })
    else {
      this.updateEvent(
        e,
        await this.registerVolunteerToEvent(e.id, e.site, true, e.remoteUrl)
      )
    }
  }
  async updateEvent(e: EventInList, update: EventInList) {
    if (e instanceof Event) await e._.reload()
    else Object.assign(e, update)
  }
  async removeFromEvent(e: EventInList, ui: UITools) {
    ui.trackVolunteer('un-register-event:' + e.site)
    await this.init(e.settings)
    this.updateEvent(
      e,
      await this.registerVolunteerToEvent(e.id, e.site, false, e.remoteUrl)
    )
  }
  @BackendMethod({ allowed: true })
  async registerVolunteerToEvent(
    id: string,
    site: string,
    register: boolean,
    remoteUrl?: string
  ) {
    if (remoteUrl)
      return await doOnRemoteHagai(async (remote, url) => {
        return await remote
          .call(this.registerVolunteerToEvent, this, id, site, register)
          .then((x: EventInList) => ({
            ...x,
            remoteUrl: url,
            eventLogo: remoteUrl + x.eventLogo
          }))
      })
    if (site) {
      let dp = Sites.getDataProviderForOrg(site)

      remult.dataProvider = dp
      Sites.setSiteToContext(site)
      await InitContext(remult)
    }
    const event = await remult.repo(Event).findId(id)
    const eventSettings = (await event.toEventInList(undefined)).settings
    await this.init(eventSettings)
    if (eventSettings.registerOnlyOver18 && !this.over18 && register)
      throw BELOW_18_ERROR
    let helper: Helpers
    if (remult.authenticated()) {
      helper = await remult.repo(Helpers).findId(remult.user.id)
    } else {
      helper = await remult.repo(Helpers).findFirst(
        { phone: this.phone },
        {
          createIfNotFound: register
        }
      )
      if (helper.isNew()) {
        helper.name = (this.name + ' ' + this.lastName).trim()
        await helper.save()
      }
      remult.user = {
        id: helper.id,
        name: helper.name,
        roles: [],
        theHelperIAmEscortingId: undefined,
        distributionCenter: '',
        escortedHelperName: ''
      }
    }
    let helperInEvent = await remult.repo(volunteersInEvent).findFirst(
      { eventId: id, helper },
      {
        createIfNotFound: register
      }
    )
    if (register) {
      helperInEvent.canceled = false
      helperInEvent.fromGeneralList = !!site
      for (const q of this.questions.filter((q) => q.show())) {
        if (q.field.displayValue || remult.authenticated()) {
          let target = q.getFieldToUpdate(helper.$, helperInEvent.$)
          if (target) target.value = q.field.value
        }
      }
      await helper.save()
      //console.log(helperInEvent.$.toArray().filter(x => x.valueChanged()).map(({ value, originalValue, ...f }) => ({ key: f.metadata.key, value, originalValue })));
      await helperInEvent.save()
    } else {
      helperInEvent.canceled = true
      await helperInEvent.save()
    }

    try {
      const l = remult.context.lang
      const what =
        helper.name +
        ' ' +
        (register ? l.hasRegisteredTo : l.hasCanceledRegistration) +
        ' ' +
        event.name
      ManageController.sendEmailFromHagaiAdmin(
        what,
        l.hello +
          ' ' +
          (await remult.context.getSettings()).organisationName +
          '\r\n\r\n' +
          what +
          ' ' +
          l.thatWillTakePlaceAt +
          ' ' +
          event.$.eventDate.displayValue
      )
    } catch {}
    return event.toEventInList(helper)
  }
}
const infoKeyInStorage = 'myVolunteerInfo'
interface VolunteerInfo {
  phone: string
  name: string
  lastName: string
  over18: boolean
}
