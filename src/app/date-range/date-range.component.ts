import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { DataAreaSettings, DataControl, InputField } from '@remult/angular';
import { DateOnlyValueConverter } from 'remult/valueConverters';
import { Context, DateOnlyField, getFields } from 'remult';


import { ApplicationSettings } from '../manage/ApplicationSettings';
import { Field } from '../translate';
var fullDayValue = 24 * 60 * 60 * 1000;
@Component({
  selector: 'app-date-range',
  templateUrl: './date-range.component.html',
  styleUrls: ['./date-range.component.scss']
})
export class DateRangeComponent implements OnInit {

  @Input() rangeWeekly: boolean = false;
  @Output() dateChanged = new EventEmitter<void>();

  @DateOnlyField()
  @DataControl({
    valueChange: (self) => {
      if (self.toDate.value < self.fromDate.value) {
        self.toDate.value = self.getEndOfMonth();
      }
    }
  })
  fromDate: Date;
  @DateOnlyField()
  toDate: Date;
  get $() { return getFields(this, this.context) };
  rangeArea = new DataAreaSettings({
    fields: () => [[this.$.fromDate, this.$.toDate]],
  });
  private getEndOfMonth(): Date {
    return new Date(this.fromDate.getFullYear(), this.fromDate.getMonth() + 1, 0);
  }

  today() {
    this.fromDate = new Date();
    this.toDate = new Date();
    this.dateChanged.emit();

  }
  next() {
    this.setRange(+1);
  }
  previous() {

    this.setRange(-1);
  }
  private setRange(delta: number) {
    if (this.fromDate.getDate() == 1 && this.toDate.toDateString() == this.getEndOfMonth().toDateString()) {
      this.fromDate = new Date(this.fromDate.getFullYear(), this.fromDate.getMonth() + delta, 1);
      this.toDate = this.getEndOfMonth();
    } else {
      let difference = Math.abs(this.toDate.getTime() - this.fromDate.getTime());
      if (difference < fullDayValue)
        difference = fullDayValue;
      difference *= delta;
      let to = this.toDate;
      this.fromDate = new Date(this.fromDate.getTime() + difference);
      this.toDate = new Date(to.getTime() + difference);

    }
    this.dateChanged.emit();
  }
  constructor(public settings: ApplicationSettings, private context: Context) {
  }

  ngOnInit() {
    let today = new Date();
    if (this.rangeWeekly) {
      let lastWeek = new Date(); lastWeek.setDate(today.getDate() - 7);
      this.fromDate = lastWeek;
      this.toDate = today;

    }
    else {
      this.fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
      this.toDate = this.getEndOfMonth();
      console.log({ from: this.fromDate, to: this.toDate })
    }
  }

}
