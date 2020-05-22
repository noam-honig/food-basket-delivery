import { Pipe, PipeTransform } from '@angular/core';
import { ValueListColumn, ColumnOptions } from '@remult/core';

@Pipe({ name: 'translate' })
export class TranslatePipe implements PipeTransform {
  transform(value: string): string {

    return translate(value);
  }
}


var terms: { [key: string]: string } = {};

export function translate(s: string) {
  let r = terms[s];

  if (!r) {
    r = translationConfig.forWho.translate(s);
    terms[s] = r;
  }
  return r;
}

export class TranslationOptions {


  static Families: TranslationOptions = new TranslationOptions(0, 'משפחות', s => s);
  static Donors: TranslationOptions = new TranslationOptions(1, 'תורמים',
    s => s.replace(/משפחה אחת/g, "תורם אחד")
      .replace(/משפחות חוזרות/g, 'תורמים חוזרים')
      .replace(/משפחות מיוחדות/g, "תורמים מיוחדים")
      .replace(/מש' הכי קרובה/g, 'תורם הכי קרוב')
      .replace(/משפחה כלשהי/g, 'תורם כלשהו')
      .replace(/משפחות/g, "תורמים")
      .replace(/משפחה/g, 'תורם')
      .replace(/חדשה/g, 'חדש')
      .replace(/כפולות/g, 'כפולים'));
  static Soldiers: TranslationOptions = new TranslationOptions(2, 'חיילים', s =>
    s.replace(/משפחה אחת/g, "חייל אחד")
      .replace(/משפחות חוזרות/g, 'חיילים חוזרים')
      .replace(/משפחות מיוחדות/g, "חיילים מיוחדים")
      .replace(/מש' הכי קרובה/g, 'חייל הכי קרוב')
      .replace(/משפחה כלשהי/g, 'חייל כלשהו')
      .replace(/משפחות/g, "חיילים")
      .replace(/משפחה/g, 'חייל')
      .replace(/חדשה/g, 'חדש')
      .replace(/כפולות/g, 'כפולים'));
  TranslateOption() {

  }
  constructor(public id: number, public caption: string, public translate: (s: string) => string) {
  }

}
export class TranslationOptionsColumn extends ValueListColumn<TranslationOptions> {

  constructor(settingsOrCaption?: ColumnOptions<TranslationOptions>) {
    super(TranslationOptions, {
      dataControlSettings: () => ({
        valueList: this.getOptions(),
        width: '150'
      })
    }, settingsOrCaption);
    if (!this.defs.caption)
      this.defs.caption = 'המערכת היא עבור';
  }

}
export const translationConfig = { activateTranslation: false, forWho: TranslationOptions.Families };