import { BackendMethod } from "remult";

export class DialogController {
    @BackendMethod({ allowed: true })
    static async doLog(s: string) {
        console.log(s);
    }
}