import { ColumnOptions, ValueListColumn, NumberColumn, FilterBase, Column, DecorateDataColumnSettings, ValueListItem, Context } from '@remult/core';
import { HelperId } from '../helpers/helpers';
import { use, getLang } from '../translate';


export class DeliveryStatus {
  static usingSelfPickupModule: boolean = true;
//  static usingLabReception: boolean = false;
  static IsAResultStatus(value: DeliveryStatus) {
    switch (value) {
      case this.Success:
      case this.SuccessPickedUp:
      case this.SuccessLeftThere:
      case this.FailedBadAddress:
      case this.FailedNotHome:
      case this.FailedOther:
        return true;
    }
    return false;
  }
  static ReadyForDelivery: DeliveryStatus = new DeliveryStatus(0, !use ? '' : use.language.readyForDelivery);
  static SelfPickup: DeliveryStatus = new DeliveryStatus(2, !use ? '' : use.language.selfPickup);
  static Frozen: DeliveryStatus = new DeliveryStatus(9, !use ? '' : use.language.frozen);

  static Success: DeliveryStatus = new DeliveryStatus(11, !use ? '' : use.language.deliveredSuccessfully);
  static SuccessPickedUp: DeliveryStatus = new DeliveryStatus(13, !use ? '' : use.language.packageWasPickedUp);
  static SuccessLeftThere: DeliveryStatus = new DeliveryStatus(19, !use ? '' : use.language.leftByHouse);
//  static LabReception: DeliveryStatus = new DeliveryStatus(20, !use ? '' : use.language.receptionDone, true);

  static FailedBadAddress: DeliveryStatus = new DeliveryStatus(21, !use ? '' : use.language.notDeliveredBadAddress, true);
  static FailedNotHome: DeliveryStatus = new DeliveryStatus(23, !use ? '' : use.language.notDeliveredNotHome, true);
  static FailedOther: DeliveryStatus = new DeliveryStatus(25, !use ? '' : use.language.notDeliveredOther, true);



  constructor(public id: number, public caption: string, public isProblem = false) {
  }

}
export class DeliveryStatusColumn extends ValueListColumn<DeliveryStatus> {
  isNotAResultStatus(): FilterBase {
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
    return this.isGreaterOrEqualTo(DeliveryStatus.FailedBadAddress).and(this.isLessOrEqualTo(DeliveryStatus.FailedOther));
  }
  getCss() {
    switch (this.value) {
      case DeliveryStatus.Success:
      case DeliveryStatus.SuccessLeftThere:
      case DeliveryStatus.SuccessPickedUp:
        return 'deliveredOk';
      case DeliveryStatus.FailedBadAddress:
      case DeliveryStatus.FailedNotHome:
      case DeliveryStatus.FailedOther:
        return 'deliveredProblem';
      case DeliveryStatus.Frozen:
        return 'forzen';
      default:
        return '';
    }
  }

}