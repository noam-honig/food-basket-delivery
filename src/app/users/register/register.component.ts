import { Component, OnInit } from '@angular/core';
import { Helpers } from '../../models';
import { DataAreaSettings, StringColumn, GridSettings } from 'radweb';
import { SelectService } from '../../select-popup/select-service';
import { AuthService } from '../../auth/auth-service';
import { foreachEntityItem } from '../../shared/utils';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {


  confirmPassword = new StringColumn({ caption: 'אישור סיסמה', inputType: 'password' });
  helpers = new GridSettings(new Helpers(), {
    numOfColumnsInGrid: 0,
    allowUpdate: true,
    columnSettings: h => [
      h.name,
      h.phone,
      h.password,
      { column: this.confirmPassword },
    ],
    onValidate: h => {
      if (h)
        if (h.password.value != this.confirmPassword.value) {
          h.password.error = "הסיסמה אינה תואמת את אישור הסיסמה";
        }
    }
  });


  constructor(private dialog: SelectService,
    private auth: AuthService) {


  }

  ngOnInit() {
    this.helpers.addNewRow();
  }
  async register() {
    try {
      let userInfo = this.helpers.currentRow;
      await this.helpers._doSavingRow(userInfo);
      this.auth.login(userInfo.phone.value, this.confirmPassword.value, false);
    }
    catch (err) {
      console.log(err);
    }

  }
}
