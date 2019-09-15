import { Component, OnInit } from '@angular/core';
import { Helpers } from '../../helpers/helpers';
import {  StringColumn, NotSignedInGuard } from 'radweb';
import { AuthService } from '../../auth/auth-service';

import { Route } from '@angular/router';
import { Context } from 'radweb';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  constructor(private auth: AuthService,private context:Context) {


  }
  static route: Route = { path: 'register', component: RegisterComponent, data: { name: 'הרשמה' }, canActivate: [NotSignedInGuard] };

  confirmPassword = new StringColumn({ caption: 'אישור סיסמה', inputType: 'password' });
  helpers = this.context.for(Helpers).gridSettings({
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
      console.error(err);
    }

  }
}
