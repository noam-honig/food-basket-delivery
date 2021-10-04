import { BusyService, openDialog } from '@remult/angular';
import { BackendMethod, Remult } from 'remult';
import { InputTypes } from 'remult/inputTypes';
import { Roles } from '../auth/roles';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { Families } from '../families/families';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { Control, ElementProps, OptionalFieldsDefinition, Property, SizeProperty } from '../properties-editor/properties-editor.component';
import { UpdateFamilyDialogComponent } from '../update-family-dialog/update-family-dialog.component';

export class VolunteerReportDefs extends OptionalFieldsDefinition<{
  fd: ActiveFamilyDeliveries;
  f: Families;
}> {

  constructor(remult: Remult, private busy?: BusyService) {
    super(remult);
    this.fields.push({
      key: 'name',
      caption: 'שם',
      build: ({ fd }) => (fd.courier ? fd.routeOrder + ". " : "") + fd.name
    });
    this.fields.push({
      key: this.helperPhoneKey,
      caption: 'טלפון מתנדב',
      build: ({ fd }) => (fd.courier ? fd.courier.phone.displayValue : "")
    });
    this.fields.push({
      key: 'address',
      caption: 'כתובת מלאה',
      build: ({ fd }) => fd.getAddressDescription() +
        (fd.entrance ? ", " + fd.$.entrance.metadata.caption + ": " + fd.entrance : '') +
        (fd.floor ? ", " + fd.$.floor.metadata.caption + ": " + fd.floor : '') +
        (fd.appartment ? ", " + fd.$.appartment.metadata.caption + ": " + fd.appartment : '') +
        (fd.buildingCode ? ", " + fd.$.buildingCode.metadata.caption + ": " + fd.buildingCode : '') +
        (fd.addressComment ? ", שים לב: " + fd.addressComment : '')
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

    this.addFields(ActiveFamilyDeliveries, a => a.fd, f => [
      f.address,
      f.phone1,
      f.phone1Description,
      f.phone2,
      f.phone2Description,
      f.courier
    ]);
    this.addFields(Families, a => a.f, f => [
      f.familyMembers,
      f.socialWorker
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

    let [familyDelivery, family] = await this.busy.doWhileShowingBusy(() => this.remult.repo(ActiveFamilyDeliveries).findId(d.id).then(async (fd) => [fd, await this.remult.repo(Families).findId(fd.family)]));

    openDialog(UpdateFamilyDialogComponent, x => x.args = {
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
  static async getStickerData(remult?: Remult) {
    let d = new VolunteerReportDefs(remult);
    let lastCourier = null;
    for await (const fd of remult.repo(ActiveFamilyDeliveries).iterate({
      where: fd => fd.deliverStatus.isIn([DeliveryStatus.ReadyForDelivery, DeliveryStatus.SelfPickup])
        .and(fd.routeOrder.isEqualTo(0)),
      orderBy: fd => fd.courier
    })) {
      if (fd.courier != lastCourier) {
        lastCourier = fd.courier;
        await (await import("../asign-family/asign-family.component")).AsignFamilyComponent.RefreshRoute(fd.courier, {}, undefined, remult);
      }
    }


    let r: any[] = [];
    for await (const fd of remult.repo(ActiveFamilyDeliveries).iterate({
      where: fd => fd.deliverStatus.isIn([DeliveryStatus.ReadyForDelivery, DeliveryStatus.SelfPickup]),
      orderBy: d => [d.deliverStatus, d.courier.descending(), d.routeOrder]
    })) {
      let f = await remult.repo(Families).findId(fd.family);
      let o = d.buildObject(fd.id, { fd, f });
      r.push(o);

    }
    return r;
  }
  textBeforeKey = "@textBefore";
  helperPhoneKey="helperPhone";
  fieldProps: ElementProps = {
    caption: 'תכונות שדה',
    props: [
      new SizeProperty("font-size", "גודל גופן", "px"),
      new Property("bold", "הדגשה", InputTypes.checkbox, (v, s) => {
        if (v)
          s["font-weight"] = "bold";
      }),
      new Property("align-center", "יישר למרכז", InputTypes.checkbox, (v, s) => {
        if (v)
          s["text-align"] = "center";
      }),
      new Property('color', "צבע", 'color'),
      new Property(this.textBeforeKey, "תאור", '', () => { }),
      new Property("inline", "באותה שורה", InputTypes.checkbox, (v, s) => {
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
    this.fieldProps.caption = "תכונות שדה " + this.fields.find(x => x.key == c.fieldKey)?.caption;
    this.fieldProps.control = c;
  }
}
