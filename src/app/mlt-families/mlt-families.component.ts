import { Component, Input, OnInit } from '@angular/core';
import { AndFilter, BusyService, Column, Context, FilterBase, ServerFunction } from '@remult/core';
import { Roles } from '../auth/roles';
import { EditCommentDialogComponent } from '../edit-comment-dialog/edit-comment-dialog.component';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { FamilyId } from '../families/families';
import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';
import { DeliveryInList, HelperFamiliesComponent } from '../helper-families/helper-families.component';
import { HelperGifts, showUsersGifts } from '../helper-gifts/HelperGifts';
import { Helpers } from '../helpers/helpers';
import { ApplicationSettings, getSettings } from '../manage/ApplicationSettings';
import { DistributionCenters } from '../manage/distribution-centers';
import { MyFamiliesComponent } from '../my-families/my-families.component';
import { SelectListComponent } from '../select-list/select-list.component';
import { DialogService } from '../select-popup/dialog';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { getCurrentLocation, GetDistanceBetween, Location } from '../shared/googleApiHelpers';
import { getLang } from '../sites/sites';
import { use } from '../translate';
import { GetVolunteerFeedback } from '../update-comment/update-comment.component';


@Component({
  selector: 'app-mlt-families',
  templateUrl: './mlt-families.component.html',
  styleUrls: ['./mlt-families.component.scss']
})
export class MltFamiliesComponent implements OnInit {
  deliveryList = 'deliveryList';
  deliveryInfo = 'deliveryInfo';
  problemInfo = 'problemInfo';
  myProfile = 'myProfile';
  reception = 'reception';
  display = this.deliveryList;

  numberOfDeliveries = 0;
  giftCount = 0;
  thisHelper;
  today = new Date();
  userFrozenTill = this.today;
  
  showFrozen() {
    if (this.thisHelper) {
      let frozenTill = this.thisHelper.frozenTill;
      this.userFrozenTill = frozenTill.displayValue;
      return (frozenTill.value > this.today);
    }
    return false;
  }

  canSelectDonors() {
    return this.context.isAllowed(Roles.indie);
  }

  constructor(public settings: ApplicationSettings, private dialog: DialogService, private context: Context, private busy: BusyService) { }
  @Input() comp: MyFamiliesComponent;
  get familyLists() {
    return this.comp.familyLists;
  }
  async ngOnInit() {
    this.numberOfDeliveries = await this.showDeliveryHistory(false)
    this.giftCount = await HelperGifts.getMyPendingGiftsCount(this.context.user.id);
    this.thisHelper = await this.context.for(Helpers).findFirst(h=>h.id.isEqualTo(this.context.user.id));
    this.userFrozenTill = this.thisHelper.frozenTill.displayValue;
  }

  getBasketsDescription(family: ActiveFamilyDeliveries, delivered = false) {
    let result: string = '';
    for (const f of (delivered? this.comp.familyLists.delivered : this.comp.familyLists.toDeliver)) {
      //.filter(x=>x.family == family))

      if (f.family.value==family.family.value) {
        let s = f.quantity.displayValue + ' X ' + f.basketType.displayValue;
        if (result == '') 
          result = s
        else
          result += '; ' + s;
      }
    }

    return result;
  }

  getFamilies(delivered = false) {
    let consumed: string[] = []
    let result: ActiveFamilyDeliveries[] = [];
    for (const f of (delivered? this.comp.familyLists.delivered : this.comp.familyLists.toDeliver)) {
      if (!consumed.includes(f.family.value)) {
        consumed.push(f.family.value)
        result.push(f);
      }
    }
    return result;
  }


  /* TODO: replace with two fucntions - one to get total delivery count and another to open a dialog with list of recent (-3 days) deliveries */
  async showDeliveryHistory(open = true) {
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

            dialog: this.dialog
          });
        }
        , textInMenu: () => getLang(this.context).deliveryDetails
      }
      ],

      rowCssClass: fd => fd.deliverStatus.getCss(),
      columnSettings: fd => {
        let r: Column[] = [
          fd.deliverStatus,
          fd.basketType,
          fd.quantity,
          fd.courierComments,
          fd.deliveryStatusDate,
          fd.address,
          fd.name,
          fd.distributionCenter
        ]
        r.push(...fd.columns.toArray().filter(c => !r.includes(c) && c != fd.id && c != fd.familySource).sort((a, b) => a.defs.caption.localeCompare(b.defs.caption)));
        return r;
      },
      get: {
        where: fd => (fd.courier.isEqualTo(this.context.user.id).and(fd.deliverStatus.isSuccess())),
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
              await MltFamiliesComponent.assignFamilyDeliveryToIndie(ids);
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

  @ServerFunction({ allowed: Roles.indie })
  static async assignFamilyDeliveryToIndie(deliveryIds: string[], context?: Context) {
    for (const id of deliveryIds) {

      let fd = await context.for(ActiveFamilyDeliveries).findId(id);
      if (fd.courier.value == "" && fd.deliverStatus.value == DeliveryStatus.ReadyForDelivery) {//in case the delivery was already assigned to someone else
        fd.courier.value = context.user.id;
        await fd.save();
      }
    }
  }

  selectedFamily: ActiveFamilyDeliveries;
  deliveriesForFamily: ActiveFamilyDeliveries[] = [];
  selectFamily(f: ActiveFamilyDeliveries) {
    this.selectedFamily = f;
    this.display = this.deliveryInfo;
    this.deliveriesForFamily = this.familyLists.toDeliver.filter(x => x.family.value == f.family.value);
  }

  startPage() {
    this.display = this.deliveryList;
    this.selectedFamily = null
    this.familyLists.initFamilies();
    this.showDeliveryHistory(false);
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
          await MltFamiliesComponent.changeDestination(x[0].item.id.value);
          this.familyLists.reload();
        }
      });
    }
  }
  @ServerFunction({ allowed: c => c.isSignedIn() })
  static async changeDestination(newDestinationId: string, context?: Context) {
    let s = getSettings(context);
    if (!s.isSytemForMlt())
      throw "not allowed";
    for (const fd of await context.for(ActiveFamilyDeliveries).find({ where: fd => fd.courier.isEqualTo(context.user.id) })) {
      fd.distributionCenter.value = newDestinationId;
      await fd.save();
    }
  }

  async couldntDeliverToFamily(f: ActiveFamilyDeliveries, status?) {
    let family = f.family.value;
    for (const fd of this.comp.familyLists.toDeliver.filter(x=>x.family.value==family)) {
      fd.deliverStatus.value = DeliveryStatus[status];
      fd.checkNeedsWork();
      try {
        await fd.save();
        this.dialog.analytics('Problem');
      }
      catch (err) {
        this.dialog.Error(err);
      }
    }
    this.dialog.Info("ההודעה שלך נקלטה! תודה רבה!")
    this.startPage();
  }

  async deliveredToFamily(newComment?) {
    let f = this.selectedFamily;
    this.context.openDialog(GetVolunteerFeedback, x => x.args = {
      family: f,
      comment: (newComment ? newComment : f.courierComments.value),
      helpText: s => s.commentForSuccessDelivery,
      ok: async (comment) => {
        await this.updateDeliveryStatus(comment, DeliveryStatus.Success);
      },
      cancel: () => { }
    });
  }

  private async updateDeliveryStatus(comment: string, s: DeliveryStatus) {
    for (const f of this.deliveriesForFamily) {
      f.deliverStatus.value = s;
      f.courierComments.value = comment;
      f.checkNeedsWork();
      await f.save();
    }
    this.startPage()
  }

  updateComment(f: ActiveFamilyDeliveries) {
    this.context.openDialog(EditCommentDialogComponent, x => x.args = {
      comment: f.courierComments.value,

      save: async comment => {
        if (f.isNew())
          return;
        f.courierComments.value = comment;
        f.checkNeedsWork();
        await f.save();
        this.dialog.analytics('Update Comment');
      }
      , title: use.language.updateComment

    });
  }

  async freezeUser() {
    if (!this.thisHelper) 
      return;
      
    let currentUser = this.thisHelper;

    if (await this.context.openDialog(YesNoQuestionComponent, x => x.args = {
      question: "קצת מנוחה לא תזיק, נעביר את המשלוחים למישהו אחר וניתן לך הפסקה של שבועיים?",
      yesButtonText: this.settings.lang.confirm
    }, y => y.yes)) {
      let date = new Date();
      date.setDate(date.getDate() + 14)
      currentUser.frozenTill.value = date;
      await currentUser.save()

      for (const f of this.comp.familyLists.toDeliver) {
        f.deliverStatus.value = DeliveryStatus.FailedOther;
        f.courierComments.value = 'המתנדב ביקש הקפאה זמנית';
        await f.save();
      }
      this.familyLists.reload();
    }
  }

  async unFreezeUser() {
    if (!this.thisHelper) 
      return;
      
      this.today = new Date();
      this.thisHelper.frozenTill.value = this.today;
      await this.thisHelper.save()
  }

  openMessage1Link(open:boolean) {
    if (!this.settings.message1Link || !this.settings.message1Link.value || this.settings.message1Link.value == '')
      return false;
    if (open)
      window.open(this.settings.message1Link.value, '_blank');
    return true;
  }

  showMessage1Text() {
    return this.settings.message1Text.displayValue;
  }
}
