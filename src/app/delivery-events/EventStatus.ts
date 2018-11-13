import { ClosedListColumn, NumberColumn } from "radweb";
import { DataColumnSettings } from "radweb";

export class EventStatus {
  static Prepare: EventStatus = new EventStatus(0, 'בהכנה');
  static Active: EventStatus = new EventStatus(10, 'פעיל');
  static Done: EventStatus = new EventStatus(20, 'הסתיים');
  constructor(public id: number, private caption: string) {
  }
  toString() {
    return this.caption;
  }
}

export class EventStatusColumn extends ClosedListColumn<EventStatus> {
    constructor(settingsOrCaption?: DataColumnSettings<number, NumberColumn> | string) {
      super(EventStatus, settingsOrCaption);
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