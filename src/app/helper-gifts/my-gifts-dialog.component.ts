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
  args: {
    helperId: string; 
  };

  constructor(
    private context: Context,
    public settings:ApplicationSettings
    ) { }

  async ngOnInit() {
    this.theGifts = 
      await this.context.for(HelperGifts).find({ where: g => g.assignedToHelper.isEqualTo(this.args.helperId)}).then(
        gifts => {
          return gifts.map(x=> {
            return {
              giftUrl: x.giftURL.value,
              dateGranted: x.dateGranted.relativeDateName(this.context),
              wasConsumed: x.wasConsumed.value
            }
          })
        }
      );
    console.log(this.theGifts)
  }

}
