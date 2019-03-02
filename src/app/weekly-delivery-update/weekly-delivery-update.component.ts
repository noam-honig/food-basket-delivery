import { Component, OnInit, Inject } from '@angular/core';
import { WeeklyFamilyDeliveries } from '../weekly-families-deliveries/weekly-families-deliveries.component';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Context } from '../shared/context';

@Component({
  selector: 'app-weekly-delivery-update',
  templateUrl: './weekly-delivery-update.component.html',
  styleUrls: ['./weekly-delivery-update.component.scss']
})
export class WeeklyDeliveryUpdateComponent implements OnInit {

  constructor(
    private dialogRef: MatDialogRef<WeeklyDeliveryUpdateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UpdateWeeklyDeliveryInfo,
    private context:Context
  ) { }

  ngOnInit() {
  }

} 
export interface UpdateWeeklyDeliveryInfo {
  f: WeeklyFamilyDeliveries
}