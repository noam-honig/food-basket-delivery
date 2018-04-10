import { Component, OnInit, Inject } from '@angular/core';
import { GridSettings, Entity, IDataSettings } from 'radweb';
import { Helpers } from '../models';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'app-select-popup',
  templateUrl: './select-popup.component.html',
  styleUrls: ['./select-popup.component.css']
})
export class SelectPopupComponent implements OnInit {

  constructor(
    private dialogRef: MatDialogRef<SelectPopupComponent>,
    @Inject(MAT_DIALOG_DATA) private data: SelectComponentInfo<any>

  ) {
    this.helpers = new GridSettings(data.entity, data.settings);
  }

  ngOnInit() {
  }
  close() {
    this.dialogRef.close();
  }
  select() {
    this.data.onSelect(this.helpers.currentRow);
    this.dialogRef.close();
  }
  helpers: GridSettings<any>;

}

export interface SelectComponentInfo<T extends Entity<any>> {
  entity: T,
  onSelect: (selectedValue: T) => void,
  settings?: IDataSettings<T>
}