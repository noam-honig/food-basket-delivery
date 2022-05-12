import { BackendMethod, FieldMetadata, FieldsMetadata, IdEntity, Remult } from 'remult';
import { ClassType } from 'remult/classType';
import { InputTypes } from 'remult/inputTypes';
import { Roles } from '../auth/roles';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { Families } from '../families/families';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { Helpers, HelpersBase } from '../helpers/helpers';
import { UITools } from '../helpers/init-context';
import { getSettings } from '../manage/ApplicationSettings';
import { use } from '../translate';


export class OptionalFieldsDefinition<dataArgs> {

  fields: {
    key: string,
    caption: string,
    build: (args: dataArgs) => string
  }[] = [];
  constructor(public remult: Remult) {

  }
  addFields<entityType extends IdEntity>(entity: ClassType<entityType>, extractFromArgs: (x: dataArgs) => entityType, getFields: (entity: FieldsMetadata<entityType>) => FieldMetadata[]) {
    let repo = this.remult.repo(entity);
    let meta = repo.metadata;
    for (const field of getFields(meta.fields)) {
      let key = meta.key + "_" + field.key;
      this.fields.push({
        key,
        caption: field.caption,
        build: (args) => extractFromArgs(args).$.find(field).displayValue
      })
    }
  }
  buildObject(id: string, args: dataArgs) {
    let r = { id };
    for (const field of this.fields) {
      r[field.key] = field.build(args);
    }
    return r;
  }
}

export class VolunteerReportDefs extends OptionalFieldsDefinition<{
  fd: ActiveFamilyDeliveries;
  f: Families;
}> {

  constructor(remult: Remult, private ui: UITools) {
    super(remult);
    this.fields.push({
      key: 'name',
      caption: remult.lang.familyName,
      build: ({ fd }) => (fd.courier ? fd.routeOrder + ". " : "") + fd.name
    });
    this.fields.push({
      key: this.helperPhoneKey,
      caption: remult.lang.volunteerPhoneNumber,
      build: ({ fd }) => (fd.courier ? fd.courier?.phone?.displayValue : "")
    });
    this.fields.push({
      key: this.helperCommentKey,
      caption: remult.lang.volunteerComment,
      build: ({ fd }) => (fd.courier ? fd.courier?.eventComment : "")
    });
    this.fields.push({
      key: 'address',
      caption: remult.lang.fullAddress,
      build: ({ fd }) => fd.getAddressDescription() +
        (fd.entrance ? ", " + fd.$.entrance.metadata.caption + ": " + fd.entrance : '') +
        (fd.floor ? ", " + fd.$.floor.metadata.caption + ": " + fd.floor : '') +
        (fd.appartment ? ", " + fd.$.appartment.metadata.caption + ": " + fd.appartment : '') +
        (fd.buildingCode ? ", " + fd.$.buildingCode.metadata.caption + ": " + fd.buildingCode : '') +
        (fd.addressComment ? ", " + remult.lang.notice + ": " + fd.addressComment : '')
    });
    this.fields.push({
      key: 'basketType',
      caption: remult.lang.basketType,
      build: ({ fd }) => (fd.quantity > 1 ? fd.quantity + " X " : "") + fd.$.basketType.displayValue
    });
    this.fields.push({
      key: 'deliveryComments',
      caption: remult.lang.commentForVolunteer,
      build: ({ fd }) => fd.$.deliveryComments.displayValue
    });
    this.fields.push({
      key: 'boxes1',
      caption: getSettings(remult).boxes1Name,
      build: ({ fd }) => (fd.quantity * fd.basketType?.boxes)?.toString()
    })
    this.fields.push({
      key: 'boxes2',
      caption: getSettings(remult).boxes2Name,
      build: ({ fd }) => (fd.quantity * fd.basketType?.boxes2)?.toString()
    })

    this.addFields(ActiveFamilyDeliveries, a => a.fd, f => [
      f.area,
      f.addressComment,
      f.phone1,
      f.phone1Description,
      f.phone2,
      f.phone2Description,
      f.courier,
      f.deliveryComments
    ]);
    this.addFields(Families, a => a.f, f => [
      f.familyMembers,
      f.socialWorker,
      f.custom1,
      f.custom2,
      f.custom3,
      f.custom4,
      f.birthDate
    ]);
    this.fields.sort((a, b) => a.caption.localeCompare(b.caption));
  }
  getStyle(properties: Property[], values: any) {
    let i = {};
    if (values)
      for (const p of properties) {
        if (values[p.key] !== '' && values[p.key] !== undefined)
          p.setStyle(values[p.key], i);

      }
    return i;
  }
  async editSticker(d: any, arrayToReplaceItIn: any[]) {

    let [familyDelivery, family] = await this.ui.doWhileShowingBusy(() => this.remult.repo(ActiveFamilyDeliveries).findId(d.id).then(async (fd) => [fd, await this.remult.repo(Families).findId(fd.family)]));
    this.ui.updateFamilyDialog({
      family, familyDelivery, onSave: async () => {
        await familyDelivery._.reload();
        let i = arrayToReplaceItIn.indexOf(d);
        arrayToReplaceItIn[i] = this.buildObject(familyDelivery.id, {
          fd: familyDelivery, f: family
        });
      }
    });
  }
  @BackendMethod({ allowed: Roles.admin })
  static async getStickerData(filterVolunteer?: string, remult?: Remult) {
    let d = new VolunteerReportDefs(remult, undefined);
    let lastCourier = null;
    for await (const fd of remult.repo(ActiveFamilyDeliveries).query({
      where: {
        deliverStatus: [DeliveryStatus.ReadyForDelivery, DeliveryStatus.SelfPickup],
        routeOrder: 0
      },
      orderBy: { courier: "asc" }
    })) {
      if (fd.courier != lastCourier) {
        lastCourier = fd.courier;
        await (await import("../asign-family/asign-family.controller")).AsignFamilyController.RefreshRoute(fd.courier, {}, undefined, remult);
      }
    }


    let r: any[] = [];
    let lastVolunteer: HelpersBase;
    let indexInVolunteer = 1;
    for await (const fd of remult.repo(ActiveFamilyDeliveries).query({
      where: {
        deliverStatus: [DeliveryStatus.ReadyForDelivery, DeliveryStatus.SelfPickup],
        courier: filterVolunteer ? await remult.repo(Helpers).findId(filterVolunteer) : undefined
      },
      orderBy: { deliverStatus: "asc", courier: "desc", routeOrder: "asc" }
    })) {
      if (lastVolunteer != fd.courier) {
        lastVolunteer = fd.courier;
        indexInVolunteer = 0;

      }
      indexInVolunteer++;
      fd.routeOrder = indexInVolunteer;
      let f = await remult.repo(Families).findId(fd.family);
      let o = d.buildObject(fd.id, { fd, f });
      r.push(o);

    }
    r.sort((a, b) => {
      const aCourier = a['courier'] || '';
      const bCourier = b['courier'] || '';
      if (aCourier != bCourier && (aCourier == '' || bCourier == '')) {
        if (aCourier == '')
          return 1;
        else return -1;
      }
      let s: string = a[d.helperCommentKey] || '';
      let comp = s.localeCompare(b[d.helperCommentKey]);
      if (comp != 0) {
        return comp;
      }

      return aCourier.localeCompare(bCourier);
    });
    return r;
  }
  textBeforeKey = "@textBefore";
  textAfterKey = "@textAfter";
  helperPhoneKey = "helperPhone";
  helperCommentKey = "helperComment";
  fieldProps: ElementProps = {
    caption: this.remult.lang.fieldProperties,
    props: [
      new SizeProperty("font-size", this.remult.lang.fontSize, "px"),
      new Property("bold", this.remult.lang.bold, InputTypes.checkbox, (v, s) => {
        if (v)
          s["font-weight"] = "bold";
      }),
      new Property("align-center", this.remult.lang.centerAlign, InputTypes.checkbox, (v, s) => {
        if (v)
          s["text-align"] = "center";
      }),
      new Property('color', this.remult.lang.color, 'color'),
      new Property(this.textBeforeKey, this.remult.lang.textBefore, '', () => { }),
      new Property(this.textAfterKey, this.remult.lang.textAfter, '', () => { }),
      new Property("inline", this.remult.lang.sameLine, InputTypes.checkbox, (v, s) => {
        if (v)
          s["display"] = "inline";
      })
    ],
    values: {}
  };
  editControl(c: Control) {

    if (!c.propertyValues)
      c.propertyValues = {};
    this.fieldProps.values = c.propertyValues;
    this.fieldProps.caption = this.remult.lang.fieldProperties + ": " + this.fields.find(x => x.key == c.fieldKey)?.caption;
    this.fieldProps.control = c;
  }
}
export interface Control {
  fieldKey: string,
  propertyValues?: any
}
export interface ElementProps {
  caption: string,
  props: Property[],
  values?: {},
  control?: Control;
}
export class Property {
  constructor(public key: string, public caption: string, public inputType: string, public setStyle?: (value: string, style: any) => void) {
    if (!setStyle) {
      this.setStyle = (val, style) => style[key] = val;
    }
  }
}
export class SizeProperty extends Property {
  constructor(public key: string, public caption: string, uom = 'mm') {
    super(key, caption, InputTypes.number, (val, style) => style[key] = val + uom);
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
