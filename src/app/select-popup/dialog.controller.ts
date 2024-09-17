import { Allow, BackendMethod, remult } from 'remult'
import { SubscriptionChannel } from 'remult'

export class DialogController {
  @BackendMethod({ allowed: true })
  static async doLog(s: string) {
    console.log(s)
  }
  @BackendMethod({ allowed: true })
  static async LogWithUser(s: string) {
    console.log({ message: s, user: remult.user })
  }
}
export const StatusChangeChannel = new SubscriptionChannel<string>(
  'statusChange'
)
