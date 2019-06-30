import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Families } from '../families/families';
import * as copy from 'copy-to-clipboard';
import { DialogService } from '../select-popup/dialog';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { Context } from '../shared/context';
import { SelectService } from '../select-popup/select-service';
@Component({
  selector: 'app-family-info',
  templateUrl: './family-info.component.html',
  styleUrls: ['./family-info.component.scss']
})
export class FamilyInfoComponent implements OnInit {

  constructor(private dialog: DialogService, private context: Context, private selectService: SelectService) { }
  @Input() f: Families;
  @Input() showHelp = false;
  ngOnInit() {
  }
  @Input() partOfAssign: Boolean;
  @Output() assignmentCanceled = new EventEmitter<void>();
  async SendHelpSms() {
    window.open('sms:' + this.f.courierHelpPhone() + ';?&body=' + encodeURI(`הי ${this.f.courierHelpName()}  זה ${this.context.info.name}, נתקלתי בבעיה אצל משפחת ${this.f.name.value}`), '_blank');
  }
  showCancelAssign(f: Families) {
    return this.partOfAssign && f.courier.value != '' && f.deliverStatus.value == DeliveryStatus.ReadyForDelivery;
  }
  showFamilyPickedUp(f: Families) {
    return f.deliverStatus.value == DeliveryStatus.SelfPickup;
  }
  async familiyPickedUp(f: Families) {
    this.selectService.displayComment({
      comment: f.courierComments.value,
      assignerName: f.courierHelpName(),
      assignerPhone: f.courierHelpPhone(),
      helpText: s => s.commentForSuccessDelivery,
      ok: async (comment) => {
        f.deliverStatus.value = DeliveryStatus.SuccessPickedUp;
        f.courierComments.value = comment;
        try {
          await f.save();
          this.dialog.analytics('Self Pickup');
        }
        catch (err) {
          this.dialog.Error(err);
        }
      },
      cancel: () => { }
    });

  }
  async cancelAssign(f: Families) {
    f.courier.value = '';

    await f.save();

    this.assignmentCanceled.emit();

  }
  openWaze(f: Families) {
    if (!f.addressOk.value) {
      this.dialog.YesNoQuestion("הכתובת אינה מדוייקת. בדקו בגוגל או התקשרו למשפחה. נשמח אם תעדכנו את הכתובת שמצאתם בהערות. האם לפתוח וייז?", () => {
        f.openWaze();
      });
    }
    else
      f.openWaze();


  }
  udpateInfo(f: Families) {
    this.selectService.updateFamiliy({ f: f });
  }
  copyAddress(f: Families) {
    copy(f.address.value);
    this.dialog.Info("הכתובת " + f.address.value + " הועתקה בהצלחה");
  }
  showStatus() {
    return this.f.deliverStatus.value != DeliveryStatus.ReadyForDelivery&&this.f.deliverStatus.value!=DeliveryStatus.SelfPickup;
  }
}
