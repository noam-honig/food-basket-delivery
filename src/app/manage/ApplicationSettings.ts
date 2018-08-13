import { Entity, StringColumn, NumberColumn } from "radweb";
import { GeocodeInformation, GetGeoInformation } from "../shared/googleApiHelpers";
import { evilStatics } from "../auth/evil-statics";

export class ApplicationSettings extends Entity<number>{
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
      async doSaveStuff() {
        if (this.address.value != this.address.originalValue || !this.getGeocodeInformation().ok()) {
          let geo = await GetGeoInformation(this.address.value);
          this.addressApiResult.value = geo.saveToString();
          if (geo.ok()) {
          }
        }
      }
  
      constructor() {
        super(() => new ApplicationSettings(), evilStatics.openedDataApi, 'ApplicationSettings')
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
    static async getAsync(): Promise < ApplicationSettings > {
        let a = new ApplicationSettings();
        return(await a.source.find({}))[0];
    }
  }