import { Remult, Filter, FilterFactory } from 'remult';

import { use, ValueListFieldType } from '../translate';

import { getSettings } from '../manage/ApplicationSettings';

import { DataControl } from '@remult/angular';
import { ValueListValueConverter } from 'remult/valueConverters';


@DataControl({
  valueList: async remult => DeliveryStatus.getOptions(remult)
  , width: '150'

})
@ValueListFieldType(DeliveryStatus, {
  displayValue: (e, val) => val.caption,
  translation: l => l.deliveryStatus
})
export class DeliveryStatus {
  static usingSelfPickupModule: boolean = true;
  IsAResultStatus() {
    switch (this) {
      case DeliveryStatus.Success:
      case DeliveryStatus.SuccessPickedUp:
      case DeliveryStatus.SuccessLeftThere:
      case DeliveryStatus.FailedBadAddress:
      case DeliveryStatus.FailedNotHome:
      case DeliveryStatus.FailedDoNotWant:
      case DeliveryStatus.FailedNotReady:
      case DeliveryStatus.FailedTooFar:
      case DeliveryStatus.FailedOther:
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
  getCss(courier:import ('../helpers/helpers').HelpersBase) {
    switch (this) {
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
        if (this==DeliveryStatus.ReadyForDelivery&&courier)
          return 'on-the-way';
        return '';
    }
  }
  private static resultStatuses() {
    return new ValueListValueConverter(DeliveryStatus).getOptions().filter(x => x.IsAResultStatus());
  }
  private static problemStatuses() {
    return new ValueListValueConverter(DeliveryStatus).getOptions().filter(x => x.isProblem);
  }

  static isNotAResultStatus(self: FilterFactory<DeliveryStatus>): Filter {
    return self.isNotIn(this.resultStatuses());
  }


  static isAResultStatus(self: FilterFactory<DeliveryStatus>) {
    return self.isIn(this.resultStatuses());
  }



  static isSuccess(self: FilterFactory<DeliveryStatus>) {
    return self.isIn([this.Success, this.SuccessLeftThere, this.SuccessPickedUp]);
  }
  static isProblem(self: FilterFactory<DeliveryStatus>) {
    return self.isIn(this.problemStatuses());

  }
  static isNotProblem(self: FilterFactory<DeliveryStatus>) {
    return self.isNotIn(this.problemStatuses()).and(self.isDifferentFrom(DeliveryStatus.Frozen));
  }
  static getOptions(remult: Remult) {
    let op = new ValueListValueConverter(DeliveryStatus).getOptions();
    if (!getSettings(remult).usingSelfPickupModule) {
      op = op.filter(x => x.id != DeliveryStatus.SelfPickup.id && x.id != DeliveryStatus.SuccessPickedUp.id);
    }
    if (!getSettings(remult).isSytemForMlt()) {
      op = op.filter(x =>
        x.id != DeliveryStatus.FailedNotReady.id &&
        x.id != DeliveryStatus.FailedTooFar.id
      );
    }
    return op;

  }

}