
import { Roles } from '../auth/roles';

import { BackendMethod, Filter, remult } from 'remult';

import { groupStats } from './family-deliveries-stats';

import { FamilyDeliveries, ActiveFamilyDeliveries } from '../families/FamilyDeliveries';

import { Helpers } from '../helpers/helpers';

import { getDb, SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Phone } from "../model-shared/phone";
import { Groups } from '../manage/groups';

import { DistributionCenters } from '../manage/distribution-centers';
import { quantityHelper, totalItem } from '../families/BasketType';


export class FamilyDeliveriesController {
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async getGroups(dist: DistributionCenters, readyOnly = false) {
        let pendingStats = [];
        let result: groupStats[] = [];
        await remult.repo(Groups).find({
            limit: 1000,
            orderBy: { name: 'asc' }
        }).then(groups => {
            for (const g of groups) {
                let x: groupStats = {
                    name: g.name,
                    totalReady: 0
                };
                result.push(x);
                pendingStats.push(remult.repo(ActiveFamilyDeliveries).count({
                    groups: { $contains: x.name },
                    distributionCenter: remult.context.filterDistCenter(dist),
                    $and: [readyOnly ? FamilyDeliveries.readyFilter() : undefined]
                }).then(r => x.totalReady = r));

            }
        });
        await Promise.all(pendingStats);
        return result;
    }
    @BackendMethod({ allowed: Roles.lab })
    static async getDeliveriesByPhone(phoneNumIn: string) {
        let phoneNum = new Phone(phoneNumIn);
        let sql1 = new SqlBuilder();

        let fd = SqlFor(remult.repo(FamilyDeliveries));
        let result: string[] = [];
        let courier = await (await remult.repo(Helpers).findFirst({ phone: phoneNum }));

        for (const d of (await getDb().execute(await sql1.query({
            from: fd,
            where: () => [
                (courier != undefined ? fd.where({ courier, $and: [FamilyDeliveries.active] }) :
                    sql1.or(
                        fd.where({ phone1: phoneNum, $and: [FamilyDeliveries.active] }),
                        fd.where({ phone2: phoneNum, $and: [FamilyDeliveries.active] }),
                        fd.where({ phone3: phoneNum, $and: [FamilyDeliveries.active] }),
                        fd.where({ phone4: phoneNum, $and: [FamilyDeliveries.active] }))
                )
            ],
            select: () => [
                sql1.columnWithAlias(fd.id, "id"),
            ],
        }))).rows) {
            result.push(d.id)
        }

        return await (await remult.repo(FamilyDeliveries).find({ where: { id: result } })).map(x => x._.toApiJson());
    }
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async getTotalItems(filter: any) {
        const q = new quantityHelper();
        const baskets: totalItem[] = [];
        for await (const fd of remult.repo(ActiveFamilyDeliveries).query({
            where: await Filter.entityFilterFromJson<ActiveFamilyDeliveries>(remult.repo(ActiveFamilyDeliveries).metadata, filter)
        })) {
            q.parseComment(fd.basketType?.whatToTake, fd.quantity);
            q.parseComment(fd.items);
            let b = baskets.find(b => b.name === fd.basketType?.name);
            if (!b)
                baskets.push(b = { name: fd.basketType?.name, quantity: 0 })
            b.quantity += fd.quantity;
        }
        return {
            items: q.items,
            baskets
        };
    }

}