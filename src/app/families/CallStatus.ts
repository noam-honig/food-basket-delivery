import { ValueListColumn,  Column, ColumnOptions } from '@remult/core';


export class CallStatus {
  static NotYet: CallStatus = new CallStatus(0, 'עדיין לא');
  static Success: CallStatus = new CallStatus(10, 'בוצעה שיחה');
  static Failed: CallStatus = new CallStatus(20, 'לא הצלנו להשיג');
  constructor(public id: number, public caption: string) {
  }
  
}
export class CallStatusColumn extends ValueListColumn<CallStatus> {
    constructor(settingsOrCaption?: ColumnOptions<CallStatus> ) {
      super(CallStatus, settingsOrCaption);
    }
  
  
  }