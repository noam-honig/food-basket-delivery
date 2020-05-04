import { ColumnOptions, ValueListColumn, NumberColumn, FilterBase, Column, DecorateDataColumnSettings, ValueListItem } from '@remult/core';
import { HelperId } from '../helpers/helpers';


export class FamilyStatus {
  
  
  static Active: FamilyStatus = new FamilyStatus(0, 'פעיל');
  static RemovedFromList: FamilyStatus = new FamilyStatus(99, 'הוצא מהרשימות');
  familyStatus(){

  }
  

  constructor(public id: number, public caption: string) {
  }

}
export class FamilyStatusColumn extends ValueListColumn<FamilyStatus> {
  
  isInEvent() {
    return this.isEqualTo(FamilyStatus.Active);
  }
  getCss() {
    switch (this.value) {
      case FamilyStatus.RemovedFromList:
        return 'deliveredProblem';
      default:
        return '';
    }
  }

  constructor(settingsOrCaption?: ColumnOptions<FamilyStatus>, chooseFrom?: FamilyStatus[]) {
    super(FamilyStatus, {
      dataControlSettings: () => {
        let op = this.getOptions();
        if (chooseFrom)
          op = chooseFrom.map(x => {
            return {
              id: x.id,
              caption: x.caption
            } as ValueListItem
          });
       
        return {
          valueList: op,
          width: '150'
        };

      }
    }, settingsOrCaption);
    if (!this.defs.caption)
      this.defs.caption = 'סטטוס';
  }

}