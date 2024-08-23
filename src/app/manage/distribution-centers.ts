import {
  IdEntity,
  Entity,
  Allow,
  isBackend,
  EntityFilter,
  remult
} from 'remult'
import { AddressHelper } from '../shared/googleApiHelpers'
import { Phone } from '../model-shared/phone'

import { Roles } from '../auth/roles'
import { HelpersBase } from '../helpers/helpers'
import { ApplicationSettings } from './ApplicationSettings'
import {
  DataControl,
  getEntityValueList
} from '../common-ui-elements/interfaces'
import { use, FieldType, Field, Fields } from '../translate'
import { MyIdEntity } from '../families/MyIdEntity'

@FieldType<DistributionCenters>({
  valueConverter: {
    toDb: (x) => (x == null ? '' : x)
  },
  displayValue: (e, v) => (v ? v.name : ''),
  translation: (l) => l.distributionList
})
@DataControl<any, DistributionCenters>({
  hideDataOnInput: true,
  valueList: (remult) => {
    return DistributionCenters.getValueList()
  },
  width: '150'
})
@Entity<DistributionCenters>('DistributionCenters', {
  allowApiRead: Allow.authenticated,
  allowApiInsert: Roles.admin,
  allowApiUpdate: Roles.admin,
  defaultOrderBy: { name: 'asc' },

  saving: async (self) => {
    if (isBackend()) {
      await self.addressHelper.updateApiResultIfChanged()
    }
  }
})
export class DistributionCenters extends MyIdEntity {
  @Fields.string({ translation: (l) => l.distributionCenterName })
  name: string
  @Fields.string({ translation: (l) => l.distributionCenterUniqueId })
  semel: string
  @Fields.string()
  addressApiResult: string
  @Fields.string({
    translation: (l) => l.deliveryCenterAddress,
    customInput: (i) => i.addressInput()
  })
  address: string
  addressHelper = new AddressHelper(
    () => this.$.address,
    () => this.$.addressApiResult
  )
  @Fields.string({ translation: (l) => l.distributionCenterComment })
  comments: string
  @Field(() => Phone, { translation: (l) => l.phone1 })
  phone1: Phone
  @Fields.string({ translation: (l) => l.phone1Description })
  phone1Description: string
  @Field(() => Phone, { translation: (l) => l.phone2 })
  phone2: Phone
  @Fields.string({ translation: (l) => l.phone2Description })
  phone2Description: string
  @Fields.boolean({ translation: (l) => l.frozen })
  isFrozen: boolean
  @Fields.boolean()
  archive: boolean

  createUser: HelpersBase

  static isActive: EntityFilter<DistributionCenters> = {
    isFrozen: false,
    archive: false
  }

  openWaze() {
    this.addressHelper.openWaze()
  }

  matchesCurrentUser() {
    return this.id == remult.user?.distributionCenter
  }

  async SendMessageToBrowser(message: string) {
    await (
      await import('../families/families')
    ).Families.SendMessageToBrowsers(message, this.id)
  }

  checkAllowedForUser() {
    if (remult.isAllowed(Roles.admin)) {
      return true
    } else if (remult.isAllowed(Roles.distCenterAdmin))
      return remult.user?.distributionCenter == this.id
    return false
  }
  async getRouteStartGeo() {
    if (this.addressApiResult && this.address && this.addressHelper.ok)
      return this.addressHelper.getGeocodeInformation
    return (await ApplicationSettings.getAsync()).addressHelper
      .getGeocodeInformation
  }
  async getRouteStartLocation() {
    if (this.addressApiResult && this.address && this.addressHelper.ok)
      return this.addressHelper.location
    return (await ApplicationSettings.getAsync()).addressHelper.location
  }
  static async getValueList(showAllOptions = false) {
    let r = await getEntityValueList<DistributionCenters>(
      remult.repo(DistributionCenters),
      {
        where: { archive: false },
        cache: true
      }
    )
    if (showAllOptions && !r.find((y) => y.id === null)) {
      r.splice(0, 0, { caption: use.language.allDistributionLists, id: null })
    }
    return r
  }
}
