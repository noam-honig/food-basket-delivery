import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { DeliveryStatus, DeliveryStatusColumn } from '../models';

@Component({
  selector: 'app-update-comment',
  templateUrl: './update-comment.component.html',
  styleUrls: ['./update-comment.component.scss']
})
export class UpdateCommentComponent implements OnInit {

  constructor(
    public dialogRef: MatDialogRef<UpdateCommentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UpdateCommentComponentData
  ) {

  }
  failOptions:DeliveryStatus[] = [
    DeliveryStatus.FailedBadAddress,
    DeliveryStatus.FailedNotHome,
    DeliveryStatus.FailedOther
  ];
  defaultFailStatus = DeliveryStatus.FailedBadAddress;

  ngOnInit() {
  }
  cancel() {
    if (!this.ok) {
      this.data.cancel();
      this.dialogRef.close();
    }

  }
  ok = false;
  confirm(failStatusId) {
    this.ok = true;
    this.dialogRef.close();
    this.data.ok(this.data.comment, failStatusId);
    return false;
  }


}

export interface UpdateCommentComponentData {
  showFailStatus?: boolean,

  comment: string,
  ok: (comment: string, failStatusId: number) => void,
  cancel: () => void
}