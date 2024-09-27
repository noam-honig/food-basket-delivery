import { HelpersBase } from './helpers'
import { Location } from '../shared/googleApiHelpers'
import { isPhoneSubstring } from '../model-shared/phone'
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats'
import { remult } from 'remult'

export interface helperInList {
  helper?: HelpersBase
  helperId: string
  name: string
  phone: string
  distance?: number
  location?: Location
  assignedDeliveries?: number
  totalRecentDeliveries?: number
  isBusyVolunteer?: string
  lastCompletedDeliveryString?: string
  fixedFamilies?: number
  distanceFrom?: string
  hadProblem?: boolean
}

export type IdentifierType = 'phone' | 'name'

export function mapHelpers<hType extends HelpersBase>(
  helpers: hType[],
  getFamilies: (h: hType) => number
): helperInList[] {
  return helpers.map(
    (h) =>
      ({
        helper: h,
        helperId: h.id,
        name: h.name,
        phone: h.phone?.displayValue,
        assignedDeliveries: getFamilies(h)
      } as helperInList)
  )
}

export function getIdentifierType(searchString: string): IdentifierType {
  return isPhoneSubstring(searchString) ? 'phone' : 'name'
}

export async function searchHelpersByIdentifier(searchString: string, limit: number = 20): Promise<helperInList[]> {
  return mapHelpers(
    await remult.repo(HelpersAndStats).find({
      orderBy: { name: 'asc' },
      limit,
      where: {
        [getIdentifierType(searchString)]: { $contains: searchString },
        $and: [
          HelpersBase.active,
        ]
      }
    }),
    (x) => x.deliveriesInProgress
  )
}
