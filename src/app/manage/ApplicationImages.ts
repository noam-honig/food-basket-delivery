import { Entity, StringColumn, NumberColumn } from 'radweb';
import { evilStatics } from '../auth/evil-statics';
import { entityApiSettings, entityWithApi } from "../server/api-interfaces";
import { ContextEntity, Context } from '../shared/context';

export class ApplicationImages extends ContextEntity<number> implements entityWithApi {
  id = new NumberColumn();
  base64Icon = new StringColumn("איקון דף base64");
  base64PhoneHomeImage = new StringColumn("איקון דף הבית בטלפון base64");
  constructor() {
    super( ApplicationImages, 'ApplicationImages');
    this.initColumns(this.id);
  }
  private static _settings: ApplicationImages;
  static get(context: Context) {
    if (!this._settings) {
      this._settings = context.create(ApplicationImages);
      context.for(ApplicationImages).findFirst(undefined).then(s => this._settings = s);
    }
    return this._settings;
  }
  static async getAsync(context: Context): Promise<ApplicationImages> {

    return (await context.for(ApplicationImages).findFirst(undefined));
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