import { ClosedListColumn, NumberColumn } from "radweb";
import { DataColumnSettings } from "radweb";

export class DeliveryStatus {
  static ReadyForDelivery: DeliveryStatus = new DeliveryStatus(0, 'מוכן למשלוח');
  static Success: DeliveryStatus = new DeliveryStatus(11, 'נמסר בהצלחה');
  static FailedBadAddress: DeliveryStatus = new DeliveryStatus(21, 'לא נמסר, בעיה בכתובת');
  static FailedNotHome: DeliveryStatus = new DeliveryStatus(23, 'לא נמסר, לא היו בבית');
  static FailedOther: DeliveryStatus = new DeliveryStatus(25, 'לא נמסר, אחר');
  static Frozen: DeliveryStatus = new DeliveryStatus(90, 'מוקפא');
  static NotInEvent: DeliveryStatus = new DeliveryStatus(95, 'לא באירוע');
  constructor(public id: number, private name: string) {
  }
  toString() {
    return this.name;
  }
}
export class DeliveryStatusColumn extends ClosedListColumn<DeliveryStatus> {
    constructor(settingsOrCaption?: DataColumnSettings<number, NumberColumn> | string) {
      super(DeliveryStatus, settingsOrCaption);
    }
    getColumn() {
      return {
        column: this,
        dropDown: {
          items: this.getOptions()
        },
        width: '150'
      };
    }
  
  }