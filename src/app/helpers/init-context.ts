import {
  EntityFilter,
  FieldRef,
  IdFilter,
  remult,
  Remult,
  UserInfo,
  ValueFilter
} from 'remult'
import { BasketType } from '../families/BasketType'
import { DistributionCenters } from '../manage/distribution-centers'

import { Helpers } from './helpers'
import { GetDistanceBetween, Location } from '../shared/googleApiHelpers'
import { Roles } from '../auth/roles'
import { getLang, Sites } from '../sites/sites'
import { Language } from '../translate'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import {
  DataAreaFieldsSetting,
  GridSettings,
  RowButton
} from '../common-ui-elements/interfaces'
import { messageMerger } from '../edit-custom-message/messageMerger'

let i = 0

export const initConfig = {
  disableForTesting: false
}

export async function InitContext(remult: Remult, user?: UserInfo) {
  if (user === undefined) user = remult.user
  let defaultBasketType: BasketType
  remult.context.getSettings = () => ApplicationSettings.getAsync()
  remult.context.getUserDistributionCenter = () =>
    remult.repo(DistributionCenters).findId(remult.user?.distributionCenter)
  remult.context.getCurrentUser = () =>
    remult.repo(Helpers).findId(remult.user?.id)
  remult.context.defaultBasketType = async () => {
    if (defaultBasketType) return defaultBasketType
    await remult
      .repo(BasketType)
      .find({ orderBy: { id: 'asc' }, limit: 1 })
      .then((y) => {
        if (y.length > 0) defaultBasketType = y[0]
      })
    return defaultBasketType
  }
  remult.context.defaultDistributionCenter = async () =>
    await remult
      .repo(DistributionCenters)
      .findFirst(DistributionCenters.isActive)

  remult.context.findClosestDistCenter = async (
    loc: Location,
    centers?: DistributionCenters[]
  ) => {
    let result: DistributionCenters
    let dist: number
    if (!centers)
      centers = await remult
        .repo(DistributionCenters)
        .find({ where: DistributionCenters.isActive })
    for (const c of centers) {
      let myDist = GetDistanceBetween(c.addressHelper.location, loc)
      if (result === undefined || myDist < dist) {
        result = c
        dist = myDist
      }
    }
    return result
  }
  remult.context.filterCenterAllowedForUser = () => {
    if (!remult.authenticated()) return []
    else if (remult.isAllowed(Roles.admin)) {
      return undefined
    } else return { $id: [remult.user?.distributionCenter] }
  }
  remult.context.filterDistCenter = (
    distCenter
  ): IdFilter<DistributionCenters> => {
    if (distCenter == null) {
      return remult.context.filterCenterAllowedForUser()
    } else {
      if (
        remult.isAllowed(Roles.admin) ||
        distCenter.id == remult.user?.distributionCenter
      )
        return distCenter
    }
    return []
  }
  remult.context.lang = getLang()
}
export interface selectListItem<itemType = any> {
  name: string
  item: itemType
  selected?: boolean
}
export interface GridDialogArgs {
  title: string
  settings: GridSettings<any>
  stateName?: string
  ok?: () => void
  cancel?: () => void
  validate?: () => Promise<void>
  buttons?: button[]
}
export interface button {
  text: string
  click: (close: () => void) => void
  visible?: () => boolean
}
export interface InputAreaArgs {
  title?: string
  helpText?: string
  fields: DataAreaFieldsSetting<any>[]
  ok: () => void
  cancel?: () => void
  validate?: () => Promise<void>
  buttons?: button[]
  menu?: RowButton<any>[]
}
export interface UpdateFamilyDialogArgs {
  family?: import('../families/families').Families
  familyDelivery?: import('../families/FamilyDeliveries').FamilyDeliveries
  familyId?: string
  deliveryId?: string
  focusOnAddress?: boolean
  message?: string
  disableSave?: boolean
  userCanUpdateButDontSave?: boolean
  onSave?: () => void
  afterSave?: (args: {
    refreshDeliveryStatistics: boolean
    reloadDeliveries: boolean
  }) => void
}
export interface SelectHelperArgs {
  familyId?: string
  searchByDistance?: boolean
  hideRecent?: boolean
  location?: Location
  includeFrozen?: boolean
  searchClosestDefaultFamily?: boolean
  onSelect: (selectedValue: import('../helpers/helpers').HelpersBase) => void
  filter?: EntityFilter<
    import('../delivery-follow-up/HelpersAndStats').HelpersAndStats
  >
}
export interface UpdateGroupArgs {
  groups: string
  ok: (s: string) => void
}

export interface EditCustomMessageArgs {
  message: messageMerger
  templateText: string
  title: string
  helpText: string
  buttons: RowButton<{ templateText: string; close: VoidFunction }>[]
}

export interface UITools {
  editBlockedFamilies(helper: Helpers)
  YesNoPromise(question: string): Promise<Boolean>
  messageDialog(question: string): Promise<Boolean>
  Error(err: string): Promise<void>
  Info(message: string): void

  gridDialog(args: GridDialogArgs): Promise<void>
  inputAreaDialog(args: InputAreaArgs): Promise<void>
  selectValuesDialog<
    T extends {
      caption?: string
    }
  >(args: {
    values: T[]
    onSelect: (selected: T) => void
    title?: string
  }): Promise<void>

  doWhileShowingBusy<T>(what: () => Promise<T>): Promise<T>
  donotWait<T>(what: () => Promise<T>): Promise<T>
  navigateToComponent(component: any): void

  trackVolunteer(arg0: string)

  selectCompany(args: (selectedValue: string) => void): Promise<void>
  updateFamilyDialog(args: UpdateFamilyDialogArgs): Promise<void>
  updateGroup(args: UpdateGroupArgs): Promise<void>
  helperAssignment(
    helper: import('../helpers/helpers').HelpersBase
  ): Promise<void>
  selectHelper(args: SelectHelperArgs): Promise<void>
  editCustomMessageDialog(args: EditCustomMessageArgs): Promise<void>
  refreshFamiliesAndDistributionCenters(): void

  hasManyCenters: boolean
  getDistCenter(
    loc: Location
  ): Promise<import('../manage/distribution-centers').DistributionCenters>
  distCenter: import('../manage/distribution-centers').DistributionCenters
  filterDistCenter(): IdFilter<DistributionCenters>
}

export const evil: {
  YesNoPromise(question: string): Promise<Boolean>
} = {
  YesNoPromise: undefined
}

export async function createSiteContext(site: string) {
  let dp = Sites.getDataProviderForOrg(site)

  remult.dataProvider = dp
  Sites.setSiteToContext(site)
  await InitContext(remult, undefined)
}
declare module 'remult' {
  export interface RemultContext {
    getCurrentUser: () => Promise<Helpers>
    getUserDistributionCenter: () => Promise<DistributionCenters>
    defaultBasketType: () => Promise<BasketType>
    defaultDistributionCenter: () => Promise<DistributionCenters>
    findClosestDistCenter(
      loc: Location,
      centers?: DistributionCenters[]
    ): Promise<DistributionCenters>
    filterCenterAllowedForUser(): IdFilter<DistributionCenters>
    filterDistCenter(
      distCenter: DistributionCenters
    ): IdFilter<DistributionCenters>
    getSettings: () => Promise<
      import('../manage/ApplicationSettings').ApplicationSettings
    >
    lang: Language
    getSite(): string
    requestRefererOnBackend?: string
    requestUrlOnBackend?: string
    getOrigin(): string
  }
  export interface UserInfo {
    theHelperIAmEscortingId?: string
    escortedHelperName?: string
    distributionCenter?: string
  }
  export interface FieldOptions<entityType, valueType> {
    clickWithTools?: (
      e: entityType,
      c: FieldRef<entityType, valueType>,
      ui: UITools
    ) => void
    customInput?: (select: {
      addressInput: VoidFunction
      textArea: VoidFunction
    }) => void
    width?: string
  }
}
