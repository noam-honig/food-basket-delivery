import { Component, OnInit } from '@angular/core';
import { GridSettings, SelectPopup } from 'radweb';
import { Helpers } from '../models';
import { SelectService } from '../select-popup/select-service';
import { ResetPasswordAction } from './reset-password';

@Component({
  selector: 'app-helpers',
  templateUrl: './helpers.component.html',
  styleUrls: ['./helpers.component.css']
})
export class HelpersComponent implements OnInit {

  helpers = new GridSettings(new Helpers(), {
    allowDelete: true,
    allowInsert: true,
    allowUpdate: true,
    numOfColumnsInGrid: 2,
    columnSettings: helpers => [
      helpers.name,
      helpers.phone,
      helpers.email,
      helpers.address,
      helpers.userName
    ],
    confirmDelete: (h, yes) => this.dialog.confirmDelete(h.name.value, yes)
  });
  /* */
  /* workaround for checkbox not working*/
  get admin() {
    if (this.helpers.currentRow)
      return this.helpers.currentRow.isAdmin.value;
    return false;
  }
  set admin(value: any) {

    this.helpers.currentRow.isAdmin.value = value;

  }
  resetPassword() {
    this.dialog.YesNoQuestion("האם את בטוחה שאת רוצה למחוק את הסיסמה של " + this.helpers.currentRow.name.value, async () => {
      await new ResetPasswordAction().run({ helperId: this.helpers.currentRow.id.value });
      this.dialog.Info("הסיסמה נמחקה");
    });

  }

  constructor(private dialog: SelectService) {
  }

  ngOnInit() {
  }

}
