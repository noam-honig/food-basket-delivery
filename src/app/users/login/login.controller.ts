import { BackendMethod, Remult } from 'remult';
import { Helpers } from '../../helpers/helpers';
import { Phone } from "../../model-shared/phone";

export class LoginController {
    @BackendMethod({ allowed: true })
    static async registerNewUser(phone: string, name: string, remult?: Remult) {
        let h = remult.repo(Helpers).create();
        h.phone = new Phone(phone);
        h.name = name;
        await h.save();
    }
}