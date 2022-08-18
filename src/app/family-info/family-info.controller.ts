
import { extractError } from "../select-popup/extractError";
import {  BackendMethod, Allow, SqlDatabase, remult } from 'remult';

import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { ApplicationSettings } from '../manage/ApplicationSettings';

import { Helpers } from '../helpers/helpers';
import { Sites } from '../sites/sites';
import { Roles } from '../auth/roles';
import { Phone } from "../model-shared/phone";
import { Families } from '../families/families';


export class FamilyInfoController {
    static createPhoneProxyOnServer: (phone1: string, phone2: string) => Promise<{ phone: string, session: string }>;
    @BackendMethod({ allowed: Allow.authenticated })
    static async privateCall(deliveryId: string): Promise<{
        phone?: string,
        error?: string
    }> {
        let cleanPhone = '';
        let reqInfo = Sites.getOrganizationFromContext() + "/proxy/" + remult.user.id + " => " + deliveryId;
        try {
            let settings = await ApplicationSettings.getAsync();
            if (!settings.usePhoneProxy)
                throw "פרוקסי לא מופעל לסביבה זו";
            let fd = await remult.repo(ActiveFamilyDeliveries).findId(deliveryId);
            if (!fd) throw "משלוח לא נמצא";
            if (!fd.courier.isCurrentUser() && !remult.isAllowed([Roles.admin, Roles.distCenterAdmin]))
                throw "אינך רשאי לחייג למשפחה זו";

            cleanPhone = Phone.fixPhoneInput(fd.phone1.thePhone);
            if (!cleanPhone) return { error: "למשפחה זו לא מעודכן טלפון" };
            if (cleanPhone.startsWith('0'))
                cleanPhone = cleanPhone.substring(1);
            cleanPhone = "+972" + cleanPhone;
            let h = await remult.repo(Helpers).findId(remult.user.id);
            if (!h)
                throw "מתנדב לא נמצא";
            let vPhone = h.phone.thePhone;
            if (vPhone.startsWith('0'))
                vPhone = vPhone.substring(1);
            vPhone = "+972" + vPhone;


            let r = await FamilyInfoController.createPhoneProxyOnServer(cleanPhone, vPhone);

            console.log(reqInfo + " (" + r.phone + "," + r.session + ")");
            return r;
        }
        catch (err) {
            console.error(reqInfo, err, "phone:" + cleanPhone);
            return { error: "תקלה בשירות הטלפונים: " + extractError(err) }
        }

    }
    @BackendMethod({ allowed: Allow.authenticated })
    static async ShowFamilyTz(deliveryId: string) {
        let s = await ApplicationSettings.getAsync();
        if (!s.showTzToVolunteer)
            return "";
        var d = await remult.repo(ActiveFamilyDeliveries).findId(deliveryId);
        if (!d)
            return;
        if (!d.courier.isCurrentUser() && !remult.isAllowed([Roles.admin, Roles.distCenterAdmin]))
            return "";
        
        var f = await Families.getSpecificFamilyWithoutUserRestrictionsBackendOnly(d.family);
        if (!f)
            return "";
        return f.name + ":" + f.tz;

    }
}

/*
1.	Make sure volunteer admin can’t change dist center.
2.	Verify that family image is restricted to current dist list
3.	Make sure that show tz works for volunteer.
*/