import {
  BackendMethod,
  Controller,
  ControllerBase,
  Validators,
  repo,
  remult,
  isBackend
} from 'remult'
import { Field, use, Fields } from '../translate'
import {
  DataControl,
  getEntityValueList
} from '../common-ui-elements/interfaces'
import { Phone, isPhoneValidForIsrael } from '../model-shared/phone'
import { Families, autocompleteResult } from '../families/families'
import { usesIntakeForm } from '../sites/sites'
import { BasketType } from '../families/BasketType'
import { FamilySources } from '../families/FamilySources'
import { DeliveryStatus } from '../families/DeliveryStatus'

@Controller('intake-form')
export class IntakeFormController extends ControllerBase {
  @Fields.string({
    translation: (l) => l.socialSecurityNumber
  })
  tz: string

  @Fields.string({
    translation: (l) => l.firstName,
    validate: Validators.required.withMessage(use.language.nameIsTooShort)
  })
  firstName: string

  @Fields.string({
    translation: (l) => l.lastName,
    validate: Validators.required.withMessage(use.language.nameIsTooShort)
  })
  name: string

  @Fields.string<IntakeFormController, string>({
    translation: (t) => t.address,
    customInput: (c) =>
      c.addressInput((x, d) => {
        d.addressByGoogle = x.addressByGoogle
        d.addressApiResult = JSON.stringify({
          address: d.address,
          result: x.autoCompleteResult
        } as autocompleteResult)
      }),
    validate: (f) => {
      if (!f.addressByGoogle && !isBackend()) throw 'נא לבחור כתובת שגוגל מוצא'
    }
  })
  address: string

  addressByGoogle: string
  @Fields.string()
  addressApiResult: string

  @Fields.string()
  floor: string
  @Fields.string()
  appartment: string
  @Fields.string()
  entrance: string

  @Fields.string()
  addressComment: string

  @Field<IntakeFormController, Phone>(() => Phone, {
    validate: [
      (f, p) => {
        if (!isPhoneValidForIsrael(p.value?.thePhone)) throw 'טלפון שגוי'
      }
    ]
  })
  phone1: Phone
  @Fields.string()
  phone1Description: string
  @Field(() => Phone)
  phone2: Phone
  @Fields.string()
  phone2Description: string
  @Fields.string({ caption: 'שם ממלא הטופס', validate: Validators.required })
  fillerName: string
  @Field<IntakeFormController, Phone>(() => Phone, {
    caption: 'טלפון ממלא הטופס',
    validate: [
      Validators.required,
      (f, p) => {
        if (!isPhoneValidForIsrael(p.value?.thePhone)) throw 'טלפון שגוי'
      }
    ]
  })
  fillerPhone: Phone
  @DataControl({ valueList: ['', 'מוקד', 'עובדת סוציאלית', 'מתנדב'] })
  @Fields.string({ caption: 'תפקיד', validate: Validators.required })
  role: string = ''

  basketTypes: Awaited<ReturnType<typeof IntakeFormController.getBasketTypes>>
  @Fields.string<IntakeFormController, string>({
    caption: 'איך אפשר לעזור?',
    validate: async (i, b) => {
      if (!i.basketTypes)
        i.basketTypes = await IntakeFormController.getBasketTypes()
      if (!i.basketTypes.find((bb) => bb.id == b.value))
        throw Error('נא לבחור ' + b.metadata.caption)
    }
  })
  basketType: string
  @Fields.string<IntakeFormController, string>({
    caption: 'מידע נוסף'
  })
  deliveryComments: string
  @BackendMethod({ allowed: usesIntakeForm })
  static async getBasketTypes() {
    return repo(BasketType)
      .find({})
      .then((x) =>
        x.map(({ id, name, intakeCommentInstructions }) => ({
          id,
          name,
          intakeCommentInstructions
        }))
      )
  }
  @BackendMethod({ allowed: usesIntakeForm })
  async submit() {
    let s = await repo(FamilySources).findFirst({ id: 'טופס אינטרנט' })
    if (!s) {
      s = await repo(FamilySources).insert({
        id: 'טופס אינטרנט',
        name: 'טופס אינטרנט'
      })
    }
    const f = await repo(Families).insert({
      name: this.firstName + ' ' + this.name,
      tz: this.tz,
      address: this.address,
      autoCompleteResult: this.addressApiResult,
      floor: this.floor,
      appartment: this.appartment,
      entrance: this.entrance,
      addressComment: this.addressComment,
      phone1: this.phone1,
      phone1Description: this.phone1Description,
      phone2: this.phone2,
      phone2Description: this.phone2Description,
      basketType: await repo(BasketType).findId(this.basketType),
      deliveryComments: this.deliveryComments,
      socialWorker: this.fillerName + ' ' + this.role,
      socialWorkerPhone1: this.fillerPhone
    })
    const d = await f.createDelivery(
      await remult.context.defaultDistributionCenter()
    )
    d.deliverStatus = DeliveryStatus.enquireDetails
    await d.save()
    return 'הפנייה התקבלה'
  }
}

Validators.required.defaultMessage = 'חסר ערך'
