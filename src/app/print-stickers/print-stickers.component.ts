import { Component, OnInit } from '@angular/core';
import { BusyService, openDialog, SelectValueDialogComponent } from '@remult/angular';
import { Field, IdEntity, Remult } from 'remult';
import { Roles } from '../auth/roles';
import { Control, ElementProps, getMarginsH, getMarginsV, Property, SizeProperty } from '../properties-editor/properties-editor.component';
import { Entity } from '../translate';
import { VolunteerReportDefs } from './VolunteerReportDefs';
import { assign } from 'remult/assign';



@Component({
  selector: 'app-print-stickers',
  templateUrl: './print-stickers.component.html',
  styleUrls: ['./print-stickers.component.scss']
})
export class PrintStickersComponent implements OnInit {

  constructor(private remult: Remult, private busy: BusyService) { }
  defs = new VolunteerReportDefs(this.remult, this.busy);
  data: any[];
  report: ReportInfo;
  row: StickerInfo;
  pageProps: ElementProps = {
    caption: 'תכונות דף', props: [
      ...getMarginsH()]

  };
  stickerProps: ElementProps = {
    caption: 'תכונות מדבקה', props: [
      new Property('height', 'גובה', 'number', (val, s) => assign(s, {
        'height': val + 'mm',
        'max-height': val + 'mm'
      })),
      new SizeProperty('width', 'רוחב'),
      ...getMarginsH(), ...getMarginsV()],

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
  lastSave = Promise.resolve();
  async save() {
    this.lastSave = this.lastSave.then(async () => {
      this.row.info = JSON.parse(JSON.stringify(this.report));
      await this.busy.donotWait(() => this.row.save());
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

