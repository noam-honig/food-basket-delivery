import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { DateColumn, DataAreaSettings } from '@remult/core';
var fullDayValue = 24 * 60 * 60 * 1000;
@Component({
  selector: 'app-date-range',
  templateUrl: './date-range.component.html',
  styleUrls: ['./date-range.component.scss']
})
export class DateRangeComponent implements OnInit {
  @Output()  dateChanged=new EventEmitter<void>();
  fromDate = new DateColumn({
    caption: 'מתאריך',
    valueChange: () => {

      if (this.toDate.value < this.fromDate.value) {
        this.toDate.value = this.getEndOfMonth();
      }

    }
  });
  toDate = new DateColumn('עד תאריך');
  rangeArea = new DataAreaSettings({
    columnSettings: () => [this.fromDate, this.toDate],
    numberOfColumnAreas: 2
  });
  private getEndOfMonth(): Date {
    return new Date(this.fromDate.value.getFullYear(), this.fromDate.value.getMonth() + 1, 0);
  }
  
  today() {
    this.fromDate.value = new Date();
    this.toDate.value = new Date();
    this.dateChanged.emit();

  }
  next() {
    this.setRange(+1);
  }
  previous() {

    this.setRange(-1);
  }
  private setRange(delta: number) {
    if (this.fromDate.value.getDate() == 1 && this.toDate.value.toDateString() == this.getEndOfMonth().toDateString()) {
      this.fromDate.value = new Date(this.fromDate.value.getFullYear(), this.fromDate.value.getMonth() + delta, 1);
      this.toDate.value = this.getEndOfMonth();
    } else {
      let difference = Math.abs(this.toDate.value.getTime() - this.fromDate.value.getTime());
      if (difference < fullDayValue)
        difference = fullDayValue;
      difference *= delta;
      let to = this.toDate.value;
      this.fromDate.value = new Date(this.fromDate.value.getTime() + difference);
      this.toDate.value = new Date(to.getTime() + difference);

    }
    this.dateChanged.emit();
  }
  constructor() {
    let today = new Date();

    this.fromDate.value = new Date(today.getFullYear(), today.getMonth(), 1);
    this.toDate.value = this.getEndOfMonth();
   }

  ngOnInit() {
  }

}
