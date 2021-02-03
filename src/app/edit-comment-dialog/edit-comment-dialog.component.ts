import { Component, OnInit } from '@angular/core';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-edit-comment-dialog',
  templateUrl: './edit-comment-dialog.component.html',
  styleUrls: ['./edit-comment-dialog.component.scss']
})
export class EditCommentDialogComponent implements OnInit {

  constructor(public settings: ApplicationSettings, private ref: MatDialogRef<any>) { }
  args: {
    title: string,
    comment: string,
    save?: (comment: string) => void
  }
  ngOnInit() {
  }
  confirm() {
    this.args.save(this.args.comment);
    this.ref.close();
  }

}
