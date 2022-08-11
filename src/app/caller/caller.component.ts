import { Component, OnInit, ViewChild } from '@angular/core';
import { openDialog, RouteHelperService } from '@remult/angular';
import { DataAreaSettings, RowButton } from '@remult/angular/interfaces';
import { FieldRef, Remult } from 'remult';
import { Roles } from '../auth/roles';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { Families } from '../families/families';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { FamilyInfoComponent } from '../family-info/family-info.component';
import { Callers } from '../manage-callers/callers';
import { ManageCallersComponent } from '../manage-callers/manage-callers.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { SelectFamilyForCallerComponent } from '../select-family-for-caller/select-family-for-caller.component';
import { DialogService } from '../select-popup/dialog';
import { CallerController } from './caller.controller';

@Component({
  selector: 'app-caller',
  templateUrl: './caller.component.html',
  styleUrls: ['./caller.component.scss']
})
export class CallerComponent implements OnInit {
  menu: RowButton<any>[] = [{
    name: "ניהול טלפנים",
    click: () => {
      this.routeHelper.navigateToComponent(ManageCallersComponent)
    },
  },
  {
    textInMenu: 'הגדרות',
    name: 'הגדרות',
    icon: 'settings',
    click: () => {
      this.dialog.inputAreaDialog({
        fields: [this.settings.$.callModuleMessageText, this.settings.$.callModuleMessageLink],
        ok: () => { this.settings.save(); },
        cancel: () => this.settings._.undoChanges()
      })
    }
  }];
  isAdmin() {
    return this.remult.isAllowed(Roles.admin);
  }
  constructor(private remult: Remult, public settings: ApplicationSettings, private dialog: DialogService, private routeHelper: RouteHelperService) { }
  d: ActiveFamilyDeliveries;
  address: DataAreaSettings;
  controller = new CallerController(this.remult);
  @ViewChild("famInfo") famInfo: FamilyInfoComponent;
  ngOnInit(): void {
    this.loadCall();
    this.dialog.donotWait(async () => this.caller = await this.remult.repo(Callers).findId(this.remult.user.id));
  }
  caller: Callers;
  async nextCall() {
    if (!await this.controller.nextCall()) {
      this.dialog.Error("לא נמצאו שיחות נוספות לביצוע");
      this.d = undefined;
    }
    else
      this.dialog.Info("עובר למשפחה הבאה...");

    await this.loadCall();
  }
  async done() {
    await this.controller.releaseCurrentFamily();
    this.d = undefined;
  }
  search() {
    openDialog(SelectFamilyForCallerComponent, x => x.args = {
      onSelect: async f => {
        await this.controller.selectFamily(f);
        await this.loadCall();
      }
    });
  }
  async interested() {
    if (await this.dialog.YesNoPromise("האם לעדכן כמעוניינים ולעבור למשפחה הבאה?")) {
      this.d.deliverStatus = DeliveryStatus.ReadyForDelivery;
      this.d.lastCallDate = new Date();
      this.dialog.doWhileShowingBusy(async () => {
        await this.d.save();
        await this.nextCall();
      })
    }
  }
  async notInterested() {
    this.dialog.inputAreaDialog({
      title: "לא מעוניינים בחבילה",
      fields: [this.d.$.callerComment],
      ok: async () => {
        this.d.deliverStatus = DeliveryStatus.FailedDoNotWant;
        this.dialog.doWhileShowingBusy(async () => {
          await this.d.save();
          await this.nextCall();
        });
      },
      cancel: () => { }
    })
  }
  async toAdmin() {
    this.dialog.inputAreaDialog({
      title: "העבר לטיפול מנהל",
      fields: [this.d.$.callerComment],
      ok: async () => {
        this.d.deliverStatus = DeliveryStatus.waitingForAdmin;
        this.dialog.doWhileShowingBusy(async () => {
          await this.d.save();
          await this.nextCall();
        });
      },
      cancel: () => { }
    })
  }
  async loadCall() {
    this.d = await this.remult.repo(ActiveFamilyDeliveries).findFirst(ActiveFamilyDeliveries.inProgressCallerDeliveries());
    if (this.caller)
      this.dialog.donotWait(async () =>
        this.caller = await this.caller._.reload());
  }

  async updateFamilyInfo() {
    const fam = await this.remult.repo(Families).findId(this.d.family);
    const f = fam.$;
    function visible(ref: FieldRef, arr: FieldRef[]) {
      return arr.map(f => ({ field: f, visible: () => ref.value || arr.find(f => f.value) }));

    }

    this.dialog.inputAreaDialog({
      title: "עדכון פרטי משפחה",
      fields: [
        f.name,
        [f.phone1, f.phone1Description],
        visible(f.phone1, [f.phone2, f.phone2Description]),
        visible(f.phone2, [f.phone3, f.phone3Description]),
        visible(f.phone3, [f.phone4, f.phone4Description]),
        f.address,
        [
          f.appartment, f.floor], [f.entrance, f.buildingCode
        ],
        f.addressComment,
        this.d.$.deliveryComments,
        [{ field: this.d.$.basketType, width: '' }, this.d.$.quantity]
      ],
      ok: async () => {
        await fam.save();
        await this.d.save();
      },
      cancel: () => {
        fam._.undoChanges();
        this.d._.undoChanges();
      }
    });

  }

}


