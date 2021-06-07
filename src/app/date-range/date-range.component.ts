import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { DataAreaSettings, InputField } from '../../../../radweb/projects/angular';
import { DateOnlyValueConverter } from '../../../../radweb/projects/core';
import { ApplicationSettings } from '../manage/ApplicationSettings';
var fullDayValue = 24 * 60 * 60 * 1000;
@Component({
  selector: 'app-date-range',
  templateUrl: './date-range.component.html',
  styleUrls: ['./date-range.component.scss']
})
export class DateRangeComponent implements OnInit {

  @Input() rangeWeekly: boolean = false;
  @Output() dateChanged = new EventEmitter<void>();
  fromDate = new InputField<Date>({
    caption: this.settings.lang.fromDate,
    valueConverter: DateOnlyValueConverter,
    valueChange: () => {

      if (this.toDate.value < this.fromDate.value) {
        this.toDate.value = this.getEndOfMonth();
      }

    }
  });
  toDate = new InputField<Date>({
    caption: this.settings.lang.toDate,
    valueConverter: DateOnlyValueConverter
  });

  rangeArea = new DataAreaSettings({
    fields: () => [[this.fromDate, this.toDate]],
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
  constructor(public settings: ApplicationSettings) {
  }

  ngOnInit() {
    let today = new Date();
    if (this.rangeWeekly) {
      let lastWeek = new Date(); lastWeek.setDate(today.getDate() - 7);
      this.fromDate.value = lastWeek;
      this.toDate.value = today;
    }
    else {
      this.fromDate.value = new Date(today.getFullYear(), today.getMonth(), 1);
      this.toDate.value = this.getEndOfMonth();
    }
  }

}
