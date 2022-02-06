import { Component, OnInit, Input, Output, EventEmitter, NgZone } from '@angular/core';

import * as copy from 'copy-to-clipboard';
import { DialogService } from '../select-popup/dialog';
import { extractError } from "../select-popup/extractError";
import { DeliveryStatus } from '../families/DeliveryStatus';
import { Remult, FieldRef, BackendMethod, Allow } from 'remult';

import { use } from '../translate';
import { GetVolunteerFeedback } from '../update-comment/update-comment.component';


import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { ApplicationSettings } from '../manage/ApplicationSettings';

import { Helpers } from '../helpers/helpers';
import { getLang, Sites } from '../sites/sites';
import { Roles } from '../auth/roles';
import { Phone } from "../model-shared/phone";
import { Families } from '../families/families';
import { UserFamiliesList } from '../my-families/user-families';
import { openDialog } from '@remult/angular';
import { relativeDateName } from '../model-shared/types';
import { ImageInfo } from '../images/images.component';
import { SendSmsAction } from '../asign-family/send-sms-action';
import { PreviousDeliveryCommentsComponent } from '../previous-delivery-comments/previous-delivery-comments.component';
import { quantityHelper } from '../families/BasketType';

export class FamilyInfoController {
    static createPhoneProxyOnServer: (phone1: string, phone2: string) => Promise<{ phone: string, session: string }>;
    @BackendMethod({ allowed: Allow.authenticated })
    static async privateCall(deliveryId: string, remult?: Remult): Promise<{
        phone?: string,
        error?: string
    }> {
        let cleanPhone = '';
        let reqInfo = Sites.getOrganizationFromContext(remult) + "/proxy/" + remult.user.id + " => " + deliveryId;
        try {
            let settings = await ApplicationSettings.getAsync(remult);
            if (!settings.usePhoneProxy)
                throw "פרוקסי לא מופעל לסביבה זו";
            let fd = await remult.repo(ActiveFamilyDeliveries).findId(deliveryId);
            if (!fd) throw "משלוח לא נמצא";
            if (!fd.courier.isCurrentUser() && !remult.isAllowed([Roles.admin, Roles.distCenterAdmin]))
                throw "אינך רשאי לחייג למשפחה זו";

            cleanPhone = Phone.fixPhoneInput(fd.phone1.thePhone, remult);
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
    static async ShowFamilyTz(deliveryId: string, remult?: Remult) {
        let s = await ApplicationSettings.getAsync(remult);
        if (!s.showTzToVolunteer)
            return "";
        var d = await remult.repo(ActiveFamilyDeliveries).findId(deliveryId);
        if (!d)
            return;
        if (!d.courier.isCurrentUser() && !remult.isAllowed([Roles.admin, Roles.distCenterAdmin]))
            return "";
        var f = await remult.repo(Families).findId(d.family);
        if (!f)
            return "";
        return f.name + ":" + f.tz;

    }
}