import { Component, OnInit } from '@angular/core';
import { BusyService, openDialog, SelectValueDialogComponent } from '@remult/angular';
import { BackendMethod, EntityRef, Field, FieldMetadata, FieldsMetadata, IdEntity, Remult } from 'remult';
import { ClassType } from 'remult/classType';
import { InputTypes } from 'remult/inputTypes';
import { Roles } from '../auth/roles';
import { Families } from '../families/families';
import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { SelectListComponent } from '../select-list/select-list.component';
import { Entity } from '../translate';



@Component({
  selector: 'app-print-stickers',
  templateUrl: './print-stickers.component.html',
  styleUrls: ['./print-stickers.component.css']
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
      new Property("bold", "הדגשה", InputTypes.checkbox, (v, s) => {
        if (v)
          s["font-weight"] = "bold";
      }),
      new SizeProperty("font-size", "גודל גופן", "px"),
      new Property(this.textBeforeKey, "תאור", '', () => { }),
      new Property('color', "צבע", 'color')
    ],
    values: {}
  };
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

  }

  removeControl(c: Control) {
    this.report.controls.splice(this.report.controls.indexOf(c), 1);
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
        controls: this.defs.getDefault(),
        page: {},
        sticker: {}
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

    let r: any[] = [];
    for await (const fd of remult.repo(ActiveFamilyDeliveries).iterate({ orderBy: d => [d.courier, d.routeOrder] })) {

      r.push(d.buildObject(fd._));;

    }
    return r;
  }

}

class genericDefs<dataArgs> {
  getDefault(): Control[] {
    let fd = this.remult.repo(ActiveFamilyDeliveries).metadata;
    return [fd.fields.name, fd.fields.address].map(x => ({ fieldKey: fd.key + "_" + x.key, propertyValues: {} }));
  }
  fields: FieldDefs[] = [];
  constructor(private remult: Remult) {

  }
  addFields<entityType>(entity: ClassType<entityType>, getFields: (entity: FieldsMetadata<entityType>) => FieldMetadata[]) {
    let repo = this.remult.repo(entity);
    let meta = repo.metadata;
    for (const field of getFields(meta.fields)) {
      this.fields.push(new FieldDefs(meta.key + "_" + field.key, field.key, meta.key, field.caption))
    }
  }
  buildObject(...entities: EntityRef<any>[]) {
    let r = {};
    for (const field of this.fields) {
      field.buildDataObject(r, entities);
    }
    return r;
  }
}
class defs extends genericDefs<{
  d: ActiveFamilyDeliveries,
  f: Families
}> {
  constructor(remult: Remult) {
    super(remult);
    this.addFields(ActiveFamilyDeliveries, f => [
      f.name,
      f.address,
      f.phone1,
      f.phone1Description,
      f.phone2,
      f.phone2Description,
      f.deliveryComments,
      f.addressComment,
      f.basketType,
      f.quantity
    ]);
    this.addFields(Families, f => [
      f.familyMembers,
      f.socialWorker
    ]);
  }

}
class FieldDefs {
  constructor(public key: string, public fieldKey: string, public entityKey: string, public caption: string) {

  }
  buildDataObject(r: any, entities: EntityRef<any>[]) {

    for (const e of entities) {
      if (e.metadata.key == this.entityKey) {
        r[this.key] = e.fields.find(this.fieldKey).displayValue;
      }
    }
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
  propertyValues: any
}
function getMarginsH() {
  return [
    new SizeProperty('margin-left', 'שוליים שמאליים'),
    new SizeProperty('margin-right', 'שוליים ימניים')
  ]
}
function getMarginsV() {
  return [
    new SizeProperty('margin-top', 'שוליים עליונים'),
    new SizeProperty('margin-bottom', 'שוליים תחתונים')
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


/**
 * [] add number in list
 * [] add all needed fields,
 * [] add custom field - like in excel import.
 * [] add full address
 * [] add address without city
 */