import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { openDialog } from '@remult/angular';
import { Remult } from 'remult';
import { Families } from '../families/families';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { SelectFamilyComponent } from '../select-family/select-family.component';
import { DialogService } from '../select-popup/dialog';

@Component({
  selector: 'app-blocked-families',
  templateUrl: './blocked-families.component.html',
  styleUrls: ['./blocked-families.component.scss']
})
export class BlockedFamiliesComponent implements OnInit {
  helper: import("c:/repos/hug-moms/src/app/helpers/helpers").Helpers;

  constructor(public settings: ApplicationSettings,
    public dialogRef: MatDialogRef<any>,
    private remult: Remult) { }
  ids: string[];
  families = new Map<string, string>();
  ngOnInit(): void {
    this.ids = this.helper.blockedFamilies || [];
    this.remult.repo(Families).find({ where: { id: this.ids } }).then(fams => {
      for (const f of fams) {
        this.families.set(f.id, f.name);
      }
    });
  }
  remove(id: string) {
    this.ids = this.ids.filter(x => x != id);
  }
  add() {

    openDialog(SelectFamilyComponent, x => {
      x.args = {
        distCenter: undefined, where: {
          family: { "!=": this.ids }
        }, selectStreet: false, onSelect: fams => {
          for (const f of fams) {
            if (!this.ids.includes(f.family)) {
              this.ids.push(f.family);
              this.families.set(f.family, f.name);
            }
          }
        }
      }
    });
  }
  confirm() {
    this.helper.blockedFamilies = this.ids;
    this.dialogRef.close();
  }

}
