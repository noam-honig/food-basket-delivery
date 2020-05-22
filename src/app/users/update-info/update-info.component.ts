/// <reference types="@types/googlemaps" />
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { StringColumn } from '@remult/core';
import { Helpers } from '../../helpers/helpers';
import { DialogService } from '../../select-popup/dialog';
import { AuthService } from '../../auth/auth-service';
import { SignedInGuard } from '@remult/core';
import { Route } from '@angular/router';
import { Context } from '@remult/core';




@Component({
  selector: 'app-update-info',
  templateUrl: './update-info.component.html',
  styleUrls: ['./update-info.component.scss']
})
export class UpdateInfoComponent implements OnInit,AfterViewInit  {
  constructor(private dialog: DialogService,
    private auth: AuthService,
    private context: Context) {


  }
  
  static route: Route = { path: 'update-info', component: UpdateInfoComponent, data: { name: 'הגדרות אישיות' }, canActivate: [SignedInGuard] };

  confirmPassword = new StringColumn({ caption: 'אישור סיסמה', dataControlSettings: () => ({ inputType: 'password' }), defaultValue: Helpers.emptyPassword });
  helpers = this.context.for(Helpers).gridSettings({
    numOfColumnsInGrid: 0,
    allowUpdate: true,
    get: { where: h => h.id.isEqualTo(this.context.user.id) },
    columnSettings: h => [
      h.name,
      h.phone,
      //h.userName,
      h.password,
      { column: this.confirmPassword },

      //h.address
    ],

  });
  @ViewChild("address", { static: true }) addressElement;
  ngAfterViewInit(): void {
  //   const autocomplete = new google.maps.places.Autocomplete(this.addressElement.nativeElement,
  //     {
  //   //     componentRestrictions: { country: 'US' }
  //       //  ,
  //       //  types: [this.adressType]  // 'establishment' / 'address' / 'geocode'
  //     });
  // google.maps.event.addListener(autocomplete, 'place_changed', () => {
  //     const place = autocomplete.getPlace();
  //     console.log(place);
  // });
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
        this.dialog.Error('הסיסמה אינה תואמת את אישור הסיסמה');
      }
      else {

        await this.helpers.items[0].save();
        this.dialog.Info("העדכון נשמר, תודה");
        this.confirmPassword.value = this.helpers.currentRow.password.value ? Helpers.emptyPassword : '';
        if (passwordChanged) {
          this.auth.login(this.helpers.currentRow.phone.value, thePassword, false, () => { });
        }
      }
    }
    catch (err) {

    }

  }

}
AuthService.UpdateInfoComponent = UpdateInfoComponent;