import { BackendMethod, remult } from 'remult'
import { Roles } from '../auth/roles'
import { createSiteContext } from '../helpers/init-context'
import { Helpers } from '../helpers/helpers'
import { doOnRemoteHagai } from '../overview/remoteHagai'

export class SiteOverviewController {
  @BackendMethod({ allowed: Roles.overview })
  static async siteInfo(site: string, isRemote?: boolean): Promise<Manager[]> {
    if (isRemote) {
      return doOnRemoteHagai(
        async (remoteRemult) =>
          remoteRemult.call(SiteOverviewController.siteInfo, undefined, site),
        true
      )
    } else await createSiteContext(site)
    return (
      await remult
        .repo(Helpers)
        .find({ where: { admin: true }, orderBy: { lastSignInDate: 'desc' } })
    )
      .map(({ name, phone, lastSignInDate }) => ({
        name,
        phone: phone?.thePhone,
        lastSignInDate
      }))
      .sort((a, b) => b.lastSignInDate?.valueOf() - a.lastSignInDate?.valueOf())
  }
}
export interface Manager {
  name: string
  phone: string
  lastSignInDate: Date
}
