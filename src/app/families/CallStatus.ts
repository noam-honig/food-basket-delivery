import { ClosedListColumn, NumberColumn } from "radweb";
import { DataColumnSettings } from "radweb/utils/dataInterfaces1";
import { MoreDataColumnSettings } from "../shared/context";

export class CallStatus {
  static NotYet: CallStatus = new CallStatus(0, 'עדיין לא');
  static Success: CallStatus = new CallStatus(10, 'בוצעה שיחה');
  static Failed: CallStatus = new CallStatus(20, 'לא הצלנו להשיג');
  constructor(public id: number, private caption: string) {
  }
  toString() {
    return this.caption;
  }
}
export class CallStatusColumn extends ClosedListColumn<CallStatus> {
    constructor(settingsOrCaption?: MoreDataColumnSettings<number, NumberColumn> | string) {
      super(CallStatus, settingsOrCaption);
    }
  
  
  }