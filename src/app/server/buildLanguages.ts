import fs from 'fs'
import { Language, TranslationOptions } from '../translate'
import { config } from 'dotenv'

import request from 'request'

async function loadTranslationXlsx(fileName: string, language: string) {
  let XLSX = await import('xlsx')
  var wb = XLSX.readFile(fileName)
  var sheet = wb.Sheets[wb.SheetNames[0]]
  let data = XLSX.utils.sheet_to_json(sheet, {
    raw: false,
    dateNF: 'DD-MMM-YYYY',
    header: 1,
    defval: ''
  })
  let known = loadLangFile(language)
  for (let index = 1; index < data.length; index++) {
    const row = data[index]
    let key = row[0]
    let k = known[key]
    if (k) {
      let val = row[1].trim()
      if (val != k.google.trim() && val) {
        k.custom = val
      } else {
      }
    } else {
      console.error(key + ' not found')
    }
  }
  saveLangFile(language, known)
}
function loadLangFile(filename: string) {
  return JSON.parse(
    fs.readFileSync('./src/app/languages/' + filename + '.json').toString()
  )
}
function saveLangFile(filename: string, data: any) {
  fs.writeFileSync(
    './src/app/languages/' + filename + '.json',
    JSON.stringify(data, undefined, 2)
  )
}
let googleNotWorking = false
export async function buildLanguageFiles() {
  config()

  for (const lang of [
    TranslationOptions.southAfrica,
    //TranslationOptions.chile,
    //TranslationOptions.italy,
    TranslationOptions.donors,
    TranslationOptions.soldiers,
    TranslationOptions.sderot
  ]) {
    let fileAndClassName = lang.args.languageCode
    if (lang.args.languageFile) fileAndClassName = lang.args.languageFile

    let known = {}
    try {
      known = loadLangFile(fileAndClassName)
    } catch {}
    let knownEnglish = {}
    if (lang.args.basedOnLang) {
      knownEnglish = loadLangFile(lang.args.basedOnLang)
    }
    let translate = async (term: string) => {
      if (googleNotWorking) return undefined
      try {
        return await googleTranslate(
          term,
          lang.args.languageCode,
          !lang.args.basedOnLang ? 'iw' : lang.args.basedOnLang
        )
      } catch (err) {
        console.log(err)
        googleNotWorking = true
        return undefined
      }
    }
    if (lang.args.translateFunction)
      translate = async (x) => lang.args.translateFunction(x)

    let result = ''
    let l = new Language()
    let keys: translationEntry[] = []
    for (const key in l) {
      if (l.hasOwnProperty(key)) {
        let knownVal: translation = known[key]
        let knownEnglishItem: translation = knownEnglish[key]
        let valueInEnglish: string = undefined
        if (knownEnglishItem) {
          valueInEnglish = knownEnglishItem.custom
          if (!valueInEnglish) valueInEnglish = knownEnglishItem.google
          //If has no custom and english has custom and was changed
          if (
            knownVal &&
            !knownVal.custom &&
            knownEnglishItem.custom &&
            knownEnglishItem.custom != knownVal.valueInEnglish
          )
            knownVal = undefined
        }
        if (!knownVal) {
          let val = l[key]
          if (valueInEnglish) val = valueInEnglish

          const element: string[] = val.split('\n')
          let transIsBroken = false
          for (let index = 0; index < element.length; index++) {
            const term = element[index]
            let trans = await translate(term)
            if (trans == undefined) {
              transIsBroken = true
              break
            }
            console.log(term)
            console.log(trans)
            element[index] = trans
          }
          knownVal = {
            google: element.join('\\n'),
            valueInCode: l[key],
            valueInEnglish
          }

          if (!transIsBroken) known[key] = knownVal
          else knownVal.google = key
        }
        knownVal.valueInCode = l[key]
        knownVal.valueInEnglish = valueInEnglish
        let v = knownVal.google
        if (knownVal.custom) v = knownVal.custom
        if (key == 'languageCode' || key == 'languageCodeHe') {
          if (lang.args.languageCode) v = lang.args.languageCode
        }
        let r = v
        if (r.includes("'")) r = '"' + r.replace(/"/g, '\\"') + '"'
        else r = "'" + r + "'"
        result += '  ' + key + ' = ' + r + ';\n'
        keys.push({ key: key, value: v, valueInHebrew: l[key] })
      }
    }
    keys.sort((a, b) => a.key.localeCompare(b.key))

    let json = {}
    for (const x of keys) {
      json[x.key] = known[x.key]
    }
    saveLangFile(fileAndClassName, json)
    fs.writeFileSync(
      './src/app/languages/' + fileAndClassName + '.ts',
      'import { Language } from "../translate";\nexport class ' +
        fileAndClassName +
        ' {\n' +
        result +
        '}'
    )
  }
}

interface translationEntry {
  key: string
  value: string
  valueInHebrew: string
}
interface translation {
  google: string
  custom?: string
  valueInCode: string
  valueInEnglish: string
}

async function googleTranslate(s: string, toLang: string, fromLang: string) {
  return new Promise<string>((resolve, reject) => {
    request(
      'https://www.googleapis.com/language/translate/v2?key=' +
        process.env.google_key +
        '&source=' +
        fromLang +
        '&target=' +
        toLang +
        '&format=text',
      {
        method: 'post',
        body: JSON.stringify({ q: s })
      },
      (err, res, body) => {
        let theBody = JSON.parse(body)
        let x = theBody.data
        if (x) resolve(x.translations[0].translatedText)
        else {
          console.error(theBody, err)
          reject(err)
        }
      }
    )
  })
}

buildLanguageFiles()
