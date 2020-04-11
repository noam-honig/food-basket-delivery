import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material';

@Component({
  selector: 'app-select-list',
  templateUrl: './select-list.component.html',
  styleUrls: ['./select-list.component.scss']
})
export class SelectListComponent implements OnInit {

  constructor(private d: MatDialogRef<any>) { }
  args: {
    options: selectListItem[];

    title: string;
  }
  ngOnInit() {
  }
  selected: selectListItem;
  select(item: selectListItem) {
    this.selected = item;
    this.close();
  }

  close() {
    this.d.close();
  }

}



export interface selectListItem {
  name: string,
  item: any
}