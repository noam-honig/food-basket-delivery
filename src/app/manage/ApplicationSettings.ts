import { StringColumn, NumberColumn } from "radweb";
import { GeocodeInformation, GetGeoInformation } from "../shared/googleApiHelpers";
import { ContextEntity, Context, EntityClass } from "../shared/context";
import { PhoneColumn } from "../model-shared/types";
@EntityClass
export class ApplicationSettings extends ContextEntity<number>  {

  id = new NumberColumn();
  organisationName = new StringColumn('שם הארגון');
  smsText = new StringColumn('תוכן הודעת SMS');
  logoUrl = new StringColumn('לוגו URL');
  address = new StringColumn("כתובת מרכז השילוח");
  commentForSuccessDelivery = new StringColumn('הודעה למשנע כאשר נמסר בהצלחה');
  commentForProblem = new StringColumn('הודעה למשנע כאשר יש בעיה');
  messageForDoneDelivery = new StringColumn('הודעה למשנע כאשר סיים את כל המשפחות');
  helpText = new StringColumn('למי המשנע מתקשר כשיש לו בעיה');
  helpPhone = new PhoneColumn('טלפון עזרה למשנע');
  addressApiResult = new StringColumn();
  private _lastString: string;
  private _lastGeo: GeocodeInformation;
  getGeocodeInformation() {
    if (this._lastString == this.addressApiResult.value)
      return this._lastGeo ? this._lastGeo : new GeocodeInformation();
    this._lastString = this.addressApiResult.value;
    return this._lastGeo = GeocodeInformation.fromString(this.addressApiResult.value);
  }


  constructor(context: Context) {
    super( {
      name: 'ApplicationSettings',
      allowApiRead: true,
      allowApiUpdate: context.isAdmin(),
      onSavingRow: async () => {
        if (context.onServer) {
          if (this.address.value != this.address.originalValue || !this.getGeocodeInformation().ok()) {
            let geo = await GetGeoInformation(this.address.value);
            this.addressApiResult.value = geo.saveToString();
            if (geo.ok()) {
            }
          }
        }
      }
    })
  }

  static get(context: Context) {
    return context.for(ApplicationSettings).lookup(app => app.id.isEqualTo(1));

  }
  static async getAsync(context: Context): Promise<ApplicationSettings> {
    return (await context.for(ApplicationSettings).findFirst());
  }

}