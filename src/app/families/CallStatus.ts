import { ClosedListColumn,  Column, DataColumnSettings } from "radweb";


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
    constructor(settingsOrCaption?: DataColumnSettings<CallStatus, Column<CallStatus>> | string) {
      super(CallStatus, settingsOrCaption);
    }
  
  
  }