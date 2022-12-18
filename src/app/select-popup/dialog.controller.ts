import { Allow, BackendMethod, remult } from "remult";
import { AMessageChannel } from "remult/live-query";
import * as ably from 'ably';
export class DialogController {

    @BackendMethod({ allowed: true })
    static async doLog(s: string) {
        console.log(s);
    }
    @BackendMethod({ allowed: true })
    static async LogWithUser(s: string) {
        console.log({ message: s, user: remult.user });
    }
    @BackendMethod({ allowed: Allow.authenticated })
    static async getAblyToken() {
        const a = new ably.Realtime.Promise(process.env.ABLY_KEY);
        const site = remult.context.getSite() + ':';
        return await a.auth.createTokenRequest({
            capability: {
                [site + StatusChangeChannel.channelKey]: ["subscribe"],
                [site + `users:*`]: ["subscribe"]
            }
        });
    }
}
export const StatusChangeChannel = new AMessageChannel<string>("statusChange");