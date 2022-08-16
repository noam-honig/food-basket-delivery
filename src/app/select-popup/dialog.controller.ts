import { BackendMethod, remult, Remult } from "remult";

export class DialogController {
    @BackendMethod({ allowed: true })
    static async doLog(s: string) {
        console.log(s);
    }
    @BackendMethod({ allowed: true })
    static async LogWithUser(s: string) {
        console.log({ message: s, user: remult.user});
    }
}