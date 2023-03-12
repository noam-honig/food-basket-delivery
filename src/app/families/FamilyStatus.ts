import { use, Language, ValueListFieldType } from '../translate'
@ValueListFieldType({
  translation: (l) => l.familyStatus
})
export class FamilyStatus {
  static Active: FamilyStatus = new FamilyStatus(0, (l) => l.active)
  static Frozen: FamilyStatus = new FamilyStatus(100, (l) => l.frozen)
  static RemovedFromList: FamilyStatus = new FamilyStatus(
    99,
    (l) => l.removedFromList,
    'forzen'
  )
  static ToDelete: FamilyStatus = new FamilyStatus(
    98,
    (l) => l.toDelete,
    'deliveredProblem'
  )

  caption: string
  constructor(
    public id: number,
    public getCaption: (lang: Language) => string,
    private css: string = ''
  ) {
    this.caption = getCaption(use.language)
  }
  getCss() {
    return this.css
  }
}
