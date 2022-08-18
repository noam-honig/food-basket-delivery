import { Component, OnInit } from '@angular/core';
import { remult } from 'remult';
import { Helpers } from '../helpers/helpers';

import { ApplicationSettings } from '../manage/ApplicationSettings';
import { relativeDateName } from '../model-shared/types';
import { HelperGifts } from './HelperGifts';

@Component({
  selector: 'app-my-gifts-dialog',
  templateUrl: './my-gifts-dialog.component.html',
  styleUrls: ['./my-gifts-dialog.component.scss']
})
export class MyGiftsDialogComponent implements OnInit {

  theGifts: any[] = [];
  giftsUsed = 0;
  giftsAvailable = 0;
  args: {
    helperId: string;
  };

  constructor(
    public settings: ApplicationSettings
  ) { }

  async ngOnInit() {
    this.giftsUsed = 0;
    this.giftsAvailable = 0;
    let helper = await remult.repo(Helpers).findId(this.args.helperId);
    this.theGifts =
      await remult.repo(HelperGifts).find({ where: { assignedToHelper: helper } }).then(
        gifts => {
          return gifts.map(x => {
            if (x.wasConsumed)
              this.giftsUsed += 1
            else
              this.giftsAvailable += 1;
            return {
              giftID: x.id,
              giftUrl: x.giftURL,
              dateGranted: relativeDateName( { d: x.dateGranted }),
              wasConsumed: x.wasConsumed,
              wasClicked: x.wasClicked
            }
          })
        }
      );
  }

  async giftUsed(gitfID) {
    await remult.repo(HelperGifts).findId(gitfID).then(
      async gift => {
        gift.wasConsumed = true;
        await gift.save();
      }
    )
    this.ngOnInit();
  }

  async useTheGift(gitfID) {
    await remult.repo(HelperGifts).findId(gitfID).then(
      async gift => {
        gift.wasClicked = true;
        await gift.save();
        window.open(gift.giftURL);
      }
    )
    this.ngOnInit();
  }
}
