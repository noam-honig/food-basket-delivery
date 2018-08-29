import { Component, OnInit, Input } from '@angular/core';
import { Families } from '../families/families';
import * as copy from 'copy-to-clipboard';
import { SelectService } from '../select-popup/select-service';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { Context } from '../shared/context';
@Component({
  selector: 'app-family-info',
  templateUrl: './family-info.component.html',
  styleUrls: ['./family-info.component.scss']
})
export class FamilyInfoComponent implements OnInit {

  constructor(private dialog:SelectService,private context:Context) { }
  @Input() f: Families;
  @Input() showHelp = false;
  ngOnInit() {
  }
  async SendHelpSms() {
    window.open('sms:' + this.f.courierAssignUserPhone.value + ';?&body=' + encodeURI(`הי ${this.f.courierAssignUserName.value}  זה ${this.context.info.name}, נתקלתי בבעיה אצל משפחת ${this.f.name.value}`), '_blank');
  }
  copyAddress(f:Families) {
    copy(f.address.value);
    this.dialog.Info("הכתובת "+f.address.value+" הועתקה בהצלחה");
  }
  showStatus(){
    return this.f.deliverStatus.listValue!= DeliveryStatus.ReadyForDelivery;
  }
}
 