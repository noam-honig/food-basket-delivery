import { Component, Input, OnInit } from '@angular/core';
import { BusyService, Column, Context } from '@remult/core';
import { Roles } from '../auth/roles';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';
import { DeliveryInList, HelperFamiliesComponent } from '../helper-families/helper-families.component';
import { HelperGifts, showUsersGifts } from '../helper-gifts/HelperGifts';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DistributionCenters } from '../manage/distribution-centers';
import { MyFamiliesComponent } from '../my-families/my-families.component';
import { SelectListComponent } from '../select-list/select-list.component';
import { DialogService } from '../select-popup/dialog';
import { getCurrentLocation, GetDistanceBetween, Location } from '../shared/googleApiHelpers';
import { getLang } from '../sites/sites';
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

  numberOfDeliveries = 0;
  giftCount = 0;

  canSelectDonors() {
    return this.context.isAllowed(Roles.indie);
  }

  constructor(public settings: ApplicationSettings, private dialog: DialogService, private context: Context,private busy:BusyService) { }
  @Input() comp: MyFamiliesComponent;
  get familyLists() {
    return this.comp.familyLists;
  }
  async ngOnInit() {
    this.numberOfDeliveries = await this.showDeliveryHistory(this.dialog, this.busy, false)
    this.giftCount = await HelperGifts.getMyPendingGiftsCount(this.context.user.id);
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


  /* TODO: replace with two fucntions - one to get total delivery count and another to open a dialog with list of recent (-3 days) deliveries */
  async showDeliveryHistory(dialog: DialogService, busy: BusyService, open = true) {
    let ctx = this.context.for(FamilyDeliveries);
    let settings = {
      numOfColumnsInGrid: 7,
      knowTotalRows: true,
      allowSelection: true,
      rowButtons: [{

        name: '',
        icon: 'edit',
        showInLine: true,
        click: async fd => {
          fd.showDetailsDialog({

            dialog: dialog
          });
        }
        , textInMenu: () => getLang(this.context).deliveryDetails
      }
      ],

      rowCssClass: fd => fd.deliverStatus.getCss(),
      columnSettings: fd => {
        let r: Column[] = [
          fd.deliverStatus,
          fd.deliveryStatusDate,
          fd.basketType,
          fd.quantity,
          fd.name,
          fd.address,
          fd.courierComments,
          fd.distributionCenter
        ]
        r.push(...fd.columns.toArray().filter(c => !r.includes(c) && c != fd.id && c != fd.familySource).sort((a, b) => a.defs.caption.localeCompare(b.defs.caption)));
        return r;
      },
      get: {
        where: fd => (fd.courier.isEqualTo(this.context.user.id).and(fd.deliverStatus.isEqualTo(DeliveryStatus.Success))),
        orderBy: fd => [{ column: fd.deliveryStatusDate, descending: true }],
        limit: (open ? 5 : 9999)
      }
    }
    if (!open) {
      return (await ctx.gridSettings(settings).getRecords()).items.length
    }
    if (open)
      this.context.openDialog(GridDialogComponent, x => x.args = {
        title: getLang(this.context).deliveriesFor + ' ' + this.context.user.name,
        settings: ctx.gridSettings(settings)
      });

  }

  async showMyGifts() {
      showUsersGifts(this.context.user.id, this.context, this.settings, this.dialog, this.busy);
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
