import { Component, OnInit } from '@angular/core';
import { Helpers } from '../../helpers/helpers';
import { DataAreaSettings, StringColumn, GridSettings } from 'radweb';
import { DialogService } from '../../select-popup/dialog';
import { AuthService } from '../../auth/auth-service';
import { foreachEntityItem } from '../../shared/utils';
import { NotLoggedInGuard } from '../../auth/auth-guard';
import { Route } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {

  static route: Route = { path: 'register', component: RegisterComponent, data: { name: 'הרשמה' }, canActivate: [NotLoggedInGuard] };

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


  constructor(private dialog: DialogService,
    private auth: AuthService) {


  }

  ngOnInit() {
    this.helpers.addNewRow();
  }
  async register() {
    try {
      let userInfo = this.helpers.currentRow;
      await this.helpers._doSavingRow(userInfo);
      this.auth.login(userInfo.phone.value, this.confirmPassword.value, false, () => { });
    }
    catch (err) {
      console.log(err);
    }

  }
}
