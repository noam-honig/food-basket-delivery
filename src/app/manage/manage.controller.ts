import { SendSmsUtils } from '../asign-family/send-sms-action';
import { ApplicationSettings } from './ApplicationSettings';

import { Remult, BackendMethod, ProgressListener, Controller, SqlDatabase, OmitEB, FieldMetadata, ControllerBase } from 'remult';

import { Roles } from '../auth/roles';

import { Families } from '../families/families';
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";

import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { FamilyStatus } from '../families/FamilyStatus';

import { GroupsValue } from './groups';
import { EmailSvc } from '../shared/utils';
import { Field, } from '../translate';
import { Phone } from '../model-shared/phone';
import { DeliveryImage, FamilyImage } from '../families/DeiveryImages';


export class ManageController {
    @BackendMethod({ allowed: Roles.admin })
    static async TestSendEmail(to: string, text: string, remult?: Remult) {
        return await EmailSvc.sendMail("test email", text, to, remult);
    }
    @BackendMethod({ allowed: Roles.admin, queue: true })
    static async deleteFamiliesOnServer(remult?: Remult, progress?: ProgressListener) {


        let i = 0;
        for await (const f of remult.repo(Families).query({
            where: { status: FamilyStatus.ToDelete },
            orderBy: { createDate: "desc" },
            progress
        })) {

            await ManageController.clearDataFromFamilyDeliveries(f.id, remult);
            await f.delete();
            i++;
        }
        return i;
    }
    static async clearDataFromFamilyDeliveries(familyId: string, remult: Remult) {
        var db = remult._dataSource as SqlDatabase;
        const sql = new SqlBuilder(remult);
        const fd = await SqlFor(remult.repo(FamilyDeliveries));

        const fdi = await SqlFor(remult.repo(DeliveryImage));
        const fi = await SqlFor(remult.repo(FamilyImage));
        await db.execute(await sql.delete(fdi, sql.build(fdi.deliveryId, sql.func(" in", sql.query({ from: fd, select: () => [fd.id], where: () => [fd.where({ family: familyId })] })))));
        await db.execute(await sql.delete(fi, fi.where({ familyId })))

        const set: [FieldMetadata, any][] = [];
        const fieldsToKeep: select<FamilyDeliveries> = {
            id: true,
            family: true
        };
        for (const field of fd.metadata.fields) {
            if ((field.valueType == String || field.valueType == Phone || field.valueType == GroupsValue) && !fieldsToKeep[field.key]) {
                set.push([field, "''"]);
            } else {
                //        console.log(field.key);
            }
        }
        await db.execute((await sql.update(fd, {
            set: () => set,
            where: () => [fd.where({ family: familyId })]
        })));
    }
}
declare type select<T> = { [Properties in keyof Partial<OmitEB<T>>]?: boolean; }

@Controller("sendTestSms")
export class SendTestSms extends ControllerBase {
    @Field({ translation: l => l.phone })
    phone: string;
    @Field({ translation: l => l.customSmsMessage })
    message: string;
    @BackendMethod({ allowed: Roles.admin })
    async sendTestMessage() {
        let settings = await ApplicationSettings.getAsync(this.remult);
        if (!settings.bulkSmsEnabled)
            throw "can only use this with bulk sms enabled";
        return await new SendSmsUtils().sendSms(this.phone, this.message, this.remult, undefined);
    }

}