import { Component, OnInit } from '@angular/core';
import { BusyService, openDialog } from '@remult/angular';
import { remult } from 'remult';
import { Helpers } from '../helpers/helpers';
import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { Location, GetDistanceBetween } from '../shared/googleApiHelpers';
import { HelperAssignmentComponent } from '../helper-assignment/helper-assignment.component';
import { SelectHelperComponent } from '../select-helper/select-helper.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { InputField } from '@remult/angular/interfaces';
import { data, familyInfo, helperInfo, relevantHelper, ShipmentAssignScreenController } from './shipment-assign-screen.controller';

@Component({
  selector: 'app-shipment-assign-screen',
  templateUrl: './shipment-assign-screen.component.html',
  styleUrls: ['./shipment-assign-screen.component.scss']
})
export class ShipmentAssignScreenComponent implements OnInit {
  filterBasket = new InputField<string>({ caption: 'סינון' });
  sortDir = 1;
  sortByVolunteers() {
    this.sortDir = -this.sortDir;
    this.sortList();
  }
  matchesFilter(f: familyInfo) {
    if (!this.filterBasket.value || this.filterBasket.value.length == 0)
      return true;
    return f.deliveries.find(b => b.basketTypeName.includes(this.filterBasket.value));

  }

  private sortList() {
    this.families.sort((a, b) => {
      let res = 0;
      let itemsDiff = b.totalItems - a.totalItems;
      let alen = a.relevantHelpers.length;
      let blen = b.relevantHelpers.length;

      if (alen == 0 && blen == 0)
        return itemsDiff;

      if (alen == 0) return 1;
      if (blen == 0) return -1;

      res = (alen - blen) * this.sortDir;
      if (res == 0)
        res = itemsDiff;

      return res;
    });
  }

  async showAssignment(rh: relevantHelper) {
    let h = await remult.repo(Helpers).findId(rh.helper.id);
    openDialog(HelperAssignmentComponent, x => x.argsHelper = h);
  }
  async assignHelper(h: helperInfo, f: familyInfo) {
    await this.busy.doWhileShowingBusy(async () => {
      for (const fd of await remult.repo(ActiveFamilyDeliveries).find({
        where: { $and: [FamilyDeliveries.readyFilter()], id: f.deliveries.map(x => x.id) }
      })) {
        fd.courier = await remult.repo(Helpers).findId(h.id);
        await fd.save();
      }
    });
    f.assignedHelper = h;
    h.families.push(f);
    this.openFamilies.set(f, false);

  }
  async cancelAssignHelper(f: familyInfo) {
    let helper = await remult.repo(Helpers).findId(f.assignedHelper.id);
    await this.busy.doWhileShowingBusy(async () => {
      for (const fd of await remult.repo(ActiveFamilyDeliveries).find({
        where: { courier: helper, id: f.deliveries.map(x => x.id) }
      })) {
        fd.courier = null;
        await fd.save();
      }
    });
    f.assignedHelper.families.splice(f.assignedHelper.families.indexOf(f), 1);
    f.assignedHelper = undefined;

  }
  async searchHelper(f: familyInfo) {
    await openDialog(SelectHelperComponent, x => x.args = {
      location: f.location,
      familyId: f.id,
      searchByDistance: true,
      onSelect: async selectedHelper => {
        let h = this.data.helpers[selectedHelper.id];
        if (!h) {
          h = ShipmentAssignScreenController.helperInfoFromHelper(await remult.repo(Helpers).findId(selectedHelper.id));;
          this.data[h.id] = h;
        }
        this.assignHelper(h, f);
      }
    });

  }

  openFamilies = new Map<familyInfo, boolean>();
  shouldShowHelper(forFamily: familyInfo) {
    return !!this.openFamilies.get(forFamily);

  }
  togglerShowHelper(forFamily: familyInfo) {
    this.openFamilies.set(forFamily, !this.openFamilies.get(forFamily));
  }
  constructor(private busy: BusyService, private settings: ApplicationSettings) { }
  data: data;
  families: familyInfo[] = [];
  async ngOnInit() {
    await this.getFamiliesAndSortThem();




  }
  private async getFamiliesAndSortThem() {
    this.families = [];
    this.data = await ShipmentAssignScreenController.getShipmentAssignInfo();

    for (const famKey in this.data.unAssignedFamilies) {
      if (Object.prototype.hasOwnProperty.call(this.data.unAssignedFamilies, famKey)) {
        const family = this.data.unAssignedFamilies[famKey];
        this.families.push(family);
        for (const key in this.data.helpers) {
          if (Object.prototype.hasOwnProperty.call(this.data.helpers, key)) {
            const helper = this.data.helpers[key];
            if (helper.families.length < 4 && !helper.problemFamilies[family.id]) {
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
              if (!this.settings.isSytemForMlt)
                for (const exF of helper.families) {
                  checkDistance(exF.location, 'משלוח: ' + exF.address);
                }
              if (d < 5) {
                family.relevantHelpers.push({
                  helper: helper,
                  distance: d,
                  referencePoint: referencePoint
                });
                family.relevantHelpers.sort((a, b) => {
                  let res = a.helper.families.length - b.helper.families.length;
                  if (res == 0) res = a.distance - b.distance
                  return res;
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
