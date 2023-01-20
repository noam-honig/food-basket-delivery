import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusyService, openDialog, SelectValueDialogComponent } from '../common-ui-elements';
import { totalmem } from 'os';
import { remult } from 'remult';
import { quantityHelper } from '../families/BasketType';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { VolunteerReportDefs } from '../print-stickers/VolunteerReportDefs';
import { Control, ElementProps, getMarginsH, getMarginsV, Property, SizeProperty } from '../print-stickers/VolunteerReportDefs';
import { DialogService } from '../select-popup/dialog';
import { VolunteerReportInfo } from './VolunteerReportInfo';

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

  remult = remult;
  constructor(private dialog: DialogService, public settings: ApplicationSettings, private route: ActivatedRoute) { }
  defs = new VolunteerReportDefs(this.dialog);
  report: ReportInfo;
  row: VolunteerReportInfo;
  readonly newPageKey = '@newPageKey';
  readonly showItemsTotalsKey = '@showTotalsKey';
  readonly showBasketTotalsKey = '@showTotalBasketsKey';
  pageBreakBefore() {
    if (this.report.page[this.newPageKey])
      return 'always';
    return 'none';
  }
  pageProps: ElementProps = {
    caption: remult.context.lang.pageProperties, props: [
      ...getMarginsH(), {
        caption: remult.context.lang.newPageForEachVolunteer,
        inputType: "checkbox",
        key: this.newPageKey
      },
      {
        caption: remult.context.lang.showBasketTotals,
        inputType: "checkbox",
        key: this.showBasketTotalsKey
      }, {
        caption: remult.context.lang.showItemsTotals,
        inputType: "checkbox",
        key: this.showItemsTotalsKey
      }]

  };

  columnProps: ElementProps = {
    caption: remult.context.lang.columnProperties, props: [
      ...this.defs.fieldProps.props,
      new SizeProperty('width', remult.context.lang.width)
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
      propertyValues: { [this.defs.textBeforeKey]: remult.context.lang.newColumn }
    })
    this.editColumn(this.report.columns[this.report.columns.length - 1]);

    this.save();
  }
  currentColumn: ReportColumn;
  editColumn(c: ReportColumn) {
    this.currentProps = this.columnProps;
    this.currentProps.values = c.propertyValues;
    this.currentProps.caption = remult.context.lang.columnProperties + ': ' + c.propertyValues[this.defs.textBeforeKey];
    this.currentColumn = c;
    this.currentControlList = c.controls;

  }
  data: {
    firstRow: {},
    deliveries: any[],
    items: string,
    baskets: string
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
  moveControl(pos = 1) {
    let from = this.currentControlList.indexOf(this.currentProps.control);
    let to = from + pos;
    if (to >= this.currentControlList.length || to < 0)
      return;
    this.currentControlList.splice(to, 0, ...this.currentControlList.splice(from, 1));
    this.save();

  }
  removeColumn() {
    this.report.columns.splice(this.report.columns.indexOf(this.currentColumn), 1);
    this.save();
  }
  moveColumn(pos = 1) {
    let from = this.report.columns.indexOf(this.currentColumn);
    let to = from + pos;
    if (to >= this.report.columns.length || to < 0)
      return;
    this.report.columns.splice(to, 0, ...this.report.columns.splice(from, 1));
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
          deliveries,
          items: '',
          baskets: ''
        })
      }
      deliveries.push(d);
    }
    this.data = [...this.data.filter(x => x.firstRow[this.defs.helperPhoneKey]), ...this.data.filter(x => !x.firstRow[this.defs.helperPhoneKey])];
    for (const item of this.data) {
      if (!item.firstRow[this.defs.helperPhoneKey])
        item.deliveries.sort((a, b) => a[this.defs.nameKey].toString().localeCompare(b[this.defs.nameKey]))
      let totalItems = new quantityHelper();
      let totalBaskets = new quantityHelper();
      item.deliveries.forEach(d => {
        totalBaskets.parseComment(d[this.defs.basketTypeKey], +d[this.defs.quantityKey]);
        let items: string = d[this.defs.itemsKey].toString();
        items.split('\n').forEach(y => totalItems.parseComment(y.replace('X', ' ')))
      });
      item.items = totalItems.toString();
      item.baskets = totalBaskets.toString();


    }
    this.row = await remult.repo(VolunteerReportInfo).findFirst({ key: "volunteerReport" }, { useCache: false, createIfNotFound: true });
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
      await this.dialog.donotWait(() => this.row.save());
    });
  }
}


export interface ReportInfo {
  page: any;
  controls: Control[];
  columns: ReportColumn[];
}
interface ReportColumn {
  propertyValues?: any;
  controls: Control[];
}