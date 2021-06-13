import { Component, OnInit, ViewChild } from '@angular/core';
import { Context, SqlDatabase, EntityBase, getControllerDefs } from '@remult/core';
import { SqlBuilder, SqlFor } from '../model-shared/types';
import { Phone } from "../model-shared/Phone";
import { HelperId, Helpers, CompanyColumn } from '../helpers/helpers';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { InMemoryDataProvider, Entity } from '@remult/core';
import { sortColumns } from '../shared/utils';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';

import { Route } from '@angular/router';


import { saveToExcel } from '../shared/saveToExcel';
import { BusyService, DataAreaSettings, DataControlInfo, GridSettings, InputField, openDialog } from '@remult/angular';

import { ServerFunction } from '@remult/core';
import { Roles, AdminGuard } from '../auth/roles';
import { ApplicationSettings } from '../manage/ApplicationSettings';

import { getLang } from '../sites/sites';
import { DateRangeComponent } from '../date-range/date-range.component';
import { DestroyHelper, DialogService } from '../select-popup/dialog';
import { HelperGifts } from '../helper-gifts/HelperGifts';
import { use, Field } from '../translate';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { DistributionCenters, filterDistCenter } from '../manage/distribution-centers';



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
  get $() { return getControllerDefs(this, this.context).fields }
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
  constructor(private context: Context, private busy: BusyService, public settings: ApplicationSettings, public dialog: DialogService) {
    this.helperStorage = new InMemoryDataProvider();
    this.dialog.onDistCenterChange(() => this.refresh(), this.destroyHelper);
    let stam = new Context();
    stam.setDataProvider(this.helperStorage);
    this.helperInfo = new GridSettings(stam.for(helperHistoryInfo), {
      showFilter: true,
      allowSelection: true,

      numOfColumnsInGrid: (this.settings.isSytemForMlt() ? 10 : 7),
      gridButtons: [{
        name: this.settings.lang.exportToExcel,
        visible: () => this.context.isAllowed(Roles.admin),
        click: async () => {
          await saveToExcel(this.settings, stam.for(helperHistoryInfo), this.helperInfo, this.settings.lang.volunteers, this.busy, (d: helperHistoryInfo, c) => c == d.$.courier);
        }
      },
      {
        name: 'הענק מתנה',
        visible: () => this.settings.isSytemForMlt() && this.context.isAllowed(Roles.admin),
        click: async () => {
          let rows = this.helperInfo.selectedRows;

          if (rows.length == 0) {
            this.dialog.Error('לא נבחרו מתנדבים');
            return;
          }

          if (await openDialog(YesNoQuestionComponent, q => q.args = {
            question: 'האם להעניק מתנה ל ' + rows.length + ' מתנדבים?'
          }, q => q.yes)) {
            if (await context.for(HelperGifts).count(g => g.assignedToHelper.isEqualTo(null)) >= rows.length) {
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
            let h = await this.context.for(Helpers).findId(x.courier);
            h.showDeliveryHistory(this.dialog, this.busy);
          },
        },
        {
          name: 'הענק מתנה',
          visible: () => this.settings.isSytemForMlt() && this.context.isAllowed(Roles.admin),
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
    let rows: any[] = this.helperStorage.rows[this.context.for(helperHistoryInfo).defs.dbName];
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
  deliveries = new GridSettings(this.context.for(FamilyDeliveries), {
    showFilter: true,
    rowCssClass: d => d.deliverStatus.getCss(),
    gridButtons: [{
      name: this.settings.lang.exportToExcel,
      click: async () => {
        let includeFamilyInfo = await this.dialog.YesNoPromise(this.settings.lang.includeFamilyInfoInExcelFile);
        await saveToExcel(this.settings, this.context.for(FamilyDeliveries), this.deliveries, this.settings.lang.deliveries, this.busy, (d: FamilyDeliveries, c) => c == d.$.id || c == d.$.family, undefined,
          async (f, addColumn) => {
            await f.basketType.addBasketTypes(f.quantity, addColumn);
            f.addStatusExcelColumn(addColumn);
            if (includeFamilyInfo)
              await f.addFamilyInfoToExcelFile(addColumn);

          });
      }, visible: () => this.context.isAllowed(Roles.admin)
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
      let r = d.deliveryStatusDate.isGreaterOrEqualTo(this.dateRange.fromDate).and(d.deliveryStatusDate.isLessThan(toDate)).and(filterDistCenter(d.distributionCenter, this.dialog.distCenter, this.context))
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
        , textInMenu: () => getLang(this.context).deliveryDetails
      },
      {
        name: '',
        icon: 'replay',
        showInLine: true,
        visible: x => (x.archive) && this.context.isAllowed(Roles.admin),
        click: async fd => {
          fd.archive = false;
          await fd.save();
          this.refresh();
        }
        , textInMenu: () => getLang(this.context).revertArchive
      }
    ]
  });
  async ngOnInit() {

    if (this.mltColumns.length > 0)
      sortColumns(this.deliveries, this.mltColumns);
    this.dateRange.ngOnInit();
    this.refreshHelpers();

  }
  @ServerFunction({ allowed: Roles.admin })
  static async getHelperHistoryInfo(fromDate: Date, toDate: Date, distCenter: DistributionCenters, onlyDone: boolean, onlyArchived: boolean, context?: Context, db?: SqlDatabase) {


    toDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1);
    var sql = new SqlBuilder();
    var fd = SqlFor(context.for(FamilyDeliveries));

    var h = SqlFor(context.for(Helpers));
    var hg = SqlFor(context.for(HelperGifts));


    let r = fd.deliveryStatusDate.isGreaterOrEqualTo(fromDate).and(
      fd.deliveryStatusDate.isLessThan(toDate)).and(filterDistCenter(fd.distributionCenter, distCenter, context));
    if (onlyDone)
      r = r.and(DeliveryStatus.isAResultStatus(fd.deliverStatus));
    if (onlyArchived)
      r = r.and(fd.archive.isEqualTo(true));


    let queryText =
      sql.build("select ", [
        fd.courier.dbName,
        sql.columnInnerSelect(fd, {
          select: () => [h.name],
          from: h,
          where: () => [sql.build(h.id, "=", fd.courier.dbName)]
        }),
        sql.columnInnerSelect(fd, {
          select: () => [h.company],
          from: h,
          where: () => [sql.build(h.id, "=", fd.courier.dbName)]
        }),
        sql.columnInnerSelect(fd, {
          select: () => [h.phone],
          from: h,
          where: () => [sql.build(h.id, "=", fd.courier.dbName)]
        }),
        sql.columnInnerSelect(hg, {
          select: () => [sql.build('sum (case when ', sql.eq(hg.wasConsumed, true), ' then 1 else 0 end) consumed')],
          from: hg,
          where: () => [sql.build(hg.assignedToHelper, "=", fd.courier.dbName)]
        }),
        sql.columnInnerSelect(hg, {
          select: () => [sql.build('sum (case when ', sql.eq(hg.wasConsumed, false), ' then 1 else 0 end) pending')],
          from: hg,
          where: () => [sql.build(hg.assignedToHelper, "=", fd.courier.dbName)]
        })
        , "deliveries", "dates", "families", "succesful", "selfassigned"], " from (",
        sql.build("select ", [
          fd.courier,
          "count(*) deliveries",
          sql.build("count (distinct date (", fd.courierAssingTime, ")) dates"),
          sql.build("count (distinct ", fd.family, ") families"),
          sql.build('sum (case when ', sql.eq(fd.courierAssignUser, fd.courier), ' and ', sql.and(DeliveryStatus.isSuccess(fd.deliverStatus)), ' then 1 else 0 end) selfassigned'),
          sql.build('sum (', sql.case([{ when: [DeliveryStatus.isSuccess(fd.deliverStatus)], then: 1 }], 0), ') succesful')],
          ' from ', fd,
          ' where ', sql.and(r))

        + sql.build(' group by ', fd.courier), ") x");

    return (await db.execute(queryText)).rows;

  }

}
@Entity({
  key: 'helperHistoryInfo',
  includeInApi: false
})
export class helperHistoryInfo extends EntityBase {

  @Field()
  courier: string;
  @Field({ translation: l => l.volunteerName })
  name: string;
  @Field({ translation: l => l.phone })
  phone: Phone;
  @CompanyColumn()
  company: string;
  @Field({ translation: l => l.deliveries })
  deliveries: number;
  @Field({ translation: l => l.delveriesSuccesfull })
  succesful: number;
  @Field({ translation: l => l.selfAssigned })
  selfassigned: number;
  @Field({ translation: l => l.families })
  families: number;
  @Field({ translation: l => l.dates })
  dates: number;
  @Field({ caption: 'מתנות שמומשו' })
  giftsConsumed: number;
  @Field({ caption: 'מתנות זמינות' })
  giftsPending: number;


}

