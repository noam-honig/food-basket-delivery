import { ClosedListColumn, NumberColumn, Column } from "radweb";
import { DataColumnSettings } from "radweb";
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
    constructor(settingsOrCaption?: MoreDataColumnSettings<CallStatus, Column<CallStatus>> | string) {
      super(CallStatus, settingsOrCaption);
    }
  
  
  }