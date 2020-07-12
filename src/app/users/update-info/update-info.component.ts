/// <reference types="@types/googlemaps" />
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { StringColumn } from '@remult/core';
import { Helpers } from '../../helpers/helpers';
import { DialogService } from '../../select-popup/dialog';
import { AuthService } from '../../auth/auth-service';
import { SignedInGuard } from '@remult/core';
import { Route } from '@angular/router';
import { Context } from '@remult/core';
import { ApplicationSettings } from '../../manage/ApplicationSettings';




@Component({
  selector: 'app-update-info',
  templateUrl: './update-info.component.html',
  styleUrls: ['./update-info.component.scss']
})
export class UpdateInfoComponent implements OnInit, AfterViewInit {
  constructor(private dialog: DialogService,
    private auth: AuthService,
    private context: Context,
    public settings: ApplicationSettings) {


  }

  static route: Route = { path: 'update-info', component: UpdateInfoComponent, canActivate: [SignedInGuard] };

  confirmPassword = new StringColumn({ caption: this.settings.lang.confirmPassword, dataControlSettings: () => ({ inputType: 'password' }), defaultValue: Helpers.emptyPassword });
  helpers = this.context.for(Helpers).gridSettings({
    numOfColumnsInGrid: 0,
    allowUpdate: true,
    get: { where: h => h.id.isEqualTo(this.context.user.id) },
    columnSettings: h => [
      h.name,
      h.phone,
      h.email,
      { column: h.preferredDistributionAreaAddress },
      { column: h.preferredDistributionAreaAddress2 },
      { column: h.eventComment, visible: () => this.settings.volunteerCanUpdateComment.value },
      h.password,
      { column: this.confirmPassword },

      //h.address
    ],

  });

  ngAfterViewInit(): void {

  }



  ngOnInit() {
    this.helpers.getRecords().then(() => {
      if (!this.helpers.currentRow.password.value)
        this.confirmPassword.value = '';
    });
  }
  async register() {
    try {
      let passwordChanged = this.helpers.currentRow.password.value != this.helpers.currentRow.password.originalValue;
      let thePassword = this.helpers.currentRow.password.value;
      if (this.helpers.currentRow.password.value != this.confirmPassword.value) {
        this.dialog.Error(this.settings.lang.passwordDoesntMatchConfirmPassword);
      }
      else {

        await this.helpers.items[0].save();
        this.dialog.Info(this.settings.lang.updateSaved);
        this.confirmPassword.value = this.helpers.currentRow.password.value ? Helpers.emptyPassword : '';
        if (passwordChanged) {
          this.auth.login(this.helpers.currentRow.phone.value, thePassword, false, () => { },()=>{});
        }
      }
    }
    catch (err) {

    }

  }

}
AuthService.UpdateInfoComponent = UpdateInfoComponent;