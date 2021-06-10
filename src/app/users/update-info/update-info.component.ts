/// <reference types="@types/googlemaps" />
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';

import { Helpers } from '../../helpers/helpers';
import { DialogService } from '../../select-popup/dialog';
import { AuthService } from '../../auth/auth-service';
import { SignedInGuard, RouteHelperService, InputField, GridSettings } from '@remult/angular';
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
    public sessionManager: AuthService,
    public settings: ApplicationSettings,
    private helper: RouteHelperService) {


  }

  static route: Route = { path: 'update-info', component: UpdateInfoComponent, canActivate: [SignedInGuard] };

  confirmPassword = new InputField<string>({ caption: this.settings.lang.confirmPassword, inputType: 'password', defaultValue: () => Helpers.emptyPassword });
  helpers = new GridSettings(this.context.for(Helpers), {
    numOfColumnsInGrid: 0,
    allowUpdate: true,
    where: h => h.id.isEqualTo(this.context.user.id),
    columnSettings: h => [
      h.name,
      h.phone,
      h.email,
      { field: h.preferredDistributionAreaAddress },
      { field: h.preferredFinishAddress },
      { field: h.eventComment, visible: () => this.settings.volunteerCanUpdateComment },
      h.password,
      { field: this.confirmPassword },

      //h.address
    ],

  });

  ngAfterViewInit(): void {

  }



  ngOnInit() {
    this.helpers.reloadData().then(() => {
      if (!this.helpers.currentRow.password)
        this.confirmPassword.value = '';
    });
  }
  async register() {
    try {
      let passwordChanged = this.helpers.currentRow.$.password.wasChanged();
      let thePassword = this.helpers.currentRow.password;
      if (this.helpers.currentRow.password != this.confirmPassword.value) {
        this.dialog.Error(this.settings.lang.passwordDoesntMatchConfirmPassword);
      }
      else {

        await this.helpers.items[0].save();
        this.dialog.Info(this.settings.lang.updateSaved);
        this.confirmPassword.value = this.helpers.currentRow.password ? Helpers.emptyPassword : '';
        this.helper.navigateToComponent((await import('../../my-families/my-families.component')).MyFamiliesComponent);


      }
    }
    catch (err) {

    }

  }

  signout() {
    this.sessionManager.signout();
  }

}
AuthService.UpdateInfoComponent = UpdateInfoComponent;