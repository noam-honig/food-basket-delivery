import { Entity, StringColumn, NumberColumn } from "radweb";
import { GeocodeInformation, GetGeoInformation } from "../shared/googleApiHelpers";
import { evilStatics } from "../auth/evil-statics";
import { entityApiSettings, LoggedInCanViewButOnlyAdminUpdatesInsertsAndDeletes, entityWithApi, ApiAccess } from "../server/api-interfaces";
import { DataApiSettings } from "radweb/utils/server/DataApi";
import { ContextEntity,  Context } from "../shared/context";

export class ApplicationSettings extends ContextEntity<number> implements entityWithApi {

  id = new NumberColumn();
  organisationName = new StringColumn('שם הארגון');
  smsText = new StringColumn('תוכן הודעת SMS');
  logoUrl = new StringColumn('לוגו URL');
  address = new StringColumn("כתובת מרכז השילוח");
  addressApiResult = new StringColumn();
  private _lastString: string;
  private _lastGeo: GeocodeInformation;
  getGeocodeInformation() {
    if (this._lastString == this.addressApiResult.value)
      return this._lastGeo ? this._lastGeo : new GeocodeInformation();
    this._lastString = this.addressApiResult.value;
    return this._lastGeo = GeocodeInformation.fromString(this.addressApiResult.value);
  }


  constructor() {
    super( ApplicationSettings, 'ApplicationSettings')
    this.initColumns(this.id);
  }
  private static _settings: ApplicationSettings;
  static get(context: Context) {
    if (!this._settings) {
      this._settings = context.for(ApplicationSettings).create();
      context.for(ApplicationSettings).findFirst().then(s => this._settings = s);
    }
    return this._settings;
  }
  static async getAsync(context: Context): Promise<ApplicationSettings> {
    return (await context.for(ApplicationSettings).findFirst());
  }
  getDataApiSettings(): entityApiSettings {
    return {
      apiAccess: ApiAccess.all,
      apiSettings: authInfo => {
        return {
          allowUpdate: authInfo && authInfo.admin,
          onSavingRow: async as => {
            if (this.address.value != this.address.originalValue || !this.getGeocodeInformation().ok()) {
              let geo = await GetGeoInformation(this.address.value);
              this.addressApiResult.value = geo.saveToString();
              if (geo.ok()) {
              }
            }
          }
        } as DataApiSettings<ApplicationSettings>
      }
    }
  }
}