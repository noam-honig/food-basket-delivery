import { Component, OnInit } from '@angular/core';
import { Helpers } from '../../helpers/helpers';
import { StringColumn, NotSignedInGuard } from '@remult/core';
import { AuthService } from '../../auth/auth-service';

import { Route } from '@angular/router';
import { Context } from '@remult/core';
import { ApplicationSettings } from '../../manage/ApplicationSettings';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  constructor(private auth: AuthService, private context: Context,public settings:ApplicationSettings) {


  }
  static route: Route = { path: 'register', component: RegisterComponent, canActivate: [NotSignedInGuard] };

  confirmPassword = new StringColumn({ caption: this.settings.lang.confirmPassword, dataControlSettings: () => ({ inputType: 'password' }) });
  helpers = this.context.for(Helpers).gridSettings({
    numOfColumnsInGrid: 0,
    allowUpdate: true,
    columnSettings: h => [
      h.name,
      h.phone,
      h.email,
      { column: h.preferredDistributionAreaAddress },
      { column: h.eventComment, visible: () => this.settings.volunteerCanUpdateComment.value },
      h.password,
      { column: this.confirmPassword },
    ],
    onValidate: h => {
      if (h)
        if (h.password.value != this.confirmPassword.value) {
          h.password.validationError = this.settings.lang.passwordDoesntMatchConfirmPassword;
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
