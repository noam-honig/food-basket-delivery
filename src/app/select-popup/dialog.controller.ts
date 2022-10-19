import { BackendMethod, remult } from "remult";
import { AMessageChannel } from "../../../../radweb/projects/core/src/live-query/LiveQuery";
import { Roles } from "../auth/roles";

export class DialogController {
    @BackendMethod({ allowed: true })
    static async doLog(s: string) {
        console.log(s);
    }
    @BackendMethod({ allowed: true })
    static async LogWithUser(s: string) {
        console.log({ message: s, user: remult.user });
    }
}


export const StatusChangeChannel = new AMessageChannel<string>(() => remult.context.getSite() + ":statusChange", () => remult.isAllowed(Roles.admin));