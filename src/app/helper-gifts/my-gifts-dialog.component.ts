import { Component, OnInit } from '@angular/core';
import { Context, GridSettings } from '@remult/core';
import { GeneralImportFromExcelComponent } from '../import-gifts/import-from-excel.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
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
    notify?: (string) => void
  };

  constructor(
    private context: Context,
    public settings: ApplicationSettings
    ) { }

  async ngOnInit() {
      this.giftsUsed = 0;
      this.giftsAvailable = 0;
      this.theGifts = 
        await this.context.for(HelperGifts).find({ where: g => g.assignedToHelper.isEqualTo(this.args.helperId)}).then(
          gifts => {
            return gifts.map(x=> {
              if (x.wasConsumed.value)
                this.giftsUsed += 1
              else 
                this.giftsAvailable += 1;
              return {
                giftID: x.id,
                giftUrl: x.giftURL.value,
                dateGranted: x.dateGranted.relativeDateName(this.context),
                wasConsumed: x.wasConsumed.value,
                wasClicked: x.wasClicked.value
              }
            })
          }
        );
    this.args.notify(this.args.helperId);

  }

  async giftUsed(gitfID) {
    await this.context.for(HelperGifts).findFirst({ where: g => g.id.isEqualTo(gitfID)}).then(
      async gift => {
        gift.wasConsumed.value = true;
        await gift.save();
      }
    )
    this.args.notify(this.args.helperId);
    this.ngOnInit();
  }

  async useTheGift(gitfID) {
    await this.context.for(HelperGifts).findFirst({ where: g => g.id.isEqualTo(gitfID)}).then(
      async gift => {
        gift.wasClicked.value = true;
        await gift.save();
        window.open(gift.giftURL.value);
      }
    )
    this.args.notify(this.args.helperId);
    this.ngOnInit();
  }
}
