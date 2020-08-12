import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { ApplicationSettings } from '../manage/ApplicationSettings';

@Component({
  selector: 'app-select-list',
  templateUrl: './select-list.component.html',
  styleUrls: ['./select-list.component.scss']
})
export class SelectListComponent implements OnInit {

  constructor(private d: MatDialogRef<any>,public settings:ApplicationSettings) { }
  args: {
    options: selectListItem[];

    title: string;
    multiSelect?: boolean;
    onSelect?: (selectedItem: selectListItem, selected?: boolean, list?: selectListItem[]) => void,
  }
  ngOnInit() {
  }
  selected: selectListItem;
  select(item: selectListItem) {
    if (!this.args.multiSelect) {
      this.selected = item;
      if (this.args.onSelect) 
        this.args.onSelect(item, true);
      this.close();
    }
  }

  onChange(item: selectListItem) {
    if (this.args.onSelect) 
      this.args.onSelect(item, item.selected, this.args.options);
  }


  close() {
    this.d.close();
  }

}



export interface selectListItem {
  name: string,
  item: any,
  selected?: boolean
}