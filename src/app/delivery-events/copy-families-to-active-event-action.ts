import { ServerAction } from "../auth/server-action";
import { DataApiRequest } from "radweb/utils/dataInterfaces1";
import { myAuthInfo } from "../auth/my-auth-info";
import {   DeliveryEvents, FamilyDeliveryEvents } from "../models";
import * as fetch from 'node-fetch';
import { foreachSync } from "../shared/utils";
import { evilStatics } from "../auth/evil-statics";
import { PostgresDataProvider } from "radweb/server";
import { Column } from "radweb";
import { Families } from "../families/families";
import { DeliveryStatus } from "../families/DeliveryStatus";


export interface InArgs {
    fromDeliveryEvent: string;
}
export interface OutArgs {


}


export class CopyFamiliesToActiveEventAction extends ServerAction<InArgs, OutArgs>{
    constructor() {
        super('CopyFamiliesToActiveEventAction');//required because of minification
    }
    protected async execute(info: InArgs, req: DataApiRequest<myAuthInfo>): Promise<OutArgs> {
        await (<PostgresDataProvider>evilStatics.dataSource).doInTransaction(async ds => {
            let currentEvent = new DeliveryEvents(ds);
            currentEvent = (await currentEvent.source.find({ where: currentEvent.isActiveEvent.isEqualTo(true) }))[0];
            let fde = new FamilyDeliveryEvents();
            await foreachSync(await fde.source.find({
                where: fde.deliveryEvent.isEqualTo(info.fromDeliveryEvent)
                    .and(fde.deliverStatus.IsDifferentFrom(DeliveryStatus.NotInEvent.id))
            }),
                async de => {
                    let f = new Families();
                    await f.source.find({ where: f.id.isEqualTo(de.family) }).then(async f => {
                        f[0].deliverStatus.listValue = DeliveryStatus.ReadyForDelivery;
                        f[0].basketType.value = de.basketType.value;
                        await f[0].doSave(req.authInfo);
                    });
                });

        });
        return {};

    }

}

