import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Families } from '../families/families';
import { AuthService } from '../auth/auth-service';
import * as copy from 'copy-to-clipboard';
import { DialogService } from '../select-popup/dialog';
import { DeliveryStatus } from '../families/DeliveryStatus';
@Component({
  selector: 'app-family-info',
  templateUrl: './family-info.component.html',
  styleUrls: ['./family-info.component.scss']
})
export class FamilyInfoComponent implements OnInit {

  constructor(private auth:AuthService,private dialog:DialogService) { }
  @Input() f: Families;
  @Input() showHelp = false;
  ngOnInit() {
  }
  @Input() partOfAssign:Boolean;
  @Output() assignmentCanceled = new EventEmitter<void>();
  async SendHelpSms() {
    window.open('sms:' + this.f.courierAssignUserPhone.value + ';?&body=' + encodeURI(`הי ${this.f.courierAssignUserName.value}  זה ${this.auth.auth.info.name}, נתקלתי בבעיה אצל משפחת ${this.f.name.value}`), '_blank');
  }
  async cancelAssign(f: Families) {
    f.courier.value = '';

    await f.save();
    
    this.assignmentCanceled.emit();

  }
  copyAddress(f:Families) {
    copy(f.address.value);
    this.dialog.Info("הכתובת "+f.address.value+" הועתקה בהצלחה");
  }
  showStatus(){
    return this.f.deliverStatus.listValue!= DeliveryStatus.ReadyForDelivery;
  }
}
 