import { Component, OnInit } from '@angular/core';
import { BusyService, openDialog } from '@remult/angular';
import { Remult } from 'remult';
import { Helpers } from '../helpers/helpers';
import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { Location, GetDistanceBetween } from '../shared/googleApiHelpers';
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { helperInfo, familyInfo, ShipmentAssignScreenComponent, data } from '../shipment-assign-screen/shipment-assign-screen.component';
import { DialogService } from '../select-popup/dialog';
import { DeliveryFollowUpComponent } from '../delivery-follow-up/delivery-follow-up.component';
@Component({
  selector: 'app-volunteer-cross-assign',
  templateUrl: './volunteer-cross-assign.component.html',
  styleUrls: ['./volunteer-cross-assign.component.scss']
})
export class VolunteerCrossAssignComponent implements OnInit {


  sortDir = 1;
  sortByVolunteers() {
    this.sortDir = -this.sortDir;
    this.sortList();
  }


  private sortList() {
    this.helpers.sort((a, b) => {
      let res = 0;

      let compareFamilies = a.families.length - b.families.length;
      if (compareFamilies != 0)
        return compareFamilies;
      return b.relevantFamilies.length - a.relevantFamilies.length;
    });
  }

  async showAssignment(rh: helperInfo) {
    let h = await this. remult.repo(Helpers).findId(rh.id);
    openDialog(HelperAssignmentComponent, x => x.argsHelper = h);
  }
  async helperDetails(rh: helperInfo) {
    let h = await this. remult.repo(Helpers).findId(rh.id);
    h.displayEditDialog(this.dialog, this.busy);

  }

  async assignHelper(h: helperInfo, f: familyInfo) {
    await this.busy.doWhileShowingBusy(async () => {
      for (const fd of await this. remult.repo(ActiveFamilyDeliveries).find({
        where: fd => FamilyDeliveries.readyFilter().and(fd.id.isIn(f.deliveries.map(x => x.id)))
      })) {
        fd.courier = await this. remult.repo(Helpers).findId(h.id);
        await fd.save();
      }
    });
    f.assignedHelper = h;
    h.families.push(f);



  }
  async cancelAssignHelper(f: familyInfo) {
    let helper = await this. remult.repo(Helpers).findId(f.assignedHelper.id);
    await this.busy.doWhileShowingBusy(async () => {
      for (const fd of await this. remult.repo(ActiveFamilyDeliveries).find({
        where: fd => fd.courier.isEqualTo(helper).and(fd.id.isIn(f.deliveries.map(x => x.id)))
      })) {
        fd.courier = null;
        await fd.save();
      }
    });
    f.assignedHelper.families.splice(f.assignedHelper.families.indexOf(f), 1);
    f.assignedHelper = undefined;

  }


  openHelpers = new Map<helperInfo, boolean>();
  shouldShowHelper(forFamily: helperInfo) {
    return !!this.openHelpers.get(forFamily);

  }
  togglerShowHelper(forHelper: helperInfo) {
    this.openHelpers.set(forHelper, !this.openHelpers.get(forHelper));
  }
  async sendSmsToAll() {
    var x = new DeliveryFollowUpComponent(this.busy, this.remult, this.dialog, this.settings);
    await x.refreshStats();
    x.sendSmsToAll();

  }
  constructor(private remult: Remult, private busy: BusyService, private settings: ApplicationSettings, private dialog: DialogService) { }
  data: data;
  helpers: helperInfo[] = [];
  async ngOnInit() {
    await this.getFamiliesAndSortThem();
  }
  private async getFamiliesAndSortThem() {
    this.helpers = [];
    this.data = await ShipmentAssignScreenComponent.getShipmentAssignInfo();

    for (const key in this.data.helpers) {
      if (Object.prototype.hasOwnProperty.call(this.data.helpers, key)) {
        const helper = this.data.helpers[key];
        this.helpers.push(helper);
        for (const famKey in this.data.unAssignedFamilies) {
          if (Object.prototype.hasOwnProperty.call(this.data.unAssignedFamilies, famKey)) {
            const family = this.data.unAssignedFamilies[famKey];

            if (!helper.problemFamilies[family.id]) {
              let d = 99999999;
              let referencePoint = '';
              let checkDistance = (loc: Location, refPoint: string) => {
                if (loc) {
                  let dist = GetDistanceBetween(family.location, loc);
                  if (dist < d) {
                    d = dist;
                    referencePoint = refPoint;
                  }
                }
              };
              checkDistance(helper.location1, 'העדפת מתנדב: ' + helper.address1);
              checkDistance(helper.location2, 'העדפת מתנדב: ' + helper.address2);
              if (!this.settings.isSytemForMlt())
                for (const exF of helper.families) {
                  checkDistance(exF.location, 'משלוח: ' + exF.address);
                }
              if (d < 5) {
                helper.relevantFamilies.push({
                  family: family,
                  distance: d,
                  referencePoint: referencePoint
                });
                helper.relevantFamilies.sort((a, b) => {

                  return calcAffectiveDistance(a.distance, a.family.totalItems) - calcAffectiveDistance(b.distance, b.family.totalItems)

                });
              }
            }
          }
        }
      }
    }
    this.sortList();
  }

}
export function calcAffectiveDistance(distance: number, items: number) {

  if (items > 3)
    items = 3;
  if (items < 1)
    items = 1;
  return distance / items;

}