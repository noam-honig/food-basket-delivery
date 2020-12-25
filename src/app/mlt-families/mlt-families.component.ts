import { Component, Input, OnInit } from '@angular/core';
import { BusyService, Context } from '@remult/core';
import { Roles } from '../auth/roles';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { DeliveryInList, HelperFamiliesComponent } from '../helper-families/helper-families.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DistributionCenters } from '../manage/distribution-centers';
import { MyFamiliesComponent } from '../my-families/my-families.component';
import { SelectListComponent } from '../select-list/select-list.component';
import { DialogService } from '../select-popup/dialog';
import { getCurrentLocation, GetDistanceBetween, Location } from '../shared/googleApiHelpers';
import { use } from '../translate';


@Component({
  selector: 'app-mlt-families',
  templateUrl: './mlt-families.component.html',
  styleUrls: ['./mlt-families.component.scss']
})
export class MltFamiliesComponent implements OnInit {
  deliveryList = 'deliveryList';
  deliveryInfo = 'deliveryInfo';
  display = this.deliveryList;
  canSelectDonors() {
    return this.context.isAllowed(Roles.indie);
  }

  constructor(public settings: ApplicationSettings, private dialog: DialogService, private context: Context,private busy:BusyService) { }
  @Input() comp: MyFamiliesComponent;
  get familyLists() {
    return this.comp.familyLists;
  }
  ngOnInit() {
  }
  getFamilies() {
    let consumed: string[] = []
    let result: ActiveFamilyDeliveries[] = [];
    for (const f of this.comp.familyLists.toDeliver) {
      if (!consumed.includes(f.family.value)) {
        consumed.push(f.family.value)
        result.push(f);
      }
    }
    return result;

  }
  async assignNewDelivery() {
    var volunteerLocation = await getCurrentLocation(true, this.dialog);
    
    let afdList = await (HelperFamiliesComponent.getDeliveriesByLocation(volunteerLocation));

    await this.context.openDialog(SelectListComponent, x => {
      x.args = {
        title: use.language.closestDeliveries + ' (' + use.language.mergeFamilies + ')',
        multiSelect: true,
        onSelect: async (selectedItems) => {
          if (selectedItems.length > 0)
            this.busy.doWhileShowingBusy(async () => {
              let ids: string[] = [];
              for (const selectedItem of selectedItems) {
                let d: DeliveryInList = selectedItem.item;
                ids.push(...d.ids);
              }
              await HelperFamiliesComponent.assignFamilyDeliveryToIndie(ids);
              await this.familyLists.refreshRoute({
                strategyId: this.settings.routeStrategy.value.id,
                volunteerLocation: volunteerLocation
              });
              await this.familyLists.reload();
            });
        },
        options: afdList
      }
    });


  }
  selectedFamily: ActiveFamilyDeliveries;
  selectFamily(f: ActiveFamilyDeliveries) {
    this.selectedFamily = f;
    this.display = this.deliveryInfo;
  }
  async selectDistCenter() {
    let distCenters = await this.context.for(DistributionCenters).find({ where: x => x.isActive() });
    distCenters = distCenters.filter(x => x.address.ok());
    let volunteerLocation: Location = undefined;
    try {
      volunteerLocation = await getCurrentLocation(true, this.dialog);
    }
    catch {
      if (this.familyLists.allFamilies.length > 0)
        volunteerLocation = this.familyLists.allFamilies[0].getDrivingLocation();
    }
    if (volunteerLocation) {
      distCenters.sort((a, b) => GetDistanceBetween(a.address.location(), volunteerLocation) - GetDistanceBetween(b.address.location(), volunteerLocation));


      await this.context.openDialog(SelectListComponent, x => x.args = {
        title: 'בחרו יעד למסירת הציוד',
        options: distCenters.map(y => ({
          name: GetDistanceBetween(y.address.location(), volunteerLocation).toFixed(1) + " ק\"מ" + ", " + y.name.value + " " + y.address.value,
          item: y
        })),
        onSelect: async (x) => {
          await HelperFamiliesComponent.changeDestination(x[0].item.id.value);
          this.familyLists.reload();
        }
      });
    }
  }

}
