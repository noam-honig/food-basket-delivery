import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { BusyService } from '@remult/angular';
import { Remult } from 'remult';
import { CallerController, CallerFamilyInfo } from '../caller/caller.controller';

@Component({
  selector: 'app-select-family-for-caller',
  templateUrl: './select-family-for-caller.component.html',
  styleUrls: ['./select-family-for-caller.component.scss']
})
export class SelectFamilyForCallerComponent implements OnInit {


  constructor(private remult: Remult, private busy: BusyService, private dialogRef: MatDialogRef<any>) { }
  controller = new CallerController(this.remult);
  families: CallerFamilyInfo[] = [];
  ngOnInit() {
    this.loadFamilies();
  }
  async loadFamilies() {
    if (this.searchString?.trim().length >= 2) {
      this.families = await this.controller.findFamily(this.searchString);
    }
  }
  async doSearch() {
    await this.busy.donotWait(async () => this.loadFamilies());
  }

  searchString: string;


  args: {
    onSelect: (p: CallerFamilyInfo) => void;
  }
  select(p: CallerFamilyInfo) {
    this.args.onSelect(p);
    this.dialogRef.close();
  }
  selectFirst() {
    if (this.families.length > 0)
      this.select(this.families[0]);
  }



}

