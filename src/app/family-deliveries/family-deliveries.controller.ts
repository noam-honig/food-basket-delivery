
import { Roles } from '../auth/roles';

import { Remult, BackendMethod, SqlDatabase } from 'remult';

import { groupStats } from './family-deliveries-stats';

import { FamilyDeliveries, ActiveFamilyDeliveries } from '../families/FamilyDeliveries';

import { Helpers } from '../helpers/helpers';

import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Phone } from "../model-shared/phone";
import { Groups } from '../manage/groups';

import { DistributionCenters } from '../manage/distribution-centers';


export class FamilyDeliveriesController {
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async getGroups(dist: DistributionCenters, readyOnly = false, remult?: Remult) {
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
                    distributionCenter: remult.state.filterDistCenter(dist),
                    $and: [readyOnly ? FamilyDeliveries.readyFilter() : undefined]
                }).then(r => x.totalReady = r));

            }
        });
        await Promise.all(pendingStats);
        return result;
    }
    @BackendMethod({ allowed: Roles.lab })
    static async getDeliveriesByPhone(phoneNumIn: string, remult?: Remult, db?: SqlDatabase) {
        let phoneNum = new Phone(phoneNumIn);
        let sql1 = new SqlBuilder(remult);

        let fd = SqlFor(remult.repo(FamilyDeliveries));
        let result: string[] = [];
        let courier = await (await remult.repo(Helpers).findFirst({ phone: phoneNum }));

        for (const d of (await db.execute(await sql1.query({
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

}