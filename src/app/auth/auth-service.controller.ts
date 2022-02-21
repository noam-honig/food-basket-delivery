
import { extractError } from "../select-popup/extractError";
import { Helpers } from "../helpers/helpers";
import { Allow, BackendMethod, Remult, UserInfo } from 'remult';
import { LoginResponse } from "./login-response";
import { Roles } from "./roles";
import { Sites } from "../sites/sites";
import { ApplicationSettings } from "../manage/ApplicationSettings";
import { Phone } from "../model-shared/phone";

export class AuthServiceController {
    @BackendMethod({ allowed: true })
    static async loginFromSms(key: string, remult?: Remult) {

        let r: LoginResponse = { valid: false };
        let h = await remult.repo(Helpers).findFirst({ shortUrlKey: key });

        if (h) {
            r.phone = h.phone.thePhone;
            let info = await buildHelperUserInfo(h, remult);
            let userIsOk = false;
            if (remult.user && JSON.stringify(remult.user.roles) == JSON.stringify(info.roles) && remult.user.id == info.id)
                userIsOk = true;
            if (!h.realStoredPassword && !h.userRequiresPassword())
                userIsOk = true;



            if (userIsOk) {
                h.lastSignInDate = new Date();
                remult.setUser(info);

                await h.save();
                return {
                    valid: true,
                    authToken: await buildToken(info, (await remult.getSettings())),
                    requirePassword: false
                } as LoginResponse
            }

        }
        return r;
    }
    @BackendMethod({ allowed: true })
    static async login(args: loginArgs, remult?: Remult): Promise<loginResult> {

        let r: loginResult = {};
        let settings = (await remult.getSettings());
        let h = await remult.repo(Helpers).findFirst({ phone: new Phone(args.phone) });
        if (!h) {
            r.newUser = true;
            return r;
        }


        let userHasPassword = h.realStoredPassword.length > 0;
        if (userHasPassword && !args.password) {
            r.needPasswordToLogin = true;
            return r;
        }
        if (userHasPassword && args.password) {
            if (!await Helpers.verifyHash(args.password, h.realStoredPassword)) {
                r.invalidPassword = true;
                return r;
            }

        }

        let result = await buildHelperUserInfo(h, remult);


        remult.setUser(result);



        if (args.newPassword) {
            if (args.password == args.newPassword) {
                r = {
                    requiredToSetPassword: true,
                    requiredToSetPasswordReason: settings.lang.newPasswordMustBeNew
                }
                return r;
            }
            h.password = args.newPassword;
            try {
                await h.save();
                args.password = args.newPassword;
            }
            catch (error) {
                let message = h.$.password.error;
                if (!message)
                    message = extractError(error);
                r.requiredToSetPassword = true;
                r.requiredToSetPasswordReason = message;
                return r;
            }
        }

        if (userHasPassword && settings.daysToForcePasswordChange > 0 && (!h.passwordChangeDate || new Date().getTime() > h.passwordChangeDate.getTime() + 86400000 * settings.daysToForcePasswordChange)) {
            r.requiredToSetPassword = true;
            r.requiredToSetPasswordReason = settings.lang.passwordExpired;
            return r;
        }




        if (h.userRequiresPassword()) {
            let ok = true;
            if (!userHasPassword && !args.newPassword) {
                r.requiredToSetPassword = true;
                r.requiredToSetPasswordReason = settings.lang.adminRequireToSetPassword;
                if (!(h.admin || h.distCenterAdmin || h.labAdmin))
                    settings.lang.indieRequireToSetPassword;
                ok = false;

            }
            if (settings.requireEULA && !h.EULASignDate && !args.EULASigned) {
                r.requiredToSignEULA = true;
                ok = false;
            }
            if (!ok)
                return r;
        }




        if (args.EULASigned && !h.EULASignDate) {
            h.EULASignDate = new Date();
            await h.save();
        }


        h.lastSignInDate = new Date();
        await h.save();
        return { authToken: await buildToken(result, settings) };
    }
    @BackendMethod({ allowed: Allow.authenticated, blockUser: false })
    static async renewToken(remult?: Remult) {
        if (!remult.authenticated())
            return undefined;
        let h = await remult.repo(Helpers).findId(remult.user.id);
        if (!h)
            return undefined;
        let newInfo = await buildHelperUserInfo(h, remult);


        return buildToken(newInfo, (await remult.getSettings()));

    }

    static async signJwt(result: any, timeToDisconnect: number) {
        let jwt = (await import('jsonwebtoken'));
        if (timeToDisconnect)
            return jwt.sign(result, process.env.TOKEN_SIGN_KEY, { expiresIn: timeToDisconnect * TIMEOUT_MULTIPLIER_IN_SECONDS + 60/*to have one more minute on top of the user disconnect time */ });
        else
            return jwt.sign(result, process.env.TOKEN_SIGN_KEY);

    }
}
async function buildHelperUserInfo(h: Helpers, remult: Remult) {
    let result: UserInfo = {
        id: h.id,
        roles: [Sites.getOrgRole(remult)],
        name: h.name,
        distributionCenter: h.distributionCenter?.id,
        theHelperIAmEscortingId: h.theHelperIAmEscorting?.id,
        escortedHelperName: h.theHelperIAmEscorting ? (h.theHelperIAmEscorting).name : ''
    };
    if (h.admin) {
        if (Sites.isOverviewSchema(remult))
            result.roles.push(Roles.overview);
        else {
            result.roles.push(Roles.admin);
            result.roles.push(Roles.distCenterAdmin);
            result.roles.push(Roles.familyAdmin);
        }
    }
    if (h.distCenterAdmin) {
        result.roles.push(Roles.distCenterAdmin);
    }
    if (h.familyAdmin) {
        result.roles.push(Roles.familyAdmin);
        result.roles.push(Roles.distCenterAdmin);
    }
    if ((await remult.getSettings()).isSytemForMlt) {
        if (h.labAdmin || h.admin)
            result.roles.push(Roles.lab);
        if (h.isIndependent || h.admin || h.distCenterAdmin)
            result.roles.push(Roles.indie);
    }


    return result;
}

async function buildToken(result: UserInfo, settings: ApplicationSettings) {
    return AuthServiceController.signJwt(result, settings.timeToDisconnect);
}

export interface loginResult {
    authToken?: string,
    needPasswordToLogin?: boolean,
    invalidPassword?: boolean,
    requiredToSetPassword?: boolean,
    requiredToSetPasswordReason?: string,
    requiredToSignEULA?: boolean,
    newUser?: boolean
}
export interface loginArgs {
    phone: string,
    password: string,
    newPassword: string,
    EULASigned: boolean

}

export const TIMEOUT_MULTIPLIER_IN_SECONDS = 60;