import { Component, OnInit } from '@angular/core';
import { ServerFunction, Context, SqlDatabase, EntityWhere, AndFilter, packWhere, BusyService, Column } from '@remult/core';
import { SqlBuilder } from '../model-shared/types';
import { Families } from '../families/families';
import { FamilyStatus } from '../families/FamilyStatus';
import { DialogService } from '../select-popup/dialog';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';
import { buildGridButtonFromActions } from '../families/familyActionsWiring';
import { familyActions, UpdateStatus, FreezeDeliveriesForFamilies, UnfreezeDeliveriesForFamilies, updateGroup } from '../families/familyActions';
import { FamiliesComponent, saveFamiliesToExcel } from '../families/families.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { MergeFamiliesComponent } from '../merge-families/merge-families.component';
import { Roles } from '../auth/roles';

@Component({
  selector: 'app-duplicate-families',
  templateUrl: './duplicate-families.component.html',
  styleUrls: ['./duplicate-families.component.scss']
})
export class DuplicateFamiliesComponent implements OnInit {

  constructor(private context: Context, private dialog: DialogService, public settings: ApplicationSettings, private busy: BusyService) { }
  duplicateFamilies: duplicateFamilies[] = [];
  async ngOnInit() {
    try {
      this.duplicateFamilies = await DuplicateFamiliesComponent.familiesInSameAddress();
      this.post();
    }
    catch (err) {
      this.dialog.Error(err);
    }
  }
  post = () => { };
  sortByAddress() {
    this.duplicateFamilies.sort((a, b) => a.address.localeCompare(b.address));
    this.post = () => this.sortByAddress();
  }
  sortByCount() {
    this.duplicateFamilies.sort((a, b) => b.count - a.count);
    this.post = () => this.sortByCount();
  }
  async showFamilies(d: duplicateFamilies) {
    await this.context.openDialog(GridDialogComponent, x => x.args = {
      title: this.settings.lang.familiesAt + d.address,
      buttons: [{
        text: this.settings.lang.mergeFamilies,
        click: async () => { await this.mergeFamilies(x); }
      }],
      settings: this.context.for(Families).gridSettings({
        columnSettings: f => {
          let r = [
            f.name,
            f.address,
            f.status,
            f.phone1,
            f.previousDeliveryDate,
            f.previousDeliveryStatus,
            f.phone2,
            f.phone3,
            f.phone4,
            f.addressByGoogle,
            f.addressOk



          ] as Column<any>[];
          for (const c of f.columns) {
            if (!r.includes(c) && c != f.id)
              r.push(c);
          }
          return r;
        },
        numOfColumnsInGrid: 6,
        hideDataArea: true,
        gridButton: [
          ...buildGridButtonFromActions([UpdateStatus, updateGroup, FreezeDeliveriesForFamilies, UnfreezeDeliveriesForFamilies], this.context,
            {
              afterAction: async () => await x.args.settings.getRecords(),
              dialog: this.dialog,
              callServer: async (info, action, args) => await FamiliesComponent.FamilyActionOnServer(info, action, args),
              buildActionInfo: async actionWhere => {
                let where: EntityWhere<Families> = f => {
                  let r = new AndFilter(actionWhere(f), x.args.settings.getFilterWithSelectedRows().where(f));
                  return r;
                };
                return {
                  count: await this.context.for(Families).count(where),
                   where
                };
              }, settings: this.settings,
              groupName: this.settings.lang.families
            })
          , {
            name: this.settings.lang.mergeFamilies,
            click: async () => {
              await this.mergeFamilies(x);

            },
            visible: () => this.context.isAllowed(Roles.admin) && (x.args.settings.selectedRows.length > 1 || x.args.settings.totalRows < 10)
          }, {
            name: this.settings.lang.exportToExcel,
            click: async () => {
              await saveFamiliesToExcel(this.context, x.args.settings, this.busy, this.settings.lang.families)
            }
          }],
        allowSelection: true,
        knowTotalRows: true,
        rowButtons: [
          {
            name: this.settings.lang.familyDetails,
            click: f => f.showFamilyDialog()
          },
          {
            name: this.settings.lang.deliveries,
            click: f => f.showDeliveryHistoryDialog({ settings: this.settings, dialog: this.dialog })
          }
        ],
        get: {
          limit: 25,
          where: f => f.status.isDifferentFrom(FamilyStatus.ToDelete).and(f.addressLatitude.isEqualTo(d.lat).and(f.addressLongitude.isEqualTo(d.lng))),
          orderBy: f => f.name
        }

      })

    });
    this.ngOnInit();
  }

  private async mergeFamilies(x: GridDialogComponent) {
    let items = x.args.settings.selectedRows.length > 0 ? [...x.args.settings.selectedRows] : [...x.args.settings.items];
    if (items.length == 0) {
      await this.dialog.Error(this.settings.lang.noFamiliesSelected);
      return;
    }
    if (items.length == 1) {
      await this.dialog.Error(this.settings.lang.cantMergeOneFamily);
      return;
    }
    if (items.length > 10) {
      await this.dialog.Error(this.settings.lang.tooManyFamiliesForMerge);
      return;
    }
    await this.context.openDialog(MergeFamiliesComponent, y => y.families = items, y => {
      if (y.merged)
        x.args.settings.getRecords();
    });
  }

  @ServerFunction({ allowed: true })
  static async familiesInSameAddress(context?: Context, db?: SqlDatabase) {
    let sql = new SqlBuilder();
    let f = context.for(Families).create();
    return (await db.execute(sql.query({
      select: () => [
        sql.max(f.createDate),
        sql.columnWithAlias(f.addressLatitude, 'lat'),
        sql.columnWithAlias(f.addressLongitude, 'lng'),
        sql.columnWithAlias(sql.max(f.address), 'address'),
        sql.columnWithAlias(sql.count(), 'c')],
      from: f,
      where: () => [f.status.isDifferentFrom(FamilyStatus.ToDelete)],
      groupBy: () => [f.addressLatitude, f.addressLongitude],
      having: () => [sql.gt(sql.count(), 1)]

    }))).rows.map(x => ({
      address: x['address'],
      lat: +x['lat'],
      lng: +x['lng'],
      count: +x['c']
    } as duplicateFamilies));
  }

}
export interface duplicateFamilies {
  address: string,
  lat: number,
  lng: number,
  count: number
}
