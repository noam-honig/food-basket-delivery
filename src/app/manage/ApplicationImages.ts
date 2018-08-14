import { Entity, StringColumn, NumberColumn } from 'radweb';
import { evilStatics } from '../auth/evil-statics';
import { entityApiSettings, entityWithApi } from "../server/api-interfaces";

export class ApplicationImages extends Entity<number> implements entityWithApi {
  id = new NumberColumn();
  base64Icon = new StringColumn("איקון דף base64");
  base64PhoneHomeImage = new StringColumn("איקון דף הבית בטלפון base64");
  constructor() {
    super(() => new ApplicationImages(), evilStatics.dataSource, 'ApplicationImages');
    this.initColumns(this.id);
  }
  private static _settings: ApplicationImages;
  static get() {
    if (!this._settings) {
      this._settings = new ApplicationImages();
      this._settings.source.find({}).then(s => this._settings = s[0]);
    }
    return this._settings;
  }
  static async getAsync(): Promise<ApplicationImages> {
    let a = new ApplicationImages();
    return (await a.source.find({}))[0];
  }
  getDataApiSettings(): entityApiSettings {
    return {
      apiSettings: authInfo => {
        return {
          allowUpdate: true,
        }
      }
    }
  }
}