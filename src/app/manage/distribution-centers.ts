import { IdEntity, EntityClass, StringColumn, Context, IdColumn, ColumnOptions } from "@remult/core";
import { GeocodeInformation, GetGeoInformation } from "../shared/googleApiHelpers";
import { HasAsyncGetTheValue } from "../model-shared/types";
import { Roles } from "../auth/roles";
import { HelperUserInfo } from "../helpers/helpers";
import { ApplicationSettings } from "./ApplicationSettings";
import { Families } from "../families/families";


@EntityClass
export class DistributionCenters extends IdEntity {


  name = new StringColumn({ caption: "שם" });
  semel = new StringColumn({ caption: "סמל", allowApiUpdate: Roles.admin });
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

  constructor(context: Context) {
    super({
      name: "DistributionCenters",
      allowApiRead: context.isSignedIn(),
      allowApiInsert: Roles.admin,
      allowApiUpdate: Roles.distCenterAdmin,
      apiDataFilter: () => filterCenterAllowedForUser(this.id, context),

      savingRow: async () => {
        if (context.onServer) {
          if (this.address.value != this.address.originalValue || !this.getGeocodeInformation().ok()) {
            let geo = await GetGeoInformation(this.address.value, context);
            this.addressApiResult.value = geo.saveToString();
            if (geo.ok()) {
            }
          }
        }
      }
    });
  }

}
function filterCenterAllowedForUser(center: IdColumn, context: Context) {
  if (context.isAllowed(Roles.admin)) {
    return undefined;
  } else if (context.isSignedIn())
    return center.isEqualTo((<HelperUserInfo>context.user).distributionCenter);
}

export class DistributionCenterId extends IdColumn implements HasAsyncGetTheValue {
  isAllowedForUser(): import("@remult/core").FilterBase {
    return filterCenterAllowedForUser(this, this.context);

  }
  async getRouteStartGeo() {
    let d = await this.context.for(DistributionCenters).lookupAsync(this);
    if (d.addressApiResult.value && d.address.value)
      return d.getGeocodeInformation();
    return (await ApplicationSettings.getAsync(this.context)).getGeocodeInformation();
  }

  constructor(private context: Context, settingsOrCaption?: ColumnOptions<string>, showAllOption?: boolean) {
    super(settingsOrCaption, {
      dataControlSettings: () =>
        ({
          valueList: this.context.for(DistributionCenters).getValueList({
            orderBy: (f: DistributionCenters) => {
              return [{ column: f.name }];
            }
          }).then(x => {
             x.splice(0, 0, { caption: 'כל הנקודות', id: Families.allCentersToken })
             return x;
          })
          , width: '150'
        }),
      defaultValue: context.user ? (<HelperUserInfo>context.user).distributionCenter : ''
    });
    if (!this.defs.caption)
      this.defs.caption = 'נקודת חלוקה';
  }
  get displayValue() {
    return this.context.for(DistributionCenters).lookup(this).name.value;
  }
  async getTheValue() {
    let r = await this.context.for(DistributionCenters).lookupAsync(this);
    if (r && r.name && r.name.value)
      return r.name.value;
    return '';
  }
}
