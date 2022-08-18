import { Component, OnInit } from '@angular/core';
import {  FieldMetadata, getFields, remult } from 'remult';
import { DataAreaSettings, DataControl, GridSettings } from '@remult/angular/interfaces';
import { BusyService, openDialog } from '@remult/angular';
import { Families } from '../families/families';
import { FamilyStatus } from '../families/FamilyStatus';
import { DialogService } from '../select-popup/dialog';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';
import { UpdateStatus, updateGroup } from '../families/familyActions';
import { saveFamiliesToExcel } from '../families/families.component';
import { ApplicationSettings, getSettings } from '../manage/ApplicationSettings';
import { MergeFamiliesComponent } from '../merge-families/merge-families.component';
import { Roles } from '../auth/roles';
import { Field } from '../translate';
import { duplicateFamilies, DuplicateFamiliesController } from './duplicate-families.controller';

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
  get $() { return getFields(this, remult) }
  area = new DataAreaSettings({ fields: () => [[this.$.address, this.$.name, this.$.phone, this.$.tz, this.$.onlyActive]] });
  constructor(private dialog: DialogService, public settings: ApplicationSettings, private busy: BusyService) {

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
      this.duplicateFamilies = await DuplicateFamiliesController.familiesInSameAddress({
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
      settings: new GridSettings(remult.repo(Families), {
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
          ...[new UpdateStatus(), new updateGroup()].map(a => a.gridButton(
            {
              afterAction: async () => await x.args.settings.reloadData(),
              ui: this.dialog,
              userWhere: async () => (await x.args.settings.getFilterWithSelectedRows()).where,
              settings: this.settings
            }))
          , {
            name: this.settings.lang.mergeFamilies,
            click: async () => {
              await this.mergeFamilies(x);

            },
            visible: () => remult.isAllowed(Roles.admin) && (x.args.settings.selectedRows.length > 1 || x.args.settings.totalRows < 10)
          }, {
            name: this.settings.lang.exportToExcel,
            click: async () => {
              await saveFamiliesToExcel( x.args.settings, this.dialog, this.settings.lang.families)
            }
          }],
        allowSelection: true,
        knowTotalRows: true,
        rowButtons: [
          {
            name: this.settings.lang.familyDetails,
            click: family => this.dialog.updateFamilyDialog({ family })
          },
          {
            name: this.settings.lang.deliveries,
            click: f => f.showDeliveryHistoryDialog({ settings: this.settings, ui: this.dialog })
          }
        ],

        rowsInPage: 25,
        where: {
          status: { $ne: FamilyStatus.ToDelete }, id: d.ids.split(',')
        },
        orderBy: { name: "asc" }


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
}
