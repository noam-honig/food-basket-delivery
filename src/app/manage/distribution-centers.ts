import { IdEntity, Context, StoreAsStringValueConverter, AndFilter, Column, Entity, filterOf, filterOptions, Filter, ColumnSettings, Storable } from "@remult/core";
import { GeocodeInformation, GetGeoInformation, GetDistanceBetween, Location, AddressHelper } from "../shared/googleApiHelpers";
import { Phone } from "../model-shared/Phone";
import { LookupValue } from "../model-shared/LookupValue";
import { Roles } from "../auth/roles";
import { HelperId, HelperUserInfo } from "../helpers/helpers";
import { ApplicationSettings, getSettings } from "./ApplicationSettings";
import { getLang } from '../sites/sites';
import { DataControl, getValueList } from "../../../../radweb/projects/angular";
import { use } from "../translate";




@Entity<DistributionCenters>({
  key: "DistributionCenters",
  allowApiRead: context => context.isSignedIn(),
  allowApiInsert: Roles.admin,
  allowApiUpdate: Roles.admin,
  defaultOrderBy: self => self.name,


  saving: async (self) => {
    if (self.context.onServer) {
      await self.addressHelper.updateApiResultIfChanged();
    }
  }
})
export class DistributionCenters extends IdEntity {

  constructor(private context: Context) {
    super();
  }

  @Column({ caption: use.language.distributionCenterName })
  name: string;
  @Column({ caption: use.language.distributionCenterUniqueId })
  semel: string;
  @Column()
  addressApiResult: string;
  @Column({
    caption: use.language.deliveryCenterAddress
  })
  address: string;
  addressHelper = new AddressHelper(this.context, () => this.$.address, () => this.$.addressApiResult);
  @Column({ caption: use.language.distributionCenterComment })
  comments: string;
  @Column({ caption: use.language.phone1 })
  phone1: Phone;
  @Column({ caption: use.language.phone1Description })
  phone1Description: string;
  @Column({ caption: use.language.phone2 })
  phone2: Phone;
  @Column({ caption: use.language.phone2Description })
  phone2Description: string;
  @Column({ caption: use.language.frozen })
  isFrozen: boolean;
  @Column()
  archive: boolean;
  createUser:HelperId

  static isActive(e: filterOf<DistributionCenters>) {
    return e.isFrozen.isEqualTo(false).and(e.archive.isEqualTo(false));
  }


  openWaze() {
    this.addressHelper.openWaze();
  }




}
export const allCentersToken = '<allCenters>';
export function filterCenterAllowedForUser(center: filterOptions<DistributionCenterId>, context: Context) {
  if (context.isAllowed(Roles.admin)) {
    return undefined;
  } else if (context.isSignedIn())
    return center.isEqualTo(new DistributionCenterId((<HelperUserInfo>context.user).distributionCenter, context));
}
export function filterDistCenter(distCenterColumn: filterOptions<DistributionCenterId>, distCenter: DistributionCenterId, context: Context): Filter {
  let allowed = filterCenterAllowedForUser(distCenterColumn, context);
  if (!distCenter.isAllCentersToken())
    return new AndFilter(allowed, distCenterColumn.isEqualTo(distCenter));
  return allowed;
}



@Storable<DistributionCenterId>({
  valueConverter: c => new StoreAsStringValueConverter<DistributionCenterId>(x => x.id, x => new DistributionCenterId(x, c)),
  displayValue: (e, v) =>v? v.item.name:'',
  defaultValue: (e, context) => new DistributionCenterId(context.user ? (<HelperUserInfo>context.user).distributionCenter : '', context)
})
@DataControl<any, DistributionCenterId>({
  getValue: (e, val) => val.displayValue,
  hideDataOnInput: true,
  valueList: context => DistributionCenterId.getValueList(context),
  width: '150',
})
export class DistributionCenterId extends LookupValue<DistributionCenters>{
  static allCentersToken(context: Context): DistributionCenterId {
    return new DistributionCenterId(allCentersToken, context)
  }

  static forCurrentUser(context: Context): DistributionCenterId {
    return new DistributionCenterId((<HelperUserInfo>context.user).distributionCenter, context);
  }
  matchesCurrentUser() {
    return this.id == (<HelperUserInfo>this.context.user).distributionCenter;
  }
  evilGetId(): string {
    return this.id;
  }
  async SendMessageToBrowser(message: string, context: Context) {
    
    await ( await import('../families/families')).Families.SendMessageToBrowsers(message, context, this.id);
  }
  isAllCentersToken() {
    return this.id == allCentersToken;
  }
  constructor(id: string, private context: Context) {
    super(id, context.for(DistributionCenters));
  }
  checkAllowedForUser() {
    if (this.context.isAllowed(Roles.admin)) {
      return true;
    } else if (this.context.isAllowed(Roles.distCenterAdmin))
      return (<HelperUserInfo>this.context.user).distributionCenter == this.id;
    return false;
  }
  async getRouteStartGeo() {
    let d = await this.waitLoad();
    if (d.addressApiResult && d.address && d.addressHelper.ok())
      return d.addressHelper.getGeocodeInformation();
    return (await ApplicationSettings.getAsync(this.context)).addressHelper.getGeocodeInformation();
  }
  static async getValueList(context: Context, showAllOptions = false) {
    return [];
    let r = await getValueList<DistributionCenters>(context.for(DistributionCenters), {
      where: c => c.archive.isEqualTo(false)
    })
    if (showAllOptions) {
      r.splice(0, 0, { caption: 'כל הרשימות', id: allCentersToken })
    }
    return r;

  }
}




export async function findClosestDistCenter(loc: Location, context: Context, centers?: DistributionCenters[]) {
  let result: DistributionCenterId;
  let dist: number;
  if (!centers)
    centers = await context.for(DistributionCenters).find({ where: c => DistributionCenters.isActive(c) });
  for (const c of centers) {
    let myDist = GetDistanceBetween(c.addressHelper.location(), loc);
    if (result === undefined || myDist < dist) {
      result = new DistributionCenterId(c.id, context);
      dist = myDist;
    }
  }
  return result;
}