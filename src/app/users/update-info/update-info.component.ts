/// <reference types="@types/googlemaps" />
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';

import { Helpers } from '../../helpers/helpers';
import { DialogService } from '../../select-popup/dialog';
import { AuthService } from '../../auth/auth-service';
import { InputField, GridSettings, DataAreaSettings } from '@remult/angular/interfaces';
import { Route } from '@angular/router';
import { remult } from 'remult';
import { ApplicationSettings } from '../../manage/ApplicationSettings';
import { AuthenticatedGuard, RouteHelperService } from '@remult/angular';




@Component({
  selector: 'app-update-info',
  templateUrl: './update-info.component.html',
  styleUrls: ['./update-info.component.scss']
})
export class UpdateInfoComponent implements OnInit, AfterViewInit {
  constructor(private dialog: DialogService,
    private auth: AuthService,
    public sessionManager: AuthService,
    public settings: ApplicationSettings,
    private helper: RouteHelperService) {


  }

  static route: Route = { path: 'update-info', component: UpdateInfoComponent, canActivate: [AuthenticatedGuard] };

  confirmPassword = new InputField<string>({ caption: this.settings.lang.confirmPassword, inputType: 'password', defaultValue: () => Helpers.emptyPassword });
  h: Helpers;

  area: DataAreaSettings;

  ngAfterViewInit(): void {


  }




  async ngOnInit() {
    this.h = await remult.context.getCurrentUser();
    await this.h._.reload();
    if (!this.h.password)
      this.confirmPassword.value = '';
    this.area = new DataAreaSettings({
      fields: () =>
        [
          this.h.$.name,
          this.h.$.phone,
          this.h.$.email,
          { field: this.h.$.preferredDistributionAreaAddress },
          { field: this.h.$.preferredFinishAddress },
          { field: this.h.$.eventComment, visible: () => this.settings.volunteerCanUpdateComment },
          this.h.$.password,
          { field: this.confirmPassword },

          //h.address
        ]

    })
  }
  async register() {
    try {

      if (this.h.password != this.confirmPassword.value) {
        this.dialog.Error(this.settings.lang.passwordDoesntMatchConfirmPassword);
      }
      else {

        await this.h.save();
        this.dialog.Info(this.settings.lang.updateSaved);
        this.confirmPassword.value = this.h.password ? Helpers.emptyPassword : '';
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