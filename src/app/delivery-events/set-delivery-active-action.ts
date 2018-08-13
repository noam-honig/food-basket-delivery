import { ServerAction } from "../auth/server-action";
import { DataApiRequest } from "radweb/utils/dataInterfaces1";
import { myAuthInfo } from "../auth/my-auth-info";
import { Families, DeliveryStatus,  DeliveryEvents, FamilyDeliveryEvents, CallStatus } from "../models";
import * as fetch from 'node-fetch';
import { foreachSync } from "../shared/utils";
import { evilStatics } from "../auth/evil-statics";
import { PostgresDataProvider } from "../../../node_modules/radweb/server";
import { Column } from "../../../node_modules/radweb";


export interface InArgs {
    newDeliveryEventId: string;
}
export interface OutArgs {


}


export class SetDeliveryActiveAction extends ServerAction<InArgs, OutArgs>{
    constructor() {
        super('SetDeliveryActiveAction');//required because of minification
    }
    static SendMessageToBrowsers = (s: string) => { };
    protected async execute(info: InArgs, req: DataApiRequest<myAuthInfo>): Promise<OutArgs> {
        await (<PostgresDataProvider>evilStatics.dataSource).doInTransaction(async ds => {

            let currentEvent = new DeliveryEvents(ds);
            currentEvent = (await currentEvent.source.find({ where: currentEvent.isActiveEvent.isEqualTo(true) }))[0];
            currentEvent.isActiveEvent.value = false;
            await currentEvent.save();
            let newEvent = (await currentEvent.source.find({ where: currentEvent.id.isEqualTo(info.newDeliveryEventId) }))[0];
            newEvent.isActiveEvent.value = true;
            await newEvent.save();
            await foreachSync(await new Families(ds).source.find({}),
                async f => {
                    let cols: Column<any>[] = [
                        f.basketType,
                        f.callComments,
                        f.callHelper,
                        f.callStatus,
                        f.callTime,
                        f.courier,
                        f.courierAssignUser,
                        f.courierAssingTime,
                        f.deliverStatus,
                        f.deliveryStatusDate,
                        f.deliveryStatusUser,
                        f.courierComments,
                        f.routeOrder];

                    {
                        let currentFamilyEvent = new FamilyDeliveryEvents();
                        await currentFamilyEvent.source.find({
                            where: currentFamilyEvent.family.isEqualTo(f.id).and(
                                currentFamilyEvent.deliveryEvent.isEqualTo(currentEvent.id))
                        }).then(f => {
                            if (f.length > 0)
                                currentFamilyEvent = f[0];
                        });

                        if (!currentFamilyEvent.isNew() || f.deliverStatus.listValue != DeliveryStatus.NotInEvent) {
                            currentFamilyEvent.family.value = f.id.value;
                            currentFamilyEvent.deliveryEvent.value = currentEvent.id.value;
                            cols.forEach(c => {
                                currentFamilyEvent.__getColumn(c).value = f.__getColumn(c).value;
                            });
                            await currentFamilyEvent.save();
                        }
                    }
                    {

                        f.callComments.value = '';
                        f.callHelper.value = '';
                        f.callStatus.listValue = CallStatus.NotYet;
                        f.callTime.value = '';
                        f.courier.value = '';
                        f.courierAssignUser.value = '';
                        f.courierAssingTime.value = '';
                        f.deliverStatus.listValue = DeliveryStatus.NotInEvent;
                        f.deliveryStatusDate.value = '';
                        f.deliveryStatusUser.value = '';
                        f.courierComments.value = '';
                        f.routeOrder.value = 0;
                        let newFamilyEvent = new FamilyDeliveryEvents();
                        await newFamilyEvent.source.find({
                            where: newFamilyEvent.family.isEqualTo(f.id).and(
                                newFamilyEvent.deliveryEvent.isEqualTo(newEvent.id))
                        }).then(r => {
                            if (r.length > 0) {
                                cols.forEach(c => {
                                    f.__getColumn(c).value = r[0].__getColumn(c).value;
                                });
                            }
                        });


                    }


                    await f.save();
                });
            SetDeliveryActiveAction.SendMessageToBrowsers('הוחלף אירוע פעיל ל' + newEvent.name.value);
        });

        return {};

    }

}

