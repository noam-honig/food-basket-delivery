import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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


  constructor(public remult: Remult, private busy: BusyService, public settings: ApplicationSettings, private route: ActivatedRoute) { }
  defs = new VolunteerReportDefs(this.remult, this.busy);
  report: ReportInfo;
  row: VolunteerReportInfo;
  readonly newPageKey = '@newPageKey';
  pageBreakBefore() {
    if (this.report.page[this.newPageKey])
      return 'always';
    return 'none';
  }
  pageProps: ElementProps = {
    caption: this.remult.lang.pageProperties, props: [
      ...getMarginsH(), {
        caption: this.remult.lang.newPageForEachVolunteer,
        inputType: "checkbox",
        key: this.newPageKey
      }]

  };

  columnProps: ElementProps = {
    caption: this.remult.lang.columnProperties, props: [
      ...this.defs.fieldProps.props
    ]

  };
  editing = false;
  async dropControl(event: CdkDragDrop<string[]>, controls: Control[]) {
    if (this.editing)
      if (event.container == event.previousContainer) {
        moveItemInArray(controls, event.previousIndex, event.currentIndex);
      }
  }
  addColumn() {
    this.report.columns.push({
      controls: [],
      propertyValues: { [this.defs.textBeforeKey]: this.remult.lang.newColumn }
    })
    this.editColumn(this.report.columns[this.report.columns.length - 1]);

    this.save();
  }
  currentColumn: ReportColumn;
  editColumn(c: ReportColumn) {
    this.currentProps = this.columnProps;
    this.currentProps.values = c.propertyValues;
    this.currentProps.caption = this.remult.lang.columnProperties + ': ' + c.propertyValues[this.defs.textBeforeKey];
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
    let filterVolunteer = this.route.snapshot.queryParams['volunteer'];
    let data = await VolunteerReportDefs.getStickerData(filterVolunteer);
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
    this.row = await this.remult.repo(VolunteerReportInfo).findFirst({ key: "volunteerReport" }, { useCache: false, createIfNotFound: true });
    this.report = this.row.info;
    if (!this.report) {
      this.report = {
        "controls": [
          {
            "fieldKey": "deliveryComments",
            "propertyValues": {
              "bold": "true"
            }
          },
          {
            "fieldKey": "ActiveFamilyDeliveries_courier",
            "propertyValues": {
              "inline": true,
              "@textBefore": "שלום",
              "align-center": true,
              "bold": true
            }
          },
          {
            "fieldKey": "helperPhone",
            "propertyValues": {
              "inline": true,
              "align-center": true,
              "bold": true,
              "font-size": "",
              "@textBefore": ", טלפון: "
            }
          }
        ],
        "columns": [
          {
            "propertyValues": {
              "@columnCaption": "שם",
              "@textBefore": "שם ",
              "bold": true,
              "font-size": ""
            },
            "controls": [
              {
                "fieldKey": "name",
                "propertyValues": {
                  "bold": true,
                  "font-size": "",
                  "color": "#000000"
                }
              },
              {
                "fieldKey": "ActiveFamilyDeliveries_deliveryComments",
                "propertyValues": {}
              }
            ]
          },
          {
            "controls": [
              {
                "fieldKey": "address",
                "propertyValues": {}
              }
            ],
            "propertyValues": {
              "@columnCaption": "עמודה חדשה 123",
              "@textBefore": "כתובת",
              "bold": true
            }
          },
          {
            "controls": [
              {
                "fieldKey": "ActiveFamilyDeliveries_phone1",
                "propertyValues": {}
              },
              {
                "fieldKey": "ActiveFamilyDeliveries_phone2",
                "propertyValues": {}
              }
            ],
            "propertyValues": {
              "@textBefore": "טלפונים",
              "bold": true
            }
          },
          {
            "controls": [
              {
                "fieldKey": "basketType",
                "propertyValues": {}
              }
            ],
            "propertyValues": {
              "@textBefore": "סל",
              "bold": true
            }
          }
        ],
        "page": {
          "padding-left": "0"
        }
      }
    }
    if (this.report.page[this.newPageKey] === undefined)
      this.report.page[this.newPageKey] = true;
    this.pageProps.values = this.report.page;

  }


  lastSave = Promise.resolve();
  async save() {
    this.lastSave = this.lastSave.then(async () => {
      this.row.info = JSON.parse(JSON.stringify(this.report));
      await this.busy.donotWait(() => this.row.save());
    });
  }
}


@Entity("stickerInfo", {//don't change name - it's wrong, but data needs to be migrated for it to work again
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