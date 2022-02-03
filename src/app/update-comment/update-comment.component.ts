import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DeliveryStatus } from "../families/DeliveryStatus";
import { ApplicationSettings, phoneOption } from '../manage/ApplicationSettings';
import { Remult } from 'remult';


import { DialogService } from '../select-popup/dialog';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { DataAreaSettings } from '@remult/angular';
import { ImageInfo } from '../images/images.component';
import { DeliveryImage } from '../families/DeiveryImages';

@Component({
  selector: 'app-update-comment',
  templateUrl: './update-comment.component.html',
  styleUrls: ['./update-comment.component.scss']
})
export class GetVolunteerFeedback implements OnInit {
  public args: {
    family: ActiveFamilyDeliveries,
    showFailStatus?: boolean,
    helpText: (s: ApplicationSettings) => string,
    hideLocation?: boolean,
    title?: string,
    comment: string,
    questionsArea?: DataAreaSettings,
    ok: (comment: string, failStatusId: DeliveryStatus) => void,
    cancel: () => void
  };
  constructor(
    public dialogRef: MatDialogRef<any>,
    private remult: Remult,
    private dialog: DialogService,
    public settings: ApplicationSettings
  ) {

  }
  addLocationToComment() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(x => {
        if (this.args.comment)
          this.args.comment += '\r\n';
        this.args.comment += `מיקום:
${x.coords.latitude.toFixed(6)},${x.coords.longitude.toFixed(6)}
דיוק: ${x.coords.accuracy.toFixed()}
`
      }, error => {
        this.dialog.Error("שליפת מיקום נכשלה " + error.message);
      });
    }
  }
  failOptions: DeliveryStatus[] = [
    DeliveryStatus.FailedBadAddress,
    DeliveryStatus.FailedNotHome,
    DeliveryStatus.FailedDoNotWant,
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

    if (!this.args.title)
      this.args.title = this.settings.lang.thankYou;
    if (this.args.showFailStatus) {

      this.phoneOptions = await ApplicationSettings.getPhoneOptions(this.args.family.id);

    }
    if (this.args.family) {
      this.images = await this.args.family.loadVolunteerImages();
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
  async confirm() {
    this.ok = true;
    for (const image of this.images) {
      if (image.deleted && image.entity)
        await image.entity.delete();
      if (!image.deleted && !image.entity) {
        await this. remult.repo(DeliveryImage).create({
          deliveryId: this.args.family.id, image: image.image
        }).save();
        this.args.family.needsWork = true;
      }
    }
    this.args.ok(this.args.comment, this.defaultFailStatus);
    this.dialogRef.close();
    return false;
  }

  helpText() {
    return this.args.helpText(this.settings);
  }
  images: ImageInfo[] = [];

}


