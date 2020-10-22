import { Component, OnInit, ViewChild } from '@angular/core';
import { EntityClass, Context, StringColumn, IdColumn, SpecificEntityHelper, SqlDatabase, Column, DataControlInfo, BoolColumn } from '@remult/core';
import { FamilyId } from '../families/families';
import { SqlBuilder, PhoneColumn } from '../model-shared/types';
import { BasketId } from '../families/BasketType';
import { DeliveryStatusColumn } from '../families/DeliveryStatus';
import { HelperId, HelperIdReadonly, Helpers, CompanyColumn } from '../helpers/helpers';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { CompoundIdColumn, DateColumn, DataAreaSettings, InMemoryDataProvider, Entity, GridSettings, NumberColumn } from '@remult/core';
import { sortColumns } from '../shared/utils';

import { Route } from '@angular/router';


import { saveToExcel } from '../shared/saveToExcel';
import { BusyService } from '@remult/core';
import { FamilySourceId } from '../families/FamilySources';
import { ServerFunction } from '@remult/core';
import { Roles, AdminGuard } from '../auth/roles';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DistributionCenterId } from '../manage/distribution-centers';
import { getLang } from '../sites/sites';
import { DateRangeComponent } from '../date-range/date-range.component';
import { DestroyHelper, DialogService } from '../select-popup/dialog';



@Component({
  selector: 'app-delivery-history',
  templateUrl: './delivery-history.component.html',
  styleUrls: ['./delivery-history.component.scss']
})
export class DeliveryHistoryComponent implements OnInit {


  helperInfo: GridSettings<helperHistoryInfo>;


  @ViewChild(DateRangeComponent, { static: true }) dateRange;

  onlyDone = new BoolColumn({ caption: this.settings.lang.showOnlyCompletedDeliveries, defaultValue: true })
  onlyArchived = new BoolColumn({ caption: this.settings.lang.showOnlyArchivedDeliveries, defaultValue: this.settings.isSytemForMlt() })
  rangeArea = new DataAreaSettings({
    columnSettings: () => [this.onlyDone, this.onlyArchived],
  });

  async refresh() {
    this.deliveries.getRecords();
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

    this.helperInfo = context.for(helperHistoryInfo, this.helperStorage).gridSettings({
      showFilter: true,

      numOfColumnsInGrid: (this.settings.isSytemForMlt() ? 8 : 7),
      gridButtons: [{
        name: this.settings.lang.exportToExcel,
        visible: () => this.context.isAllowed(Roles.admin),
        click: async () => {
          await saveToExcel(this.settings, this.context.for(helperHistoryInfo, this.helperStorage), this.helperInfo, this.settings.lang.volunteers, this.busy, (d: helperHistoryInfo, c) => c == d.courier);
        }
      }],
      rowButtons: [{
        name: this.settings.lang.deliveries,
        click: async x => {
          let h = await this.context.for(Helpers).findId(x.courier);
          h.showDeliveryHistory(this.dialog,this.busy);
        },
      }],
      columnSettings: h => [
        {
          column: h.name,
          width: '150'
        },
        {
          column: h.phone,
          width: '140'
        },
        {
          column: h.company,
          width: '150'
        },
        {
          column: h.deliveries,
          width: '75'
        },
        {
          column: h.succesful,
          width: '75'
        },
        {
          column: h.families,

          width: '75'
        },
        {
          column: h.dates,
          width: '75'
        },
        {
          column: h.selfassigned,
          width: '75'
        },
      ],
      get: {
        limit: 100,
        orderBy: h => [{ column: h.deliveries, descending: true }]
      },
      knowTotalRows: true
    });


  }
  private async refreshHelpers() {

    var x = await DeliveryHistoryComponent.getHelperHistoryInfo(this.dateRange.fromDate.rawValue, this.dateRange.toDate.rawValue, this.dialog.distCenter.value, this.onlyDone.value, this.onlyArchived.value);
    let rows: any[] = this.helperStorage.rows[this.context.for(helperHistoryInfo).create().defs.dbName];
    x = x.map(x => {
      x.deliveries = +x.deliveries;
      x.dates = +x.dates;
      x.families = +x.families;
      x.succesful = +x.succesful;
      x.selfassigned = +x.selfassigned;
      return x;
    });
    rows.splice(0, rows.length, ...x);
    this.helperInfo.getRecords();
  }

  mltColumns: DataControlInfo<FamilyDeliveries>[] = [];
  deliveries = this.context.for(FamilyDeliveries).gridSettings({
    showFilter: true,
    rowCssClass: d => d.deliverStatus.getCss(),
    gridButtons: [{
      name: this.settings.lang.exportToExcel,
      click: async () => {
        await saveToExcel(this.settings, this.context.for(FamilyDeliveries), this.deliveries, this.settings.lang.deliveries, this.busy, (d: FamilyDeliveries, c) => c == d.id || c == d.family, undefined,
          async (f, addColumn) => {
            await f.basketType.addBasketTypes(f.quantity, addColumn);
            f.addStatusExcelColumn(addColumn);
          });
      }, visible: () => this.context.isAllowed(Roles.admin)
    }],
    columnSettings: d => {
      let r: DataControlInfo<FamilyDeliveries>[] = [
        d.name,
        {
          caption: this.settings.lang.deliverySummary,
          column: d.deliverStatus,
          readOnly: true,
          valueList: d.deliverStatus.getOptions()
          ,
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
      for (const c of d.columns) {
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
    get: {
      limit: 50,
      where: d => {
        var toDate = this.dateRange.toDate.value;
        toDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1);
        let r = d.deliveryStatusDate.isGreaterOrEqualTo(this.dateRange.fromDate.value).and(d.deliveryStatusDate.isLessThan(toDate)).and(d.distributionCenter.filter(this.dialog.distCenter.value))
        if (this.onlyDone.value)
          r = r.and(d.deliverStatus.isAResultStatus());
        if (this.onlyArchived.value)
          r = r.and(d.archive.isEqualTo(true));
        return r;
      }
    },
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
        visible: x => (x.archive.value) && this.context.isAllowed(Roles.admin),
        click: async fd => {
          fd.archive.value = false;
          await fd.save();
          this.refresh();
        }
        , textInMenu: () => getLang(this.context).revertArchive
      }
    ]
  });
  async ngOnInit() {
    if (!this.settings.isSytemForMlt())
      this.onlyArchived.value = false;

    if (this.mltColumns.length > 0)
      sortColumns(this.deliveries, this.mltColumns);
      this.dateRange.ngOnInit();
    this.refreshHelpers();

  }
  @ServerFunction({ allowed: Roles.admin })
  static async getHelperHistoryInfo(fromDate: string, toDate: string, distCenter: string, onlyDone: boolean, onlyArchived: boolean, context?: Context, db?: SqlDatabase) {
    var fromDateDate = DateColumn.stringToDate(fromDate);
    var toDateDate = DateColumn.stringToDate(toDate);
    toDateDate = new Date(toDateDate.getFullYear(), toDateDate.getMonth(), toDateDate.getDate() + 1);
    var sql = new SqlBuilder();
    var fd = context.for(FamilyDeliveries).create();
    var h = context.for(Helpers).create();

    let r = fd.deliveryStatusDate.isGreaterOrEqualTo(fromDateDate).and(
      fd.deliveryStatusDate.isLessThan(toDateDate)).and(fd.distributionCenter.filter(distCenter));
    if (onlyDone)
      r = r.and(fd.deliverStatus.isAResultStatus());
    if (onlyArchived)
      r = r.and(fd.archive.isEqualTo(true));


    let queryText =   
      sql.build("select ", [
        fd.courier.defs.dbName,
        sql.columnInnerSelect(fd, {
          select: () => [h.name],
          from: h,
          where: () => [sql.build(h.id, "=", fd.courier.defs.dbName)]
        }),
        sql.columnInnerSelect(fd, {
          select: () => [h.company],
          from: h,
          where: () => [sql.build(h.id, "=", fd.courier.defs.dbName)]
        }),
        sql.columnInnerSelect(fd, {
          select: () => [h.phone],
          from: h,
          where: () => [sql.build(h.id, "=", fd.courier.defs.dbName)]
        })
        , "deliveries", "dates", "families", "succesful", "selfassigned"], " from (",
        sql.build("select ", [
          fd.courier.defs.dbName,
          "count(*) deliveries",
          sql.build("count (distinct date (", fd.courierAssingTime.defs.dbName, ")) dates"),
          sql.build("count (distinct ", fd.family.defs.dbName, ") families"),
          sql.build('sum (case when ', sql.eq(fd.courierAssignUser, fd.courier), ' and ', sql.and(fd.deliverStatus.isSuccess()), ' then 1 else 0 end) selfassigned'),
          sql.build('sum (', sql.case([{ when: [fd.deliverStatus.isSuccess()], then: 1 }], 0), ') succesful')],
          ' from ', fd.defs.dbName,
          ' where ', sql.and(r))

        + sql.build(' group by ', fd.courier.defs.dbName), ") x");
        
        return (await db.execute(queryText)).rows;

  }

}
@EntityClass
export class helperHistoryInfo extends Entity<string>{

  courier = new StringColumn();
  name = new StringColumn(getLang(this.context).volunteerName);
  phone = new PhoneColumn(getLang(this.context).phone);
  company = new CompanyColumn(this.context);
  deliveries = new NumberColumn(getLang(this.context).deliveries);
  succesful = new NumberColumn(getLang(this.context).delveriesSuccesfull);
  selfassigned = new NumberColumn(getLang(this.context).selfAssigned);
  families = new NumberColumn(getLang(this.context).families);
  dates = new NumberColumn(getLang(this.context).dates);
  constructor(private context: Context) {
    super({ name: 'helperHistoryInfo', allowApiRead: false, allowApiCRUD: false });

  }
}

