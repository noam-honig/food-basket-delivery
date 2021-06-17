import { IdEntity, Context, AndFilter, Entity, filterOf, filterOptions, Filter } from "@remult/core";
import { GetDistanceBetween, Location, AddressHelper } from "../shared/googleApiHelpers";
import { Phone } from "../model-shared/phone";

import { Roles } from "../auth/roles";
import { HelpersBase, HelperUserInfo } from "../helpers/helpers";
import { ApplicationSettings, getSettings } from "./ApplicationSettings";
import { getLang } from '../sites/sites';
import { DataControl, getValueList } from "@remult/angular";
import { use, FieldType, Field } from "../translate";
import { u } from "../model-shared/UberContext";



@FieldType<DistributionCenters>({
  valueConverter: {
    toJson: x => x != undefined ? x : '',
    fromJson: x => x || x == '' ? x : null
  },
  displayValue: (e, v) => v ? v.name : '',
  translation: l => l.distributionList

})
@DataControl<any, DistributionCenters>({
  hideDataOnInput: true,
  valueList: context => {
    return DistributionCenters.getValueList(context)
  },
  width: '150',
})

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
  static async getDefault(context: Context): Promise<DistributionCenters> {
    return (await context.for(DistributionCenters).findFirst(x => DistributionCenters.isActive(x)));
  }
  static async fromId(distCenter: string, context: Context) {
    if (distCenter != null)
      return await context.for(DistributionCenters).getCachedByIdAsync(distCenter);
  }
  static toId(distCenter: DistributionCenters) {
    return distCenter ? distCenter.id : null;
  }


  constructor(private context: Context) {
    super();
  }

  @Field({ translation: l => l.distributionCenterName })
  name: string;
  @Field({ translation: l => l.distributionCenterUniqueId })
  semel: string;
  @Field()
  addressApiResult: string;
  @Field({
    translation: l => l.deliveryCenterAddress
  })
  address: string;
  addressHelper = new AddressHelper(this.context, () => this.$.address, () => this.$.addressApiResult);
  @Field({ translation: l => l.distributionCenterComment })
  comments: string;
  @Field({ translation: l => l.phone1 })
  phone1: Phone;
  @Field({ translation: l => l.phone1Description })
  phone1Description: string;
  @Field({ translation: l => l.phone2 })
  phone2: Phone;
  @Field({ translation: l => l.phone2Description })
  phone2Description: string;
  @Field({ translation: l => l.frozen })
  isFrozen: boolean;
  @Field()
  archive: boolean;
  createUser: HelpersBase;

  static isActive(e: filterOf<DistributionCenters>) {
    return e.isFrozen.isEqualTo(false).and(e.archive.isEqualTo(false));
  }


  openWaze() {
    this.addressHelper.openWaze();
  }


  matchesCurrentUser() {
    return this.id == (<HelperUserInfo>this.context.user).distributionCenter;
  }

  async SendMessageToBrowser(message: string, context: Context) {

    await (await import('../families/families')).Families.SendMessageToBrowsers(message, context, this.id);
  }


  checkAllowedForUser() {
    if (this.context.isAllowed(Roles.admin)) {
      return true;
    } else if (this.context.isAllowed(Roles.distCenterAdmin))
      return (<HelperUserInfo>this.context.user).distributionCenter == this.id;
    return false;
  }
  async getRouteStartGeo() {

    if (this.addressApiResult && this.address && this.addressHelper.ok())
      return this.addressHelper.getGeocodeInformation();
    return (await ApplicationSettings.getAsync(this.context)).addressHelper.getGeocodeInformation();
  }
  static async getValueList(context: Context, showAllOptions = false) {
    let r = await getValueList<DistributionCenters>(context.for(DistributionCenters), {
      where: c => c.archive.isEqualTo(false)
    })
    if (showAllOptions) {
      r.splice(0, 0, { caption: 'כל הרשימות', id: null })
    }
    return r;

  }




}









