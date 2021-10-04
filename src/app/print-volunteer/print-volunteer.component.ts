import { Component, OnInit } from '@angular/core';
import { BusyService } from '@remult/angular';
import { Entity, Field, IdEntity, Remult } from 'remult';
import { Roles } from '../auth/roles';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { VolunteerReportDefs } from '../print-stickers/VolunteerReportDefs';
import { Control, ElementProps, getMarginsH } from '../properties-editor/properties-editor.component';

@Component({
  selector: 'app-print-volunteer',
  templateUrl: './print-volunteer.component.html',
  styleUrls: ['./print-volunteer.component.scss']
})
export class PrintVolunteerComponent implements OnInit {


  constructor(private remult: Remult, private busy: BusyService, public settings: ApplicationSettings) { }
  defs = new VolunteerReportDefs(this.remult);
  report: ReportInfo;
  row: VolunteerReportInfo;

  pageProps: ElementProps = {
    caption: 'תכונות דף', props: [
      ...getMarginsH()]

  };
  data: {
    firstRow: {},
    deliveries: any[]
  }[] = [];
  currentProps = this.pageProps;
  editControl(x) {

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
              [this.columnCaptionKey]: this.remult.lang.familyName
            },
            controls: [{ fieldKey: 'name', propertyValues: { 'bold': 'true' } }, { fieldKey: "address" }]
          }
        ],
        page: {}


      }
    }
    this.pageProps.values = this.report.page;

  }
  columnCaptionKey = "@columnCaption";

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