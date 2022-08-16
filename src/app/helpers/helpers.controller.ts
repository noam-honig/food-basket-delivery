
import { Helpers } from './helpers';

import { BackendMethod, remult } from 'remult';
import { Remult } from 'remult';

import { Roles } from '../auth/roles';
import { ApplicationSettings } from '../manage/ApplicationSettings';

import { Sites } from '../sites/sites';
import { SendSmsUtils } from '../asign-family/send-sms-action';

import { getLang } from '../sites/sites';



export class HelpersController {

    @BackendMethod({ allowed: Roles.admin })
    static async resetPassword(helperId: string) {

        await remult.repo(Helpers).query({ where: { id: helperId } }).forEach(async h => {
            h.realStoredPassword = '';
            await h.save();
        });
    }
    @BackendMethod({ allowed: Roles.admin })
    static async invalidatePassword(helperId: string) {

        await remult.repo(Helpers).query({ where: { id: helperId } }).forEach(async h => {
            h.passwordChangeDate = new Date(1901, 1, 1);
            await h.save();
        });
    }

    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async sendInvite(helperId: string) {
        let h = await remult.repo(Helpers).findId(helperId);
        if (!h)
            return getLang(remult).unfitForInvite;
        if (!(h.admin || h.distCenterAdmin))
            return getLang(remult).unfitForInvite;
        let url = remult.context.getSettings() + '/' + Sites.getOrganizationFromContext(remult);
        let s = await ApplicationSettings.getAsync(remult);
        let hasPassword = h.password && h.password.length > 0;
        let message = getLang(remult).hello + ` ${h.name}
  `+ getLang(remult).welcomeTo + ` ${s.organisationName}.
  `+ getLang(remult).pleaseEnterUsing + `
  ${url}
  `;
        if (!hasPassword) {
            message += getLang(remult).enterFirstTime
        }
        await new SendSmsUtils().sendSms(h.phone.thePhone, message, h);
        return getLang(remult).inviteSentSuccesfully
    }

    @BackendMethod({ allowed: Roles.admin })
    static async clearCommentsOnServer(remult?: Remult) {
        for await (const h of remult.repo(Helpers).query({ where: { eventComment: { "!=": "" } } })) {
            h.eventComment = '';
            await h.save();
        }
    }

    @BackendMethod({ allowed: Roles.admin })
    static async clearEscortsOnServer(remult?: Remult) {
        for await (const h of remult.repo(Helpers).query()) {
            h.escort = null;
            h.needEscort = false;
            h.theHelperIAmEscorting = null;
            await h.save();
        }
    }
}