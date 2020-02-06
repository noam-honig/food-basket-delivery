import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DeliveryStatus } from "../families/DeliveryStatus";
import { ApplicationSettings, phoneOption } from '../manage/ApplicationSettings';
import { Context } from '@remult/core';
import { Column } from '@remult/core';
import { Families } from '../families/families';

@Component({
  selector: 'app-update-comment',
  templateUrl: './update-comment.component.html',
  styleUrls: ['./update-comment.component.scss']
})
export class UpdateCommentComponent implements OnInit {
  public args: {
    family: Families,
    showFailStatus?: boolean,
    assignerName: string,
    assignerPhone: string,
    helpText: (s: ApplicationSettings) => Column<any>
  
    comment: string,
    ok: (comment: string, failStatusId: DeliveryStatus) => void,
    cancel: () => void
  };
  constructor(
    public dialogRef: MatDialogRef<any>,
    private context: Context
  ) {

  }
  failOptions: DeliveryStatus[] = [
    DeliveryStatus.FailedBadAddress,
    DeliveryStatus.FailedNotHome,
    DeliveryStatus.FailedOther
  ];
  defaultFailStatus = DeliveryStatus.FailedBadAddress;
  getStatusName(s: DeliveryStatus) {
    let r = s.caption;
    if (r.startsWith('לא נמסר, '))
      r = r.substring(9);

    return r;
  }

  async ngOnInit() {
    if (this.args.showFailStatus) {
      let s = await ApplicationSettings.getAsync(this.context);
      this.phoneOptions = await s.getPhoneOptions(this.args.family,this.context);
      
    }
  }
  phoneOptions: phoneOption[] = [];
  cancel() {
    if (!this.ok) {
      this.args.cancel();
      this.dialogRef.close();
    }

  }
  ok = false;
  confirm() {
    this.ok = true;
    this.dialogRef.close();
    this.args.ok(this.args.comment, this.defaultFailStatus);
    return false;
  }

  helpText() {
    let s = ApplicationSettings.get(this.context);
    return this.args.helpText(s).value;
  }
}


