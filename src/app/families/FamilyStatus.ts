import { ColumnOptions, ValueListColumn, NumberColumn, FilterBase, Column, DecorateDataColumnSettings, ValueListItem, Context } from '@remult/core';
import { HelperId } from '../helpers/helpers';
import { use, Language, getLang } from '../translate';


export class FamilyStatus {


  static Active: FamilyStatus = new FamilyStatus(0, l => l.active);
  static RemovedFromList: FamilyStatus = new FamilyStatus(99, l => l.removedFromList);
  static ToDelete: FamilyStatus = new FamilyStatus(98, l => l.toDelete);
  familyStatus() {

  }

  caption: string;
  constructor(public id: number, public getCaption: (lang: Language) => string) {
    this.caption = getCaption(use.language);
  }

}
export class FamilyStatusColumn extends ValueListColumn<FamilyStatus> {

  isInEvent() {
    return this.isEqualTo(FamilyStatus.Active);
  }
  getCss() {
    switch (this.value) {
      case FamilyStatus.RemovedFromList:
        return 'forzen';
      case FamilyStatus.ToDelete:
        return 'deliveredProblem';
      default:
        return '';
    }
  }
  get displayValue() {
    if (this.value)
      return this.value.getCaption(getLang( this.context));
    return '';
  }

  constructor(private context: Context, settingsOrCaption?: ColumnOptions<FamilyStatus>, chooseFrom?: FamilyStatus[]) {
    super(FamilyStatus, {
      dataControlSettings: () => {
        let op = this.getOptions();
        if (chooseFrom)
          op = chooseFrom.map(x => {
            return {
              id: x.id,
              caption: x.getCaption(getLang(context))
            } as ValueListItem
          });

        return {
          valueList: op,
          width: '150'
        };

      }
    }, settingsOrCaption);
    if (!this.defs.caption)
      this.defs.caption = use.language.familyStatus;
  }

}