import { Component, OnInit, Input } from '@angular/core';
import { Families } from '../models';
import { AuthService } from '../auth/auth-service';
import * as copy from 'copy-to-clipboard';
import { SelectService } from '../select-popup/select-service';
@Component({
  selector: 'app-family-info',
  templateUrl: './family-info.component.html',
  styleUrls: ['./family-info.component.scss']
})
export class FamilyInfoComponent implements OnInit {

  constructor(private auth:AuthService,private dialog:SelectService) { }
  @Input() f: Families;
  @Input() showHelp = false;
  ngOnInit() {
  }
  async SendHelpSms() {
    window.open('sms:' + this.f.courierAssignUserPhone.value + ';?&body=' + encodeURI(`הי ${this.f.courierAssignUserName.value}  זה ${this.auth.auth.info.name}, נתקלתי בבעיה אצל משפחת ${this.f.name.value}`), '_blank');
  }
  copyAddress(f:Families) {
    copy(f.address.value);
    this.dialog.Info("הכתובת "+f.address.value+" הועתקה בהצלחה");
  }
}
