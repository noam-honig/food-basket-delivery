import {
  BackendMethod,
  FieldMetadata,
  FieldsMetadata,
  IdEntity,
  remult
} from 'remult'
import { ClassType } from 'remult/classType'
import { Roles } from '../auth/roles'
import { quantityHelper } from '../families/BasketType'
import { DeliveryStatus } from '../families/DeliveryStatus'
import { Families } from '../families/families'
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries'
import { Helpers, HelpersBase } from '../helpers/helpers'
import { UITools } from '../helpers/init-context'
import { getSettings } from '../manage/ApplicationSettings'
import { use } from '../translate'

export class OptionalFieldsDefinition<dataArgs> {
  fields: {
    key: string
    caption: string
    build: (args: dataArgs) => string
  }[] = []
  remult = remult
  addFields<entityType extends IdEntity>(
    entity: ClassType<entityType>,
    extractFromArgs: (x: dataArgs) => entityType,
    getFields: (entity: FieldsMetadata<entityType>) => FieldMetadata[]
  ) {
    let repo = remult.repo(entity)
    let meta = repo.metadata
    for (const field of getFields(meta.fields)) {
      let key = meta.key + '_' + field.key
      this.fields.push({
        key,
        caption: field.caption,
        build: (args) => extractFromArgs(args).$.find(field).displayValue
      })
    }
  }
  buildObject(id: string, args: dataArgs) {
    let r = { id }
    for (const field of this.fields) {
      r[field.key] = field.build(args)
    }
    return r
  }
}

export class VolunteerReportDefs extends OptionalFieldsDefinition<{
  fd: ActiveFamilyDeliveries
  f: Families
}> {
  constructor(private ui: UITools) {
    super()
    this.fields.push({
      key: this.nameKey,
      caption: remult.context.lang.familyName,
      build: ({ fd }) => (fd.courier ? fd.routeOrder + '. ' : '') + fd.name
    })
    this.fields.push({
      key: this.helperPhoneKey,
      caption: remult.context.lang.volunteerPhoneNumber,
      build: ({ fd }) => (fd.courier ? fd.courier?.phone?.displayValue : '')
    })
    this.fields.push({
      key: this.helperCommentKey,
      caption: remult.context.lang.volunteerComment,
      build: ({ fd }) => (fd.courier ? fd.courier?.eventComment : '')
    })
    this.fields.push({
      key: 'address',
      caption: remult.context.lang.fullAddress,
      build: ({ fd }) =>
        fd.getAddressDescription() +
        (fd.entrance
          ? ', \n' + fd.$.entrance.metadata.caption + ': ' + fd.entrance
          : '') +
        (fd.floor
          ? ', \n' + fd.$.floor.metadata.caption + ': ' + fd.floor
          : '') +
        (fd.appartment
          ? ', \n' + fd.$.appartment.metadata.caption + ': ' + fd.appartment
          : '') +
        (fd.buildingCode
          ? ', \n' + fd.$.buildingCode.metadata.caption + ': ' + fd.buildingCode
          : '') +
        (fd.addressComment
          ? ', \n' + remult.context.lang.notice + ': ' + fd.addressComment
          : '')
    })
    this.fields.push({
      key: this.basketTypeKey,
      caption: remult.context.lang.basketType,
      build: ({ fd }) =>
        (fd.quantity > 1 ? fd.quantity + ' X ' : '') +
        fd.$.basketType.displayValue
    })
    this.fields.push({
      key: this.quantityKey,
      caption: remult.context.lang.quantity,
      build: ({ fd }) => fd.quantity.toString()
    })
    this.fields.push({
      key: 'deliveryComments',
      caption: remult.context.lang.commentForVolunteer,
      build: ({ fd }) => fd.$.deliveryComments.displayValue
    })
    this.fields.push({
      key: 'boxes1',
      caption: getSettings().boxes1Name,
      build: ({ fd }) => (fd.quantity * fd.basketType?.boxes)?.toString()
    })
    this.fields.push({
      key: 'boxes2',
      caption: getSettings().boxes2Name,
      build: ({ fd }) => (fd.quantity * fd.basketType?.boxes2)?.toString()
    })
    this.fields.push({
      key: this.itemsKey,
      caption: remult.context.lang.items,
      build: ({ fd }) => {
        let toTake = new quantityHelper()
        toTake.parseComment(fd.items)
        if (fd.basketType) {
          toTake.parseComment(fd.basketType.whatToTake, fd.quantity)
        }
        return toTake.toString()
      }
    })

    this.addFields(
      ActiveFamilyDeliveries,
      (a) => a.fd,
      (f) => [
        f.area,
        f.addressComment,
        f.phone1,
        f.phone1Description,
        f.phone2,
        f.phone2Description,
        f.courier,
        f.deliveryComments
      ]
    )
    this.addFields(
      Families,
      (a) => a.f,
      (f) => [
        f.familyMembers,
        f.socialWorker,
        f.custom1,
        f.custom2,
        f.custom3,
        f.custom4,
        f.birthDate
      ]
    )
    this.fields.sort((a, b) => a.caption.localeCompare(b.caption))
  }
  getStyle(properties: Property[], values: any) {
    let i = {}
    if (values)
      for (const p of properties) {
        if (values[p.key] !== '' && values[p.key] !== undefined)
          p.setStyle(values[p.key], i)
      }
    return i
  }
  async editSticker(d: any, arrayToReplaceItIn: any[]) {
    let [familyDelivery, family] = await this.ui.doWhileShowingBusy(() =>
      remult
        .repo(ActiveFamilyDeliveries)
        .findId(d.id)
        .then(async (fd) => [fd, await remult.repo(Families).findId(fd.family)])
    )
    this.ui.updateFamilyDialog({
      family,
      familyDelivery,
      onSave: async () => {
        await familyDelivery._.reload()
        let i = arrayToReplaceItIn.indexOf(d)
        arrayToReplaceItIn[i] = this.buildObject(familyDelivery.id, {
          fd: familyDelivery,
          f: family
        })
      }
    })
  }
  @BackendMethod({ allowed: Roles.admin })
  static async getStickerData(filterVolunteer?: string) {
    let d = new VolunteerReportDefs(undefined)
    let lastCourier = null
    for await (const fd of remult.repo(ActiveFamilyDeliveries).query({
      where: {
        deliverStatus: [
          DeliveryStatus.ReadyForDelivery,
          DeliveryStatus.DriverPickedUp,
          DeliveryStatus.SelfPickup
        ],
        routeOrder: 0
      },
      orderBy: { courier: 'asc' }
    })) {
      if (fd.courier != lastCourier) {
        lastCourier = fd.courier
        await (
          await import('../asign-family/asign-family.controller')
        ).AsignFamilyController.RefreshRoute(fd.courier, {})
      }
    }

    let r: any[] = []
    let lastVolunteer: HelpersBase
    let indexInVolunteer = 1
    for await (const fd of remult.repo(ActiveFamilyDeliveries).query({
      where: {
        deliverStatus: [
          DeliveryStatus.ReadyForDelivery,
          DeliveryStatus.DriverPickedUp,
          DeliveryStatus.SelfPickup
        ],
        courier: filterVolunteer
          ? await remult.repo(Helpers).findId(filterVolunteer)
          : undefined
      },
      orderBy: { deliverStatus: 'asc', courier: 'desc', routeOrder: 'asc' }
    })) {
      if (lastVolunteer != fd.courier) {
        lastVolunteer = fd.courier
        indexInVolunteer = 0
      }
      indexInVolunteer++
      fd.routeOrder = indexInVolunteer
      let f = await remult.repo(Families).findId(fd.family)
      let o = d.buildObject(fd.id, { fd, f })
      r.push(o)
    }
    r.sort((a, b) => {
      const aCourier = a['courier'] || ''
      const bCourier = b['courier'] || ''
      if (aCourier != bCourier && (aCourier == '' || bCourier == '')) {
        if (aCourier == '') return 1
        else return -1
      }
      let s: string = a[d.helperCommentKey] || ''
      let comp = s.localeCompare(b[d.helperCommentKey])
      if (comp != 0) {
        return comp
      }

      return aCourier.localeCompare(bCourier)
    })
    return r
  }
  textBeforeKey = '@textBefore'
  textAfterKey = '@textAfter'
  helperPhoneKey = 'helperPhone'
  nameKey = 'name'
  itemsKey = 'items'
  helperCommentKey = 'helperComment'
  basketTypeKey = 'basketType'
  quantityKey = 'quantity'
  fieldProps: ElementProps = {
    caption: this.remult.context.lang.fieldProperties,
    props: [
      new SizeProperty('font-size', this.remult.context.lang.fontSize, 'px'),
      new Property(
        'bold',
        this.remult.context.lang.bold,
        'checkbox',
        (v, s) => {
          if (v) s['font-weight'] = 'bold'
        }
      ),
      new Property(
        'align-center',
        this.remult.context.lang.centerAlign,
        'checkbox',
        (v, s) => {
          if (v) s['text-align'] = 'center'
        }
      ),
      new Property('color', this.remult.context.lang.color, 'color'),
      new Property(
        this.textBeforeKey,
        this.remult.context.lang.textBefore,
        '',
        () => {}
      ),
      new Property(
        this.textAfterKey,
        this.remult.context.lang.textAfter,
        '',
        () => {}
      ),
      new Property(
        'inline',
        this.remult.context.lang.sameLine,
        'checkbox',
        (v, s) => {
          if (v) s['display'] = 'inline'
        }
      ),
      new Property(
        'multipleLines',
        this.remult.context.lang.multipleLines,
        'checkbox',
        (v, s) => {
          if (v) s['white-space'] = 'pre-line'
        }
      )
    ],
    values: {}
  }
  editControl(c: Control) {
    if (!c.propertyValues) c.propertyValues = {}
    this.fieldProps.values = c.propertyValues
    this.fieldProps.caption =
      remult.context.lang.fieldProperties +
      ': ' +
      this.fields.find((x) => x.key == c.fieldKey)?.caption
    this.fieldProps.control = c
  }
}
export interface Control {
  fieldKey: string
  propertyValues?: any
}
export interface ElementProps {
  caption: string
  props: Property[]
  values?: {}
  control?: Control
}
export class Property {
  constructor(
    public key: string,
    public caption: string,
    public inputType: string,
    public setStyle?: (value: string, style: any) => void
  ) {
    if (!setStyle) {
      this.setStyle = (val, style) => (style[key] = val)
    }
  }
}
export class SizeProperty extends Property {
  constructor(public key: string, public caption: string, uom = 'mm') {
    super(key, caption, 'number', (val, style) => (style[key] = val + uom))
  }
}

export function getMarginsH() {
  return [
    new SizeProperty('padding-left', use.language.leftPadding),
    new SizeProperty('padding-right', use.language.rightPadding)
  ]
}
export function getMarginsV() {
  return [
    new SizeProperty('padding-top', use.language.topPadding),
    new SizeProperty('padding-bottom', use.language.bottomPadding)
  ]
}
