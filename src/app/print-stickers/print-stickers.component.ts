import { Component, OnInit } from '@angular/core';
import { BusyService, openDialog, SelectValueDialogComponent } from '@remult/angular';
import { stringify } from 'querystring';
import { BackendMethod, EntityRef, Field, FieldMetadata, FieldsMetadata, IdEntity, Remult } from 'remult';
import { ClassType } from 'remult/classType';
import { InputTypes } from 'remult/inputTypes';
import { Roles } from '../auth/roles';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { Families } from '../families/families';
import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { SelectListComponent } from '../select-list/select-list.component';
import { Entity } from '../translate';
import { UpdateFamilyDialogComponent } from '../update-family-dialog/update-family-dialog.component';



@Component({
  selector: 'app-print-stickers',
  templateUrl: './print-stickers.component.html',
  styleUrls: ['./print-stickers.component.scss']
})
export class PrintStickersComponent implements OnInit {
  textBeforeKey = "@textBefore";
  constructor(private remult: Remult, private busy: BusyService) { }
  defs = new defs(this.remult);
  data: any[];
  report: ReportInfo;
  row: StickerInfo;
  pageProps: ElementProps = {
    caption: 'תכונות דף', props: [
      ...getMarginsH()]

  };
  stickerProps: ElementProps = {
    caption: 'תכונות מדבקה', props: [
      new SizeProperty('height', 'גובה'),
      new SizeProperty('width', 'רוחב'),
      ...getMarginsH(), ...getMarginsV()],

  };
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
  selectControl() {
    openDialog(SelectValueDialogComponent, x => x.args({
      values: this.report.controls.map(c => ({ item: c, caption: this.defs.fields.find(y => y.key == c.fieldKey)?.caption })),
      onSelect: x => this.editControl(x.item)
    }))

  }
  async editSticker(d: any) {

    let [familyDelivery, family] = await this.busy.doWhileShowingBusy(() => this.remult.repo(ActiveFamilyDeliveries).findId(d.id).then(async fd => [fd, await this.remult.repo(Families).findId(fd.family)]));

    openDialog(UpdateFamilyDialogComponent, x => x.args = {
      family, familyDelivery, onSave: async () => {
        await familyDelivery._.reload();
        let i = this.data.indexOf(d);
        this.data[i] = this.defs.buildObject(familyDelivery.id, {
          fd: familyDelivery, f: family
        })
      }
    })
  }

  editControl(c: Control) {
    this.currentProps = this.fieldProps;
    if (!c.propertyValues)
      c.propertyValues = {};
    this.fieldProps.values = c.propertyValues;
    this.fieldProps.caption = "תכונות שדה " + this.defs.fields.find(x => x.key == c.fieldKey)?.caption;
    this.fieldProps.control = c;
  }
  moveControl(pos = 1) {
    let from = this.report.controls.indexOf(this.currentProps.control);
    let to = from + pos;
    if (to >= this.report.controls.length || to < 0)
      return;
    this.report.controls.splice(to, 0, ...this.report.controls.splice(from, 1));
    this.save();

  }

  removeControl(c: Control) {
    this.report.controls.splice(this.report.controls.indexOf(c), 1);
    this.save();
  }
  addControl() {
    openDialog(SelectValueDialogComponent, x => x.args({
      values: this.defs.fields.filter(f => !this.report.controls.find(c => c.fieldKey == f.key)),
      onSelect: f => {
        let c: Control = {
          fieldKey: f.key,
          propertyValues: {}
        };
        this.report.controls.push(c);
        this.save();
        this.editControl(c);
      }
    }))
  }


  currentProps = this.stickerProps;

  async ngOnInit() {
    this.data = await PrintStickersComponent.getStickerData();
    this.row = await this.remult.repo(StickerInfo).findFirst({ where: s => s.key.isEqualTo("stickers"), useCache: false, createIfNotFound: true });
    this.report = this.row.info;
    if (!this.report) {
      this.report = {
        controls: [{ fieldKey: 'name', propertyValues: { 'bold': 'true' } }, { fieldKey: "address" }, {
          fieldKey: 'basketType', propertyValues: {
            [this.textBeforeKey]: this.remult.lang.basketType + ": "
          }
        }, { fieldKey: 'deliveryComments', propertyValues: { 'bold': 'true' } }],
        page: {},
        sticker: {
          width: '105',
          height: '70',
          "padding-right": '5',
          "padding-left": '5',
          "padding-top": '5',
          "padding-bottom": '5'
        }
      }
    }
    this.pageProps.values = this.report.page;
    this.stickerProps.values = this.report.sticker;
  }

  save() {
    this.row.info = JSON.parse(JSON.stringify(this.report));
    this.busy.donotWait(() => this.row.save());
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


  @BackendMethod({ allowed: Roles.admin })
  static async getStickerData(remult?: Remult) {
    let d = new defs(remult);
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

}

class genericDefs<dataArgs> {

  fields: {
    key: string,
    caption: string,
    build: (args: dataArgs) => string
  }[] = [];
  constructor(private remult: Remult) {

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
class defs extends genericDefs<{
  fd: ActiveFamilyDeliveries,
  f: Families
}> {

  constructor(remult: Remult) {
    super(remult);
    this.fields.push({
      key: 'name',
      caption: 'שם',
      build: ({ fd }) => (fd.courier ? fd.routeOrder + ". " : "") + fd.name
    });
    this.fields.push({
      key: 'helperPhone',
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

    })
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

}




interface ElementProps {
  caption: string,
  props: Property[],
  values?: {},
  control?: Control;
}
interface Control {
  fieldKey: string,
  propertyValues?: any
}
function getMarginsH() {
  return [
    new SizeProperty('padding-left', 'שוליים שמאליים'),
    new SizeProperty('padding-right', 'שוליים ימניים')
  ]
}
function getMarginsV() {
  return [
    new SizeProperty('padding-top', 'שוליים עליונים'),
    new SizeProperty('padding-bottom', 'שוליים תחתונים')
  ]
}

class Property {
  constructor(public key: string, public caption: string, public inputType: string, public setStyle?: (value: string, style: any) => void) {
    if (!setStyle) {
      this.setStyle = (val, style) => style[key] = val;
    }
  }
}
class SizeProperty extends Property {
  constructor(public key: string, public caption: string, uom = 'mm') {
    super(key, caption, InputTypes.number, (val, style) => style[key] = val + uom);
  }
}



@Entity("stickerInfo", {
  allowApiCrud: Roles.admin
})
class StickerInfo extends IdEntity {
  @Field()
  key: string;
  @Field({ allowNull: true })
  info: ReportInfo;

}
interface ReportInfo {
  page: any;
  sticker: any;
  controls: Control[];
}

