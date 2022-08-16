import { IdEntity, Remult, Entity, Allow, isBackend, EntityFilter, remult } from "remult";
import { AddressHelper } from "../shared/googleApiHelpers";
import { Phone } from "../model-shared/phone";

import { Roles } from "../auth/roles";
import { HelpersBase } from "../helpers/helpers";
import { ApplicationSettings } from "./ApplicationSettings";
import { DataControl, getEntityValueList } from "@remult/angular/interfaces";
import { use, FieldType, Field } from "../translate";



@FieldType<DistributionCenters>({
  valueConverter: {
    toDb: x => x == null ? '' : x
  },
  displayValue: (e, v) => v ? v.name : '',
  translation: l => l.distributionList

})
@DataControl<any, DistributionCenters>({
  hideDataOnInput: true,
  valueList: remult => {
    return DistributionCenters.getValueList(remult)
  },
  width: '150',
})

@Entity<DistributionCenters>("DistributionCenters", {
  allowApiRead: Allow.authenticated,
  allowApiInsert: Roles.admin,
  allowApiUpdate: Roles.admin,
  defaultOrderBy: { name: "asc" },


  saving: async (self) => {
    if (isBackend()) {
      await self.addressHelper.updateApiResultIfChanged();
    }
  }
})
export class DistributionCenters extends IdEntity {
  @Field({ translation: l => l.distributionCenterName })
  name: string;
  @Field({ translation: l => l.distributionCenterUniqueId })
  semel: string;
  @Field()
  addressApiResult: string;
  @Field({
    translation: l => l.deliveryCenterAddress, customInput: i => i.addressInput()
  })
  address: string;
  addressHelper = new AddressHelper(() => this.$.address, () => this.$.addressApiResult);
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


  static isActive: EntityFilter<DistributionCenters> = {
    isFrozen: false,
    archive: false
  }


  openWaze() {
    this.addressHelper.openWaze();
  }


  matchesCurrentUser() {
    return this.id == (remult.user).distributionCenter;
  }

  async SendMessageToBrowser(message: string, remult: Remult) {

    await (await import('../families/families')).Families.SendMessageToBrowsers(message, remult, this.id);
  }


  checkAllowedForUser() {
    if (remult.isAllowed(Roles.admin)) {
      return true;
    } else if (remult.isAllowed(Roles.distCenterAdmin))
      return (remult.user).distributionCenter == this.id;
    return false;
  }
  async getRouteStartGeo() {

    if (this.addressApiResult && this.address && this.addressHelper.ok)
      return this.addressHelper.getGeocodeInformation;
    return (await ApplicationSettings.getAsync(remult)).addressHelper.getGeocodeInformation;
  }
  async getRouteStartLocation() {

    if (this.addressApiResult && this.address && this.addressHelper.ok)
      return this.addressHelper.location;
    return (await ApplicationSettings.getAsync(remult)).addressHelper.location;
  }
  static async getValueList(remult: Remult, showAllOptions = false) {
    let r = await getEntityValueList<DistributionCenters>(remult.repo(DistributionCenters), {
      where: { archive: false }
    })
    if (showAllOptions) {
      r.splice(0, 0, { caption: use.language.allDistributionLists, id: null })
    }
    return r;

  }




}









