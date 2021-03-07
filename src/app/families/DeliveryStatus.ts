import { ColumnOptions, ValueListColumn, NumberColumn, Filter, Column, DecorateDataColumnSettings, ValueListItem, Context } from '@remult/core';
import { HelperId } from '../helpers/helpers';
import { use } from '../translate';
import { getLang } from '../sites/sites';
import { getSettings } from '../manage/ApplicationSettings';


export class DeliveryStatus {
  static usingSelfPickupModule: boolean = true;
  static IsAResultStatus(value: DeliveryStatus) {
    switch (value) {
      case this.Success:
      case this.SuccessPickedUp:
      case this.SuccessLeftThere:
      case this.FailedBadAddress:
      case this.FailedNotHome:
      case this.FailedDoNotWant:
      case this.FailedNotReady: 
      case this.FailedTooFar: 
      
      case this.FailedOther:
        return true;
    }
    return false;
  }
  static ReadyForDelivery: DeliveryStatus = new DeliveryStatus(0, use.language.readyForDelivery);
  static SelfPickup: DeliveryStatus = new DeliveryStatus(2, !use ? '' : use.language.selfPickup);
  static Frozen: DeliveryStatus = new DeliveryStatus(9, !use ? '' : use.language.frozen);

  static Success: DeliveryStatus = new DeliveryStatus(11, !use ? '' : use.language.deliveredSuccessfully);
  static SuccessPickedUp: DeliveryStatus = new DeliveryStatus(13, !use ? '' : use.language.packageWasPickedUp);
  static SuccessLeftThere: DeliveryStatus = new DeliveryStatus(19, !use ? '' : use.language.leftByHouse);

  static FailedNotReady: DeliveryStatus = new DeliveryStatus(20, !use ? '' : "התרומה עוד לא מוכנה לאיסוף", true);  // need to change filters to use this instead of BadAddress
  static FailedBadAddress: DeliveryStatus = new DeliveryStatus(21, !use ? '' : use.language.notDeliveredBadAddress, true);
  static FailedTooFar: DeliveryStatus = new DeliveryStatus(22, !use ? '' : "רחוק לי", true); 
  static FailedNotHome: DeliveryStatus = new DeliveryStatus(23, !use ? '' : use.language.notDeliveredNotHome, true);
  static FailedDoNotWant: DeliveryStatus = new DeliveryStatus(24, !use ? '' : use.language.notDeliveredDontWant, true);
  static FailedOther: DeliveryStatus = new DeliveryStatus(25, !use ? '' : use.language.notDeliveredOther, true);

  constructor(public id: number, public caption: string, public isProblem = false) {
  }

}
export class DeliveryStatusColumn extends ValueListColumn<DeliveryStatus> {
  isNotAResultStatus(): Filter {
    return this.isLessOrEqualTo(DeliveryStatus.Frozen);
  }
  isActiveDelivery() {
    return this.isLessOrEqualTo(DeliveryStatus.FailedOther);
  }

  isAResultStatus() {
    return this.isGreaterOrEqualTo(DeliveryStatus.Success).and(this.isLessOrEqualTo(DeliveryStatus.FailedOther));
  }
  readyAndSelfPickup(courier: HelperId) {
    let where = this.isGreaterOrEqualTo(DeliveryStatus.ReadyForDelivery).and(this.isLessOrEqualTo(DeliveryStatus.SelfPickup)).and(
      courier.isEqualTo(''));
    return where;
  }

  constructor(context: Context, settingsOrCaption?: ColumnOptions<DeliveryStatus>, chooseFrom?: DeliveryStatus[]) {
    super(DeliveryStatus,Column.consolidateOptions( {
      dataControlSettings: () => {
        let op = this.getOptions();
        if (chooseFrom)
          op = chooseFrom.map(x => {
            return {
              id: x.id,
              caption: x.caption
            } as ValueListItem
          });
        if (!DeliveryStatus.usingSelfPickupModule) {
          op = op.filter(x => x.id != DeliveryStatus.SelfPickup.id && x.id != DeliveryStatus.SuccessPickedUp.id);
        }
        if (!getSettings(context).isSytemForMlt()) {
          op = op.filter(x => 
            x.id != DeliveryStatus.FailedNotReady.id && 
            x.id != DeliveryStatus.FailedTooFar.id
          );
        }
        return {
          valueList: op,
          width: '150'
        };

      }
    }, settingsOrCaption));
    if (!this.defs.caption)
      this.defs.caption = getLang(context).deliveryStatus;
  }

  isSuccess() {
    return this.isGreaterOrEqualTo(DeliveryStatus.Success).and(this.isLessOrEqualTo(DeliveryStatus.SuccessLeftThere));
  }
  isProblem() {
    return this.isGreaterOrEqualTo(DeliveryStatus.FailedNotReady).and(this.isLessOrEqualTo(DeliveryStatus.FailedOther));
  }
  isNotProblem() {
    return this.isLessOrEqualTo(DeliveryStatus.SuccessLeftThere).and(this.isDifferentFrom(DeliveryStatus.Frozen));
  }
  
  getCss() {
    switch (this.value) {
      case DeliveryStatus.Success:
      case DeliveryStatus.SuccessLeftThere:
      case DeliveryStatus.SuccessPickedUp:
        return 'deliveredOk';
      case DeliveryStatus.FailedBadAddress:
      case DeliveryStatus.FailedNotHome:
      case DeliveryStatus.FailedDoNotWant:
      case DeliveryStatus.FailedNotReady: 
      case DeliveryStatus.FailedTooFar: 
      case DeliveryStatus.FailedOther:
        return 'deliveredProblem';
      case DeliveryStatus.Frozen:
        return 'forzen';
      default:
        return '';
    }
  }

}