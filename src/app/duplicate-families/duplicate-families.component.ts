import { Component, OnInit } from '@angular/core';
import { ServerFunction, Context, SqlDatabase, EntityWhere, AndFilter, packWhere, BusyService, Column, BoolColumn, DataAreaSettings } from '@remult/core';
import { PhoneColumn, SqlBuilder } from '../model-shared/types';
import { Families } from '../families/families';
import { FamilyStatus } from '../families/FamilyStatus';
import { DialogService } from '../select-popup/dialog';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';
import { buildGridButtonFromActions } from '../families/familyActionsWiring';
import { familyActions, UpdateStatus, updateGroup } from '../families/familyActions';
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

  address = new BoolColumn({ valueChange: () => this.ngOnInit(), caption: this.settings.lang.address });
  name = new BoolColumn({ valueChange: () => this.ngOnInit(), caption: this.settings.lang.familyName });
  phone = new BoolColumn({ valueChange: () => this.ngOnInit(), caption: this.settings.lang.phone });
  tz = new BoolColumn({ valueChange: () => this.ngOnInit(), caption: this.settings.lang.socialSecurityNumber });
  area = new DataAreaSettings({ columnSettings: () => [[this.address, this.name, this.phone, this.tz]] });
  constructor(private context: Context, private dialog: DialogService, public settings: ApplicationSettings, private busy: BusyService) {

  }
  duplicateFamilies: duplicateFamilies[] = [];
  viewdFamilies = new Map<string, boolean>();
  async ngOnInit() {
    this.duplicateFamilies = [];
    if (!this.address.value && !this.name.value && !this.phone.value && !this.tz.value) {
      //      this.dialog.Error("אנא בחרו לפי מה לחפש משפחות כפולות");
      return;
    }
    try {
      this.duplicateFamilies = await DuplicateFamiliesComponent.familiesInSameAddress({
        address: this.address.value,
        name: this.name.value,
        phone: this.phone.value,
        tz: this.tz.value
      });
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
      stateName:'duplicate-families',
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



          ] as Column[];
          for (const c of f.columns) {
            if (!r.includes(c) && c != f.id)
              r.push(c);
          }
          return r;
        },
        numOfColumnsInGrid: 6,

        gridButtons: [
          ...buildGridButtonFromActions([UpdateStatus, updateGroup], this.context,
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
            click: f => f.showDeliveryHistoryDialog({ settings: this.settings, dialog: this.dialog, busy: this.busy })
          }
        ],
        get: {
          limit: 25,
          where: f => f.status.isDifferentFrom(FamilyStatus.ToDelete).and(f.id.isIn(d.ids.split(','))),
          orderBy: f => f.name
        }

      })

    });
    this.viewdFamilies.set(d.ids, true);
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
  static async familiesInSameAddress(compare: { address: boolean, name: boolean, phone: boolean, tz: boolean }, context?: Context, db?: SqlDatabase) {
    if (!compare.address && !compare.name && !compare.phone && !compare.tz)
      throw "some column needs to be selected for compare";
    let sql = new SqlBuilder();
    let f = context.for(Families).create();
    let q = '';
    for (const tz of [f.tz, f.tz2]) {
      for (const phone of [f.phone1, f.phone2, f.phone3, f.phone4]) {
        if (q.length > 0) {
          q += '\r\n union all \r\n';

        }
        q += sql.query({
          select: () => [
            sql.columnWithAlias(f.addressLatitude, 'lat'),
            sql.columnWithAlias(f.addressLongitude, 'lng'),
            sql.columnWithAlias(f.address, 'address'),
            f.name,
            sql.columnWithAlias(f.id, 'id'),
            sql.columnWithAlias(sql.extractNumber(tz), 'tz'),
            sql.columnWithAlias(sql.extractNumber(phone), 'phone')
          ],
          from: f,
          where: () => [f.status.isDifferentFrom(FamilyStatus.ToDelete)],
        });
      }

    }

    let where = [];
    let groupBy = [];
    if (compare.address) {
      groupBy.push('lat');
      groupBy.push('lng');
    }
    if (compare.phone) {
      groupBy.push('phone');
      where.push('phone<>0');
    }
    if (compare.tz) {
      groupBy.push('tz');
      where.push('tz<>0');
    }
    if (compare.name) {
      groupBy.push('name');
    }
    q = sql.build('select ', [
      sql.columnWithAlias(sql.max('address'), 'address'),
      sql.columnWithAlias(sql.max('name'), '"name"'),
      sql.columnWithAlias(sql.max('tz'), 'tz'),
      sql.columnWithAlias(sql.max('phone'), 'phone'), 'count (distinct id) c', "string_agg(id::text, ',') ids"], ' from ('
      , q, ') as result');
    if (where.length > 0)
      q += ' where ' + sql.and(...where);
    q += ' group by ' + sql.build([groupBy]);
    q += ' having count(distinct id)>1';





    return (await db.execute(q)).rows.map(x => ({
      address: x['address'],
      name: x['name'],
      phone: PhoneColumn.formatPhone(x['phone']),
      tz: x['tz'],
      count: +x['c'],
      ids: x['ids'].split(',').filter((val, index, self) => self.indexOf(val) == index).join(',')
    } as duplicateFamilies));
  }

}
export interface duplicateFamilies {
  address: string,
  name: string,
  tz: number,
  phone: string,
  count: number,
  ids: string
}
