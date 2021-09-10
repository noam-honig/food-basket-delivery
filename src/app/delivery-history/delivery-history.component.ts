import { Component, OnInit, ViewChild } from '@angular/core';
import { Remult, SqlDatabase, EntityBase, getFields } from 'remult';
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Phone } from "../model-shared/phone";
import {  Helpers, CompanyColumn } from '../helpers/helpers';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { InMemoryDataProvider, Entity } from 'remult';
import { sortColumns } from '../shared/utils';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';

import { Route } from '@angular/router';


import { saveToExcel } from '../shared/saveToExcel';
import { BusyService, DataAreaSettings, DataControlInfo, GridSettings, InputField, openDialog } from '@remult/angular';

import { BackendMethod } from 'remult';
import { Roles, AdminGuard } from '../auth/roles';
import { ApplicationSettings } from '../manage/ApplicationSettings';

import { getLang } from '../sites/sites';
import { DateRangeComponent } from '../date-range/date-range.component';
import { DestroyHelper, DialogService } from '../select-popup/dialog';
import { HelperGifts } from '../helper-gifts/HelperGifts';
import { use, Field, IntegerField } from '../translate';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { DistributionCenters } from '../manage/distribution-centers';




@Component({
  selector: 'app-delivery-history',
  templateUrl: './delivery-history.component.html',
  styleUrls: ['./delivery-history.component.scss']
})
export class DeliveryHistoryComponent implements OnInit {


  helperInfo: GridSettings<helperHistoryInfo>;


  @ViewChild(DateRangeComponent, { static: true }) dateRange;

  @Field({ translation: l => l.showOnlyCompletedDeliveries })
  onlyDone: boolean = true;
  @Field({ translation: l => l.showOnlyArchivedDeliveries })
  onlyArchived: boolean = false;
  get $() { return getFields(this, this.remult) }
  rangeArea = new DataAreaSettings({
    fields: () => {
      return [this.$.onlyDone, this.$.onlyArchived]
    },
  });

  async refresh() {
    this.deliveries.reloadData();
    await this.refreshHelpers();
  }
  static route: Route = {
    path: 'history',
    component: DeliveryHistoryComponent,
    canActivate: [AdminGuard]
  }
  destroyHelper = new DestroyHelper();
  ngOnDestroy(): void {
    this.destroyHelper.destroy();
  }
  helperStorage: InMemoryDataProvider;
  constructor(private remult: Remult, private busy: BusyService, public settings: ApplicationSettings, public dialog: DialogService) {
    this.helperStorage = new InMemoryDataProvider();
    this.dialog.onDistCenterChange(() => this.refresh(), this.destroyHelper);
    let stam = new Remult();
    stam.setDataProvider(this.helperStorage);
    this.helperInfo = new GridSettings(stam.repo(helperHistoryInfo), {
      allowSelection: true,
      numOfColumnsInGrid: (this.settings.isSytemForMlt() ? 10 : 7),
      gridButtons: [{
        name: this.settings.lang.exportToExcel,
        visible: () => this.remult.isAllowed(Roles.admin),
        click: async () => {
          await saveToExcel(this.settings, stam.repo(helperHistoryInfo), this.helperInfo, this.settings.lang.volunteers, this.busy, (d: helperHistoryInfo, c) => c == d.$.courier);
        }
      },
      {
        name: 'הענק מתנה',
        visible: () => this.settings.isSytemForMlt() && this.remult.isAllowed(Roles.admin),
        click: async () => {
          let rows = this.helperInfo.selectedRows;

          if (rows.length == 0) {
            this.dialog.Error('לא נבחרו מתנדבים');
            return;
          }

          if (await openDialog(YesNoQuestionComponent, q => q.args = {
            question: 'האם להעניק מתנה ל ' + rows.length + ' מתנדבים?'
          }, q => q.yes)) {
            if (await  remult.repo(HelperGifts).count(g => g.assignedToHelper.isEqualTo(null)) >= rows.length) {
              for (const h of rows) {
                await HelperGifts.assignGift(h.courier);
              }
              this.refresh();
            } else {
              this.dialog.Error('אין מספיק מתנות לחלוקה');
            }
          }
        },
      }
      ],
      rowButtons: [
        {
          name: this.settings.lang.deliveries,
          click: async x => {
            let h = await this. remult.repo(Helpers).findId(x.courier);
            h.showDeliveryHistory(this.dialog, this.busy);
          },
        },
        {
          name: 'הענק מתנה',
          visible: () => this.settings.isSytemForMlt() && this.remult.isAllowed(Roles.admin),
          click: async x => {
            await HelperGifts.assignGift(x.courier);
            this.refresh();
          },
        }
      ],
      columnSettings: h => {
        let r = [
          {
            field: h.name,
            width: '150'
          },
          {
            field: h.phone,
            width: '140'
          },
          {
            field: h.company,
            width: '150'
          },
          {
            field: h.deliveries,
            width: '75'
          },
          {
            field: h.succesful,
            width: '75'
          },
          {
            field: h.families,

            width: '75'
          },
          {
            field: h.dates,
            width: '75'
          }];
        if (settings.isSytemForMlt()) {
          r.push(
            {
              field: h.selfassigned,
              width: '75'
            },
            {
              field: h.giftsConsumed,
              width: '75'
            },
            {
              field: h.giftsPending,
              width: '75'
            }
          );
        }
        return r;
      },

      rowsInPage: 100,
      orderBy: h => h.deliveries.descending(),

      knowTotalRows: true
    });


  }
  private async refreshHelpers() {

    var x = await DeliveryHistoryComponent.getHelperHistoryInfo(this.dateRange.fromDate, this.dateRange.toDate, this.dialog.distCenter, this.onlyDone, this.onlyArchived);

    let rows: any[] = this.helperStorage.rows[(await this. remult.repo(helperHistoryInfo).metadata.getDbName())];
    x = x.map(x => {
      x.deliveries = +x.deliveries;
      x.dates = +x.dates;
      x.families = +x.families;
      x.succesful = +x.succesful;
      x.selfassigned = +x.selfassigned;
      x.giftsConsumed = +x.consumed;
      x.giftsPending = +x.pending;
      return x;
    });
    rows.splice(0, rows.length, ...x);
    this.helperInfo.reloadData();
  }

  mltColumns: DataControlInfo<FamilyDeliveries>[] = [];
  deliveries = new GridSettings(this. remult.repo(FamilyDeliveries), {
    rowCssClass: d => d.deliverStatus.getCss(),
    gridButtons: [{
      name: this.settings.lang.exportToExcel,
      click: async () => {
        let includeFamilyInfo = await this.dialog.YesNoPromise(this.settings.lang.includeFamilyInfoInExcelFile);
        await saveToExcel(this.settings, this. remult.repo(FamilyDeliveries), this.deliveries, this.settings.lang.deliveries, this.busy, (d: FamilyDeliveries, c) => c == d.$.id || c == d.$.family, undefined,
          async (f, addColumn) => {
            await f.basketType.addBasketTypes(f.quantity, addColumn);
            f.addStatusExcelColumn(addColumn);
            if (includeFamilyInfo)
              await f.addFamilyInfoToExcelFile(addColumn);

          });
      }, visible: () => this.remult.isAllowed(Roles.admin)
    }],
    columnSettings: d => {
      let r: DataControlInfo<FamilyDeliveries>[] = [
        d.name,
        {
          caption: this.settings.lang.deliverySummary,
          field: d.deliverStatus,
          readonly: true,
          getValue: f => f.getShortDeliveryDescription(),
          width: '300'
        },
        d.basketType,
        d.quantity,
        d.city,
        d.familySource,
        d.courierComments,
        d.courierAssignUser,
        d.courierAssingTime,
        d.deliveryStatusUser
      ];
      for (const c of d) {
        if (!r.includes(c) && c != d.id && c != d.family)
          r.push(c);
      }


      if (this.settings.isSytemForMlt()) {
        this.mltColumns = [
          d.name,
          d.basketType,
          d.quantity,
          d.city,
          d.distributionCenter,
          d.receptionComments
        ]
      } else this.mltColumns = [];
      return r;
    },


    numOfColumnsInGrid: (this.mltColumns.length ? this.mltColumns.length : 6),
    knowTotalRows: true,

    rowsInPage: 50,
    where: d => {
      var toDate = this.dateRange.toDate;
      toDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1);
      let r = d.deliveryStatusDate.isGreaterOrEqualTo(this.dateRange.fromDate).and(d.deliveryStatusDate.isLessThan(toDate)).and(this.dialog.filterDistCenter(d.distributionCenter))
      if (this.onlyDone)
        r = r.and(DeliveryStatus.isAResultStatus(d.deliverStatus));
      if (this.onlyArchived)
        r = r.and(d.archive.isEqualTo(true));
      return r;
    }
    ,
    rowButtons: [
      {
        name: '',
        icon: 'edit',
        showInLine: true,
        click: async fd => {
          fd.showDetailsDialog({
            dialog: this.dialog
          });
        }
        , textInMenu: () => getLang(this.remult).deliveryDetails
      },
      {
        name: '',
        icon: 'replay',
        showInLine: true,
        visible: x => (x.archive) && this.remult.isAllowed(Roles.admin),
        click: async fd => {
          fd.archive = false;
          await fd.save();
          this.refresh();
        }
        , textInMenu: () => getLang(this.remult).revertArchive
      }
    ]
  });
  async ngOnInit() {

    if (this.mltColumns.length > 0)
      sortColumns(this.deliveries, this.mltColumns);
    this.dateRange.ngOnInit();
    this.refreshHelpers();

  }
  @BackendMethod({ allowed: Roles.admin })
  static async getHelperHistoryInfo(fromDate: Date, toDate: Date, distCenter: DistributionCenters, onlyDone: boolean, onlyArchived: boolean, remult?: Remult, db?: SqlDatabase) {


    toDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1);
    var sql = new SqlBuilder(remult);
    var fd =await  SqlFor( remult.repo(FamilyDeliveries));

    var h =await  SqlFor( remult.repo(Helpers));
    var hg =await  SqlFor( remult.repo(HelperGifts));


    let r = fd.deliveryStatusDate.isGreaterOrEqualTo(fromDate).and(
      fd.deliveryStatusDate.isLessThan(toDate)).and(remult.filterDistCenter(fd.distributionCenter, distCenter));
    if (onlyDone)
      r = r.and(DeliveryStatus.isAResultStatus(fd.deliverStatus));
    if (onlyArchived)
      r = r.and(fd.archive.isEqualTo(true));


    let queryText =
      await sql.build("select ", [
        fd.courier.getDbName(),
        sql.columnInnerSelect(fd, {
          select: () => [h.name],
          from: h,
          where: () => [sql.build(h.id, "=", fd.courier.getDbName())]
        }),
        sql.columnInnerSelect(fd, {
          select: () => [h.company],
          from: h,
          where: () => [sql.build(h.id, "=", fd.courier.getDbName())]
        }),
        sql.columnInnerSelect(fd, {
          select: () => [h.phone],
          from: h,
          where: () => [sql.build(h.id, "=", fd.courier.getDbName())]
        }),
        sql.columnInnerSelect(hg, {
          select: () => [sql.build('sum (case when ', sql.eq(hg.wasConsumed, true), ' then 1 else 0 end) consumed')],
          from: hg,
          where: () => [sql.build(hg.assignedToHelper, "=", fd.courier.getDbName())]
        }),
        sql.columnInnerSelect(hg, {
          select: () => [sql.build('sum (case when ', sql.eq(hg.wasConsumed, false), ' then 1 else 0 end) pending')],
          from: hg,
          where: () => [sql.build(hg.assignedToHelper, "=", fd.courier.getDbName())]
        })
        , "deliveries", "dates", "families", "succesful", "selfassigned"], " from (",
        await sql.build("select ", [
          fd.courier,
          "count(*) deliveries",
          sql.build("count (distinct date (", fd.courierAssingTime, ")) dates"),
          sql.build("count (distinct ", fd.family, ") families"),
          sql.build('sum (case when ', sql.eq(fd.courierAssignUser, fd.courier), ' and ', sql.and(DeliveryStatus.isSuccess(fd.deliverStatus)), ' then 1 else 0 end) selfassigned'),
          sql.build('sum (', sql.case([{ when: [DeliveryStatus.isSuccess(fd.deliverStatus)], then: 1 }], 0), ') succesful')],
          ' from ', fd,
          ' where ', sql.and(r))

        +await  sql.build(' group by ', fd.courier), ") x");

    return (await db.execute(queryText)).rows;

  }

}

@Entity( undefined)
export class helperHistoryInfo extends EntityBase {

  @Field()
  courier: string;
  @Field({ translation: l => l.volunteerName })
  name: string;
  @Field({ translation: l => l.phone })
  phone: Phone;
  @CompanyColumn()
  company: string;
  @IntegerField({ translation: l => l.deliveries })
  deliveries: number;
  @IntegerField({ translation: l => l.delveriesSuccesfull })
  succesful: number;
  @IntegerField({ translation: l => l.selfAssigned })
  selfassigned: number;
  @IntegerField({ translation: l => l.families })
  families: number;
  @IntegerField({ translation: l => l.dates })
  dates: number;
  @IntegerField({ caption: 'מתנות שמומשו' })
  giftsConsumed: number;
  @IntegerField({ caption: 'מתנות זמינות' })
  giftsPending: number;


}

