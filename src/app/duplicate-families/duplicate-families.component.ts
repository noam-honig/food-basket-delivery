import { Component, OnInit } from '@angular/core';
import { BackendMethod, Context, SqlDatabase, FieldMetadata, EntityWhere, getFields } from 'remult';
import { BusyService, DataAreaSettings, DataControl, GridSettings, InputField, openDialog } from '@remult/angular';
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Phone } from "../model-shared/phone";
import { Families } from '../families/families';
import { FamilyStatus } from '../families/FamilyStatus';
import { DialogService } from '../select-popup/dialog';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';
import { UpdateStatus, updateGroup } from '../families/familyActions';
import { FamiliesComponent, saveFamiliesToExcel } from '../families/families.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { MergeFamiliesComponent } from '../merge-families/merge-families.component';
import { Roles } from '../auth/roles';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { Field } from '../translate';

@Component({
  selector: 'app-duplicate-families',
  templateUrl: './duplicate-families.component.html',
  styleUrls: ['./duplicate-families.component.scss']
})
export class DuplicateFamiliesComponent implements OnInit {

  @Field({ translation: l => l.address })
  @DataControl<DuplicateFamiliesComponent>({ valueChange: (self) => self.ngOnInit() })
  address: boolean;
  @Field({ translation: l => l.familyName })
  @DataControl<DuplicateFamiliesComponent>({ valueChange: (self) => self.ngOnInit() })
  name: boolean = false;
  @Field({ translation: l => l.phone })
  @DataControl<DuplicateFamiliesComponent>({ valueChange: (self) => self.ngOnInit() })
  phone: boolean = false;
  @Field({ translation: l => l.activeDeliveries })
  @DataControl<DuplicateFamiliesComponent>({ valueChange: (self) => self.ngOnInit() })
  onlyActive: boolean = true;
  @Field({ translation: l => l.socialSecurityNumber })
  @DataControl<DuplicateFamiliesComponent>({ valueChange: (self) => self.ngOnInit() })
  tz: boolean = false;
  get $() { return getFields(this, this.context) }
  area = new DataAreaSettings({ fields: () => [[this.$.address, this.$.name, this.$.phone, this.$.tz, this.$.onlyActive]] });
  constructor(private context: Context, private dialog: DialogService, public settings: ApplicationSettings, private busy: BusyService) {

  }
  duplicateFamilies: duplicateFamilies[] = [];
  viewdFamilies = new Map<string, boolean>();
  async ngOnInit() {
    this.duplicateFamilies = [];
    if (!this.address && !this.name && !this.phone && !this.tz) {
      //      this.dialog.Error("אנא בחרו לפי מה לחפש משפחות כפולות");
      return;
    }
    try {
      this.duplicateFamilies = await DuplicateFamiliesComponent.familiesInSameAddress({
        address: this.address,
        name: this.name,
        phone: this.phone,
        tz: this.tz,
        onlyActive: this.onlyActive
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
    await openDialog(GridDialogComponent, x => x.args = {
      title: this.settings.lang.familiesAt + d.address,
      stateName: 'duplicate-families',
      buttons: [{
        text: this.settings.lang.mergeFamilies,
        click: async () => { await this.mergeFamilies(x); }
      }],
      settings: new GridSettings(this.context.for(Families), {
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



          ] as FieldMetadata[];
          for (const c of f) {
            if (!r.includes(c) && c != f.id)
              r.push(c);
          }
          return r;
        },
        numOfColumnsInGrid: 6,

        gridButtons: [
          ...[new UpdateStatus(this.context), new updateGroup(this.context)].map(a => a.gridButton(
            {
              afterAction: async () => await x.args.settings.reloadData(),
              dialog: this.dialog,
              userWhere: () => x.args.settings.getFilterWithSelectedRows().where,
              settings: this.settings
            }))
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

        rowsInPage: 25,
        where: f => f.status.isDifferentFrom(FamilyStatus.ToDelete).and(f.id.isIn(d.ids.split(','))),
        orderBy: f => f.name


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
    await openDialog(MergeFamiliesComponent, y => y.families = items, y => {
      if (y.merged)
        x.args.settings.reloadData();
    });
  }

  @BackendMethod({ allowed: true })
  static async familiesInSameAddress(compare: { address: boolean, name: boolean, phone: boolean, tz: boolean, onlyActive: boolean }, context?: Context, db?: SqlDatabase) {
    if (!compare.address && !compare.name && !compare.phone && !compare.tz)
      throw "some column needs to be selected for compare";
    let sql = new SqlBuilder(context);
    let f = SqlFor(context.for(Families));
    let fd = SqlFor(context.for(ActiveFamilyDeliveries));
    let q = '';
    for (const tz of [f.tz, f.tz2]) {
      for (const phone of [f.phone1, f.phone2, f.phone3, f.phone4]) {
        if (q.length > 0) {
          q += '\r\n union all \r\n';

        }
        q += await sql.query({
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
          where: () => {
            let r: any[] = [f.status.isDifferentFrom(FamilyStatus.ToDelete)];
            if (compare.onlyActive) {
              r.push(sql.build(f.id, ' in (', sql.query({ select: () => [fd.family], from: fd }), ')'));
            }
            return r;
          },
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
    q =await  sql.build('select ', [
      sql.columnWithAlias(sql.max('address'), 'address'),
      sql.columnWithAlias(sql.max('name'), '"name"'),
      sql.columnWithAlias(sql.max('tz'), 'tz'),
      sql.columnWithAlias(sql.max('phone'), 'phone'), 'count (distinct id) c', "string_agg(id::text, ',') ids"], ' from ('
      , q, ') as result');
    if (where.length > 0)
      q += ' where ' + await sql.and(...where);
    q += ' group by ' +await sql.build([groupBy]);
    q += ' having count(distinct id)>1';





    return (await db.execute(q)).rows.map(x => ({
      address: x['address'],
      name: x['name'],
      phone: Phone.formatPhone(x['phone']),
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
