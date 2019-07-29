import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { DeliveryStatus } from "../families/DeliveryStatus";
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { Context } from 'radweb';
import { Column } from 'radweb';

@Component({
  selector: 'app-update-comment',
  templateUrl: './update-comment.component.html',
  styleUrls: ['./update-comment.component.scss']
})
export class UpdateCommentComponent implements OnInit {

  constructor(
    public dialogRef: MatDialogRef<UpdateCommentComponent>,
    private context: Context,
    @Inject(MAT_DIALOG_DATA) public data: UpdateCommentComponentData
  ) {

  }
  failOptions: DeliveryStatus[] = [
    DeliveryStatus.FailedBadAddress,
    DeliveryStatus.FailedNotHome,
    DeliveryStatus.FailedOther
  ];
  defaultFailStatus = DeliveryStatus.FailedBadAddress;
  getStatusName(s: DeliveryStatus) {
    let r = s.toString();
    if (r.startsWith('לא נמסר, '))
      r = r.substring(9);

    return r;
  }

  ngOnInit() {
  }
  cancel() {
    if (!this.ok) {
      this.data.cancel();
      this.dialogRef.close();
    }

  }
  ok = false;
  confirm() {
    this.ok = true;
    this.dialogRef.close();
    this.data.ok(this.data.comment, this.defaultFailStatus);
    return false;
  }

  helpText() {
    let s = ApplicationSettings.get(this.context);
    return this.data.helpText(s).value;
  }
}

export interface UpdateCommentComponentData {
  showFailStatus?: boolean,
  assignerName: string,
  assignerPhone: string,
  helpText: (s: ApplicationSettings) => Column<any>

  comment: string,
  ok: (comment: string, failStatusId: DeliveryStatus) => void,
  cancel: () => void
}