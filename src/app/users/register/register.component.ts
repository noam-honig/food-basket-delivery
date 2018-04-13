import { Component, OnInit } from '@angular/core';
import { Helpers } from '../../models';
import { DataAreaSettings, StringColumn, GridSettings } from 'radweb';
import { SelectService } from '../../select-popup/select-service';

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
      h.userName,
      h.password,
      { column: this.confirmPassword },
      h.email,
      h.address
    ],
    onValidate: h => {
      if (h)
        if (h.password.value != this.confirmPassword.value){
          h.password.error = "הסיסמה אינה תואמת את אישור הסיסמה";
        }
    }
  });


  constructor(private dialog: SelectService) {
      

   }

  ngOnInit() {
    this.helpers.addNewRow();
  }
  async login() {
    try {
      await this.helpers._doSavingRow(this.helpers.currentRow);
    }
    catch (err) {
      
    }

  }
}
