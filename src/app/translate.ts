import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'translate'})
export class TranslatePipe implements PipeTransform {
  transform(value: string): string {

    return translate(value);;
  }
}

export const translationConfig = {activateTranslation : false}
var terms:{[key:string]:string}={};

export function translate(s: string) {
    if (!translationConfig.activateTranslation)
        return s;
    let r = terms[s];
    if (!r){
        r =  s.replace(/משפחה אחת/g,"חייל אחד")
        .replace(/משפחות חוזרות/g,'חיילים חוזרים')
        .replace(/משפחות מיוחדות/g,"חיילים מיוחדים")
        .replace(/מש' הכי קרובה/g,'חייל הכי קרוב')
        .replace(/משפחה כלשהי/g,'חייל כלשהו')
        .replace(/משפחות/g,"חיילים")
        .replace(/משפחה/g,'חייל');
        terms[s]=r;
    }
    return r;
    

}