import { Component, OnInit } from '@angular/core';
import { StringColumn, GridSettings } from 'radweb';
import { Helpers } from '../../models';
import { SelectService } from '../../select-popup/select-service';
import { AuthService } from '../../auth/auth-service';
import { foreachEntityItem } from '../../shared/utils';

@Component({
  selector: 'app-update-info',
  templateUrl: './update-info.component.html',
  styleUrls: ['./update-info.component.scss']
})
export class UpdateInfoComponent implements OnInit {

  confirmPassword = new StringColumn({ caption: 'אישור סיסמה', inputType: 'password', value: Helpers.emptyPassword });
  helpers = new GridSettings(new Helpers(), {
    numOfColumnsInGrid: 0,
    allowUpdate: true,
    get: { where: h => h.id.isEqualTo(this.auth.auth.info.helperId) },
    columnSettings: h => [
      h.name,
      h.phone,
      h.userName,
      h.password,
      { column: this.confirmPassword },
      h.email,
      h.address
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
    this.helpers.getRecords();
  }
  async register() {
    try {
      await this.helpers.items[0].save();
      this.dialog.Info("העדכון נשמר, תודה");
    }
    catch (err) {

    }

  }

}
