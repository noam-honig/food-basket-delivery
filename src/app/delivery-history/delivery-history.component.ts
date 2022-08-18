import { Component, OnInit, ViewChild } from '@angular/core';
import { EntityBase, getFields, remult } from 'remult';
import { Phone } from "../model-shared/phone";
import { Helpers, CompanyColumn } from '../helpers/helpers';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { InMemoryDataProvider, Entity } from 'remult';
import { sortColumns } from '../shared/utils';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';

import { Route } from '@angular/router';

import { saveToExcel } from '../shared/saveToExcel';
import { DataAreaSettings, DataControlInfo, GridSettings } from '@remult/angular/interfaces';

import { AdminGuard } from '../auth/guards';
import { Roles } from '../auth/roles';
import { ApplicationSettings } from '../manage/ApplicationSettings';

import { getLang } from '../sites/sites';
import { DateRangeComponent } from '../date-range/date-range.component';
import { DestroyHelper, DialogService } from '../select-popup/dialog';
import { HelperGifts } from '../helper-gifts/HelperGifts';
import { use, Field, Fields } from '../translate';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { DistributionCenters } from '../manage/distribution-centers';
import { BusyService, openDialog, RouteHelperService } from '@remult/angular';
import { DeliveryHistoryController } from './delivery-history.controller';
import { PlaybackComponent } from '../playback/playback.component';




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
  get $() { return getFields(this, remult) }
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
  constructor(private busy: BusyService, public settings: ApplicationSettings, public dialog: DialogService, private routeHelper: RouteHelperService) {
    this.helperStorage = new InMemoryDataProvider();
    this.dialog.onDistCenterChange(() => this.refresh(), this.destroyHelper);

    this.helperInfo = new GridSettings(remult.repo(helperHistoryInfo, this.helperStorage), {
      allowSelection: true,
      numOfColumnsInGrid: (this.settings.isSytemForMlt ? 12 : 9),
      gridButtons: [
        {
          name: this.settings.lang.exportToExcel,
          visible: () => remult.isAllowed(Roles.admin),
          click: async () => {
            await saveToExcel(this.settings, remult.repo(helperHistoryInfo, this.helperStorage), this.helperInfo, this.settings.lang.volunteers, this.dialog, (d: helperHistoryInfo, c) => c == d.$.courier);
          }
        },
        {
          name: 'הענק מתנה',
          visible: () => this.settings.isSytemForMlt && remult.isAllowed(Roles.admin),
          click: async () => {
            let rows = this.helperInfo.selectedRows;

            if (rows.length == 0) {
              this.dialog.Error('לא נבחרו מתנדבים');
              return;
            }

            if (await openDialog(YesNoQuestionComponent, q => q.args = {
              question: 'האם להעניק מתנה ל ' + rows.length + ' מתנדבים?'
            }, q => q.yes)) {
              if (await remult.repo(HelperGifts).count({ assignedToHelper: null }) >= rows.length) {
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
            let h = await remult.repo(Helpers).findId(x.courier);
            h.showDeliveryHistory(this.dialog);
          },
        },
        {
          name: 'הענק מתנה',
          visible: () => this.settings.isSytemForMlt && remult.isAllowed(Roles.admin),
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
          },
          {
            field: h.firstDelivery,
            width: '75'
          },
          {
            field: h.lastDelivery,
            width: '75'
          }];
        if (settings.isSytemForMlt) {
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
      orderBy: { deliveries: "desc" },

      knowTotalRows: true
    });


  }
  private async refreshHelpers() {

    var x = await DeliveryHistoryController.getHelperHistoryInfo(this.dateRange.fromDate, this.dateRange.toDate, this.dialog.distCenter, this.onlyDone, this.onlyArchived);

    let rows: any[] = this.helperStorage.rows[(await remult.repo(helperHistoryInfo).metadata.getDbName())];
    x = x.map(x => {
      x.deliveries = +x.deliveries;
      x.dates = +x.dates;
      x.families = +x.families;
      x.succesful = +x.succesful;
      x.selfassigned = +x.selfassigned;
      x.giftsConsumed = +x.consumed;
      x.giftsPending = +x.pending;
      x.firstDelivery = x.firstd;
      x.lastDelivery = x.lastd;
      return x;
    });
    rows.splice(0, rows.length, ...x);
    this.helperInfo.reloadData();
  }

  mltColumns: DataControlInfo<FamilyDeliveries>[] = [];
  deliveries = new GridSettings(remult.repo(FamilyDeliveries), {
    rowCssClass: d => d.getCss(),
    gridButtons: [{
      name: 'playback',
      click: () => this.routeHelper.navigateToComponent(PlaybackComponent)

    }, {
      name: this.settings.lang.exportToExcel,
      click: async () => {
        let includeFamilyInfo = await this.dialog.YesNoPromise(this.settings.lang.includeFamilyInfoInExcelFile);
        await saveToExcel(this.settings, remult.repo(FamilyDeliveries), this.deliveries, this.settings.lang.deliveries, this.dialog, (d: FamilyDeliveries, c) => c == d.$.id || c == d.$.family, undefined,
          async (f, addColumn) => {
            await f.basketType?.addBasketTypes(f.quantity, addColumn);
            f.addStatusExcelColumn(addColumn);
            if (includeFamilyInfo)
              await f.addFamilyInfoToExcelFile(addColumn);
          }, async deliveries => {
            if (includeFamilyInfo) {
              await FamilyDeliveries.loadFamilyInfoForExcepExport( deliveries);
            }
          });
      }, visible: () => remult.isAllowed(Roles.admin)
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


      if (this.settings.isSytemForMlt) {
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
    where: () => {
      var toDate = this.dateRange.toDate;
      toDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1);
      return {
        deliveryStatusDate: { ">=": this.dateRange.fromDate, "<": toDate }, distributionCenter: this.dialog.filterDistCenter(),
        deliverStatus: this.onlyDone ? DeliveryStatus.isAResultStatus() : undefined,
        archive: this.onlyArchived ? true : undefined
      }
    }
    ,
    rowButtons: [
      {
        name: '',
        icon: 'edit',
        showInLine: true,
        click: async fd => {
          fd.showDetailsDialog({
            ui: this.dialog
          });
        }
        , textInMenu: () => getLang().deliveryDetails
      },
      {
        name: '',
        icon: 'replay',
        showInLine: true,
        visible: x => (x.archive) && remult.isAllowed(Roles.admin),
        click: async fd => {
          fd.archive = false;
          await fd.save();
          this.refresh();
        }
        , textInMenu: () => getLang().revertArchive
      }
    ]
  });
  async ngOnInit() {

    if (this.mltColumns.length > 0)
      sortColumns(this.deliveries, this.mltColumns);
    this.dateRange.ngOnInit();
    this.refreshHelpers();

  }


}

@Entity(undefined)
export class helperHistoryInfo extends EntityBase {

  @Field()
  courier: string;
  @Field({ translation: l => l.volunteerName })
  name: string;
  @Field({ translation: l => l.phone })
  phone: Phone;
  @CompanyColumn()
  company: string;
  @Fields.integer({ translation: l => l.deliveries })
  deliveries: number;
  @Fields.integer({ translation: l => l.delveriesSuccesfull })
  succesful: number;
  @Fields.integer({ translation: l => l.selfAssigned })
  selfassigned: number;
  @Fields.integer({ translation: l => l.families })
  families: number;
  @Fields.integer({ translation: l => l.dates })
  dates: number;
  @Fields.integer({ caption: 'מתנות שמומשו' })
  giftsConsumed: number;
  @Fields.integer({ caption: 'מתנות זמינות' })
  giftsPending: number;
  @Field({ translation: l => l.firstDelivery })
  firstDelivery: string;
  @Field({ translation: l => l.lastDelivery })
  lastDelivery: string;


}

