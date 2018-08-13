import { ClosedListColumn } from "radweb";

export class Language {
  static Hebrew = new Language(0, 'עברית');
  static Russian = new Language(10, 'רוסית');
  static Amharit = new Language(20, 'אמהרית');
  constructor(public id: number, private caption: string) {
  }
  toString() {
    return this.caption;
  }
}
export class LanguageColumn extends ClosedListColumn<Language> {
    constructor() {
      super(Language, "שפה ראשית");
    }
  
  
  }