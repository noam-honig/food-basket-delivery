import { Entity, StringColumn, NumberColumn } from "radweb";
import { GeocodeInformation, GetGeoInformation } from "../shared/googleApiHelpers";
import { evilStatics } from "../auth/evil-statics";
import { entityApiSettings, LoggedInCanViewButOnlyAdminUpdatesInsertsAndDeletes, entityWithApi, ApiAccess } from "../server/api-interfaces";
import { DataApiSettings } from "radweb/utils/server/DataApi";

export class ApplicationSettings extends Entity<number> implements entityWithApi {

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
    super(() => new ApplicationSettings(), evilStatics.dataSource, 'ApplicationSettings')
    this.initColumns(this.id);
  }
  private static _settings: ApplicationSettings;
  static get() {
    if (!this._settings) {
      this._settings = new ApplicationSettings();
      this._settings.source.find({}).then(s => this._settings = s[0]);
    }
    return this._settings;
  }
  static async getAsync(): Promise<ApplicationSettings> {
    let a = new ApplicationSettings();
    return (await a.source.find({}))[0];
  }
  getDataApiSettings(): entityApiSettings {
    return {
      apiAccess: ApiAccess.all,
      apiSettings: authInfo => {
        return {
          allowUpdate: authInfo && authInfo.admin,
          onSavingRow: async as => {
            if (as.address.value != as.address.originalValue || !as.getGeocodeInformation().ok()) {
              let geo = await GetGeoInformation(as.address.value);
              as.addressApiResult.value = geo.saveToString();
              if (geo.ok()) {
              }
            }
          }
        } as DataApiSettings<ApplicationSettings>
      }
    }
  }
}