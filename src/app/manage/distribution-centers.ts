import { IdEntity, EntityClass, StringColumn, Context, IdColumn, ColumnOptions, AndFilter, BoolColumn } from "@remult/core";
import { GeocodeInformation, GetGeoInformation, GetDistanceBetween, Location, AddressApiResultColumn } from "../shared/googleApiHelpers";
import { HasAsyncGetTheValue, PhoneColumn } from "../model-shared/types";
import { Roles } from "../auth/roles";
import { HelperUserInfo } from "../helpers/helpers";
import { ApplicationSettings, getSettings } from "./ApplicationSettings";
import { getLang } from '../sites/sites';



@EntityClass
export class DistributionCenters extends IdEntity {


  name = new StringColumn({ caption: getLang(this.context).distributionCenterName });
  semel = new StringColumn({ caption: getLang(this.context).distributionCenterUniqueId });
  address = new StringColumn(getLang(this.context).deliveryCenterAddress);
  addressApiResult = new AddressApiResultColumn();
  comments = new StringColumn(getLang(this.context).distributionCenterComment);
  phone1 = new PhoneColumn(getLang(this.context).phone1);
  phone1Description = new StringColumn(getLang(this.context).phone1Description);
  phone2 = new PhoneColumn(getLang(this.context).phone2);
  phone2Description = new StringColumn(getLang(this.context).phone2Description);
  isFrozen = new BoolColumn(getLang(this.context).frozen);
  
 
  openWaze() {
    //window.open('https://waze.com/ul?ll=' + this.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address.value) + 'export &navigate=yes', '_blank');
    window.open('waze://?ll=' + this.addressApiResult.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address.value) + '&navigate=yes');
  }


  constructor(private context: Context) {
    super({
      name: "DistributionCenters",
      allowApiRead: context.isSignedIn(),
      allowApiInsert: Roles.admin,
      allowApiUpdate: Roles.admin,


      saving: async () => {
        if (context.onServer) {
          if (this.address.value != this.address.originalValue || !this.addressApiResult.ok()) {
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
export const allCentersToken = '<allCenters>';
export function filterCenterAllowedForUser(center: IdColumn, context: Context) {
  if (context.isAllowed(Roles.admin)) {
    return undefined;
  } else if (context.isSignedIn())
    return center.isEqualTo((<HelperUserInfo>context.user).distributionCenter);
}

export class DistributionCenterId extends IdColumn implements HasAsyncGetTheValue {

  filter(distCenter: string): import("@remult/core").FilterBase {
    if (distCenter != allCentersToken)
      return new AndFilter(this.isAllowedForUser(), this.isEqualTo(distCenter));
    return this.isAllowedForUser();
  }
  isAllowedForUser(): import("@remult/core").FilterBase {
    return filterCenterAllowedForUser(this, this.context);

  }
  checkAllowedForUser() {
    if (this.context.isAllowed(Roles.admin)) {
      return true;
    } else if (this.context.isAllowed(Roles.distCenterAdmin))
      return (<HelperUserInfo>this.context.user).distributionCenter == this.value;
    return false;
  }
  async getRouteStartGeo() {
    let d = await this.context.for(DistributionCenters).lookupAsync(this);
    if (d.addressApiResult.value && d.address.value && d.addressApiResult.ok())
      return d.addressApiResult.getGeocodeInformation();
    return (await ApplicationSettings.getAsync(this.context)).addressApiResult.getGeocodeInformation();
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
            if (showAllOption)
              x.splice(0, 0, { caption: 'כל הרשימות', id: allCentersToken })
            return x;
          })
          , width: '150'
        }),
      defaultValue: context.user ? (<HelperUserInfo>context.user).distributionCenter : ''
    });
    if (!this.defs.caption)
      this.defs.caption = getLang(this.context).distributionList;
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

export async function findClosestDistCenter(loc: Location, context: Context, centers?: DistributionCenters[]) {
  let result: string;
  let dist: number;
  if (!centers)
    centers = await context.for(DistributionCenters).find({where: c => c.isFrozen.isEqualTo(false)});
  for (const c of centers) {
    let myDist = GetDistanceBetween(c.addressApiResult.location(), loc);
    if (result===undefined || myDist < dist) {
      result = c.id.value;
      dist = myDist;
    }
  }
  return result;
}