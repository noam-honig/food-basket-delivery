import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { DeliveryStatus } from "../families/DeliveryStatus";

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
    this.data.ok(this.data.comment, this.defaultFailStatus.id);
    return false;
  }


}

export interface UpdateCommentComponentData {
  showFailStatus?: boolean,
  assignerName:string,
  assignerPhone:string,

  comment: string,
  ok: (comment: string, failStatusId: number) => void,
  cancel: () => void
}