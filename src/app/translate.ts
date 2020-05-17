import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'translate' })
export class TranslatePipe implements PipeTransform {
  transform(value: string): string {

    return translate(value);
  }
}

export const translationConfig = {activateTranslation : false, forWho : 0};
var terms: { [key: string]: string } = {};

export function translate(s: string) {
  if (translationConfig.forWho == 0)
    return s;
  let r = terms[s];
  if (!r) {
    if (translationConfig.forWho == 1) {
      r = s.replace(/משפחה אחת/g, "תורם אחד")
        .replace(/משפחות חוזרות/g, 'תורמים חוזרים')
        .replace(/משפחות מיוחדות/g, "תורמים מיוחדים")
        .replace(/מש' הכי קרובה/g, 'תורם הכי קרוב')
        .replace(/משפחה כלשהי/g, 'תורם כלשהו')
        .replace(/משפחות/g, "תורמים")
        .replace(/משפחה/g,'תורם')
        .replace(/חדשה/g, 'חדש')
        .replace(/כפולות/g,'כפולים');
    }
    else if (translationConfig.forWho == 2) {
      r = s.replace(/משפחה אחת/g, "חייל אחד")
        .replace(/משפחות חוזרות/g, 'חיילים חוזרים')
        .replace(/משפחות מיוחדות/g, "חיילים מיוחדים")
        .replace(/מש' הכי קרובה/g, 'חייל הכי קרוב')
        .replace(/משפחה כלשהי/g, 'חייל כלשהו')
        .replace(/משפחות/g, "חיילים")
        .replace(/משפחה/g,'חייל')
        .replace(/חדשה/g, 'חדש')
        .replace(/כפולות/g,'כפולים');
      terms[s] = r;
    }
  }
  return r;
}