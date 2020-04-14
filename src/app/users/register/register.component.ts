import { Component, OnInit } from '@angular/core';
import { Helpers } from '../../helpers/helpers';
import { StringColumn, NotSignedInGuard } from '@remult/core';
import { AuthService } from '../../auth/auth-service';

import { Route } from '@angular/router';
import { Context } from '@remult/core';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  constructor(private auth: AuthService, private context: Context) {


  }
  static route: Route = { path: 'register', component: RegisterComponent, data: { name: 'הרשמה' }, canActivate: [NotSignedInGuard] };

  confirmPassword = new StringColumn({ caption: 'אישור סיסמה', dataControlSettings: () => ({ inputType: 'password' }) });
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
          h.password.validationError = "הסיסמה אינה תואמת את אישור הסיסמה";
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
      this.auth.login(userInfo.phone.value, this.confirmPassword.value, false, async () => {
          await this.helpers.getRecords();
          this.helpers.addNewRow();
      });
    }
    catch (err) {
      console.error(err);
    }

  }
}
