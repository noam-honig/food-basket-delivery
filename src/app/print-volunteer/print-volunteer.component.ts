import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit } from '@angular/core';
import { BusyService, openDialog, SelectValueDialogComponent } from '@remult/angular';
import { Entity, Field, IdEntity, Remult } from 'remult';
import { InputTypes } from 'remult/inputTypes';
import { Roles } from '../auth/roles';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { VolunteerReportDefs } from '../print-stickers/VolunteerReportDefs';
import { Control, ElementProps, getMarginsH, Property } from '../properties-editor/properties-editor.component';

/*
[] Add field to page crashes
[] select column
[] remove column - removes the field - it should remove the column
[] click on column to edit it
[] select field is missing
[] remove column should only appear when parked on column
[] after remove field - clear editing of that field.
[] reorder columns



*/
@Component({
  selector: 'app-print-volunteer',
  templateUrl: './print-volunteer.component.html',
  styleUrls: ['./print-volunteer.component.scss']
})
export class PrintVolunteerComponent implements OnInit {


  constructor(private remult: Remult, private busy: BusyService, public settings: ApplicationSettings) { }
  defs = new VolunteerReportDefs(this.remult, this.busy);
  report: ReportInfo;
  row: VolunteerReportInfo;

  pageProps: ElementProps = {
    caption: 'תכונות דף', props: [
      ...getMarginsH()]

  };

  columnProps: ElementProps = {
    caption: 'תכונות עמודה', props: [
      ...this.defs.fieldProps.props
    ]

  };
  async dropControl(event: CdkDragDrop<string[]>, controls: Control[]) {
    if (event.container == event.previousContainer) {
      moveItemInArray(controls, event.previousIndex, event.currentIndex);
    }
  }
  addColumn() {
    this.report.columns.push({
      controls: [],
      propertyValues: { [this.defs.textBeforeKey]: 'עמודה חדשה' }
    })
    this.editColumn(this.report.columns[this.report.columns.length - 1]);

    this.save();
  }
  currentColumn: ReportColumn;
  editColumn(c: ReportColumn) {
    this.currentProps = this.columnProps;
    this.currentProps.values = c.propertyValues;
    this.currentProps.caption = 'תכונות עמודה ' + c.propertyValues[this.defs.textBeforeKey];
    this.currentColumn = c;
    this.currentControlList = c.controls;

  }
  data: {
    firstRow: {},
    deliveries: any[]
  }[] = [];
  currentProps = this.pageProps;
  currentControlList: Control[];
  editControl(c: Control, controls: Control[]) {
    this.defs.editControl(c);
    this.currentProps = this.defs.fieldProps;
    this.currentControlList = controls;
  }
  addControl() {
    openDialog(SelectValueDialogComponent, x => x.args({
      values: this.defs.fields.filter(f => !this.report.controls.find(c => c.fieldKey == f.key)),
      onSelect: f => {
        let c: Control = {
          fieldKey: f.key,
          propertyValues: {}
        };
        this.currentControlList.push(c);
        this.save();
        this.editControl(c, this.currentControlList);
      }
    }))
  }
  removeControl(c: Control) {
    this.currentControlList.splice(this.report.controls.indexOf(c), 1);
    
    this.save();
  }
  removeColumn() {
    this.report.columns.splice(this.report.columns.indexOf(this.currentColumn), 1);
    this.save();
  }
  async ngOnInit() {
    let data = await VolunteerReportDefs.getStickerData();
    let volunteer;
    let deliveries: any[];
    for (const d of data) {
      if (volunteer != d[this.defs.helperPhoneKey]) {
        volunteer = d[this.defs.helperPhoneKey];
        deliveries = [];
        this.data.push({
          firstRow: d,
          deliveries
        })
      }
      deliveries.push(d);
    }
    this.row = await this.remult.repo(VolunteerReportInfo).findFirst({ where: s => s.key.isEqualTo("volunteerReport"), useCache: false, createIfNotFound: true });
    this.report = this.row.info;
    if (!this.report) {
      this.report = {
        controls: [{ fieldKey: 'name', propertyValues: { 'bold': 'true' } }, { fieldKey: "address" }, {
          fieldKey: 'basketType', propertyValues: {
            [this.defs.textBeforeKey]: this.remult.lang.basketType + ": "
          }
        }, { fieldKey: 'deliveryComments', propertyValues: { 'bold': 'true' } }],
        columns: [
          {
            propertyValues: {
              [this.defs.textBeforeKey]: this.remult.lang.familyName
            },
            controls: [{ fieldKey: 'name', propertyValues: { 'bold': 'true' } }, { fieldKey: "address" }]
          }
        ],
        page: {}


      }
    }
    this.pageProps.values = this.report.page;

  }


  save() {
    this.row.info = JSON.parse(JSON.stringify(this.report));
    this.busy.donotWait(() => this.row.save());
  }
}


@Entity("stickerInfo", {
  allowApiCrud: Roles.admin
})
class VolunteerReportInfo extends IdEntity {
  @Field()
  key: string;
  @Field({ allowNull: true })
  info: ReportInfo;

}

interface ReportInfo {
  page: any;
  controls: Control[];
  columns: ReportColumn[];
}
interface ReportColumn {
  propertyValues?: any;
  controls: Control[];
}