import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ApplicationSettings } from '../../manage/ApplicationSettings';

@Component({
  selector: 'app-yes-no-question',
  templateUrl: './yes-no-question.component.html',
  styleUrls: ['./yes-no-question.component.scss']
})
export class YesNoQuestionComponent implements OnInit {
  public args: {
    onYes?: () => void;
    onNo?: () => void;
    yesButtonText?: string,
    noButtonText?: string,
    showOnlyConfirm?: boolean;
    question: string;
  };
  confirmOnly = false;
  question: string;
  constructor(
    private dialogRef: MatDialogRef<any>,
    public settings: ApplicationSettings

  ) {
    dialogRef.afterClosed().subscribe(s => {
      if (!this.yes && this.args && this.args.onNo)
        this.args.onNo();
    });
  }

  ngOnInit() {
    if (!this.args) {
      this.args = {
        question: 'q'
      };
    }
    if (this.args && this.args.showOnlyConfirm)
      this.confirmOnly = this.args.showOnlyConfirm;
    if (!this.question)
      this.question = this.args.question;
    if (this.args) {
      if (!this.args.yesButtonText)
        this.args.yesButtonText = this.settings.lang.yes;
      if (!this.args.noButtonText)
        this.args.noButtonText = this.settings.lang.no;
    }
  }
  close() {
    this.dialogRef.close();
  }
  yes = false;
  select() {
    this.yes = true;
    this.dialogRef.close();
    if (this.args.onYes)
      this.args.onYes();
  }
}
