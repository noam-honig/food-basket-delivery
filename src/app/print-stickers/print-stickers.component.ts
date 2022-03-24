import { Component, OnInit } from '@angular/core';
import { BusyService, openDialog, SelectValueDialogComponent } from '@remult/angular';
import { IdEntity, Remult } from 'remult';
import { Roles } from '../auth/roles';
import { Control, ElementProps, getMarginsH, getMarginsV, Property, SizeProperty } from './VolunteerReportDefs';
import { Entity, Field } from '../translate';
import { VolunteerReportDefs } from './VolunteerReportDefs';
import { assign } from 'remult/assign';
import { InputTypes } from 'remult/inputTypes';
import { DialogService } from '../select-popup/dialog';



@Component({
  selector: 'app-print-stickers',
  templateUrl: './print-stickers.component.html',
  styleUrls: ['./print-stickers.component.scss']
})
export class PrintStickersComponent implements OnInit {

  constructor(public remult: Remult, private dialog: DialogService) { }
  defs = new VolunteerReportDefs(this.remult, this.dialog);
  data: any[];
  report: ReportInfo;
  row: StickerInfo;
  borderKey = '@border';
  pageProps: ElementProps = {
    caption: this.remult.lang.pageProperties, props: [
      ...getMarginsH()]

  };
  getStickerBorderSettings() {
    if (this.stickerProps.values[this.borderKey])
      return '1px dotted lightgray';
    return '';
  }
  stickerProps: ElementProps = {
    caption: this.remult.lang.labelProperties, props: [
      new Property('height', this.remult.lang.height, 'number', (val, s) => assign(s, {
        'height': val + 'mm',
        'max-height': val + 'mm'
      })),
      new SizeProperty('width', this.remult.lang.width),
      ...getMarginsH(), ...getMarginsV(),
      new Property(this.borderKey, this.remult.lang.border, InputTypes.checkbox, (val, s) => {

      })
    ],

  };
  editControl(c: Control) {
    this.defs.editControl(c);
    this.currentProps = this.defs.fieldProps;

  }

  selectControl() {
    openDialog(SelectValueDialogComponent, x => x.args({
      values: this.report.controls.map(c => ({ item: c, caption: this.defs.fields.find(y => y.key == c.fieldKey)?.caption })),
      onSelect: x => this.editControl(x.item)
    }))

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
    this.data = await VolunteerReportDefs.getStickerData();
    this.row = await this.remult.repo(StickerInfo).findFirst({ key: "stickers" }, { useCache: false, createIfNotFound: true });
    this.report = this.row.info;
    if (!this.report) {
      this.report = {
        controls: [{ fieldKey: 'name', propertyValues: { 'bold': 'true' } }, { fieldKey: "address" }, {
          fieldKey: 'basketType', propertyValues: {
            [this.defs.textBeforeKey]: this.remult.lang.basketType + ": "
          }
        }, { fieldKey: 'deliveryComments', propertyValues: { 'bold': 'true' } }],
        page: {},
        sticker: {
          width: '105',
          height: '70',
          "padding-right": '1',
          "padding-left": '0',
          "padding-top": '0',
          "padding-bottom": '1'
        }
      }
    }
    this.pageProps.values = this.report.page;
    this.stickerProps.values = this.report.sticker;
  }
  lastSave = Promise.resolve();
  async save() {
    this.lastSave = this.lastSave.then(async () => {
      this.row.info = JSON.parse(JSON.stringify(this.report));
      await this.dialog.donotWait(() => this.row.save());
    });
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

