import { Remult, BackendMethod, SqlDatabase, ValueConverters } from 'remult';



import { Roles } from '../auth/roles';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { Families } from '../families/families';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { FamilyStatus } from '../families/FamilyStatus';
import { Helpers } from '../helpers/helpers';
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { RegisterURL, urlDbOperator } from '../resgister-url/regsiter-url';


export class WeeklyReportMltController {
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async getEquipmentStatusTotals(fromDate?: string, toDate?: string, remult?: Remult, db?: SqlDatabase) {
        let totalPerBasket: { URL: string, basketType: string, total: number, added: number, collected: number, received: number }[] = [];
        var fromDateDate = ValueConverters.DateOnly.fromJson(fromDate);
        var toDateDate = ValueConverters.DateOnly.fromJson(toDate);

        let fd = SqlFor(remult.repo(FamilyDeliveries));
        let u = SqlFor(remult.repo(RegisterURL));

        let sql = new SqlBuilder(remult);
        sql.addEntity(fd, "fd")

        let q = await sql.build(sql.query({
            select: () => [
                sql.build('grouping(', fd.basketType, ') basketGroup'),
                fd.basketType,
                sql.build('grouping(', u.prettyName, ') URLGroup'),
                u.prettyName,
                sql.build('sum (', sql.case([{ when: [fd.where({ deliverStatus: DeliveryStatus.isNotProblem() })], then: fd.quantity }], 0), ') total'),
                sql.build('sum (', sql.case([{ when: [fd.where({ deliverStatus: DeliveryStatus.isNotProblem(), createDate: { "<=": toDateDate, ">": fromDateDate } })], then: fd.quantity }], 0), ') added'),
                sql.build('sum (', sql.case([{ when: [fd.where({ deliverStatus: DeliveryStatus.isSuccess(), createDate: { "<=": toDateDate, ">": fromDateDate } })], then: fd.quantity }], 0), ') collected'),
                sql.build('sum (', sql.case([{ when: [fd.where({ ...FamilyDeliveries.notActive, deliverStatus: DeliveryStatus.isSuccess(), createDate: { "<=": toDateDate, ">": fromDateDate } })], then: fd.quantity }], 0), ') received'),
            ],
            from: fd,
            innerJoin: () => [
                { to: u, on: () => [sql.build(urlDbOperator('(select f.custom1 from Families f where fd.family=f.id limit 1)'), ' like ', u.URL)] }
            ],
            where: () => ['true']
        }), ' group by cube(', fd.basketType, ', ', u.prettyName, ')');

        let baskets = await db.execute(q);
        return baskets.rows;
    }


    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async getVolunteersData(fromDate?: string, toDate?: string, remult?: Remult, db?: SqlDatabase) {
        var fromDateDate = ValueConverters.DateOnly.fromJson(fromDate);
        var toDateDate = ValueConverters.DateOnly.fromJson(toDate);

        let h = SqlFor(remult.repo(Helpers));

        let u = SqlFor(remult.repo(RegisterURL));

        let sql = new SqlBuilder(remult);

        let q = await sql.build(sql.query({
            select: () => [
                sql.build('grouping(', u.prettyName, ') URLGroup'),
                u.prettyName,
                sql.build('count (*) total'),
                sql.build('sum (', sql.case([{ when: [h.where({ createDate: { "<=": toDateDate, ">": fromDateDate } })], then: 1 }], 0), ') added'),
            ],
            from: h,
            innerJoin: () => [{ to: u, on: async () => [sql.build(urlDbOperator(await h.referredBy.getDbName()), ' like ', u.URL)] }],
            where: () => [h.where({ archive: false })]
        }), ' group by cube(', u.prettyName, ')'
        );

        return (await db.execute(q)).rows;
    }


    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async getDonorsData(fromDate?: string, toDate?: string, remult?: Remult, db?: SqlDatabase) {
        var fromDateDate = ValueConverters.DateOnly.fromJson(fromDate);
        var toDateDate = ValueConverters.DateOnly.fromJson(toDate);

        let u = SqlFor(remult.repo(RegisterURL));
        let f = SqlFor(remult.repo(Families));

        let sql = new SqlBuilder(remult);

        let q = await sql.build(sql.query({
            select: () => [
                sql.build('grouping(', u.prettyName, ') URLGroup'),
                u.prettyName,
                sql.build('count (*) total'),
                sql.build('sum (', sql.case([{ when: [f.where({ createDate: { "<=": toDateDate, ">": fromDateDate } })], then: 1 }], 0), ') added'),
            ],
            from: f,
            innerJoin: async () => [{ to: u, on: async () => [sql.build(urlDbOperator(await f.custom1.getDbName()), ' like ', u.URL)] }],
            where: () => [f.where({ status: FamilyStatus.Active })]
        }), ' group by cube(', u.prettyName, ')'
        );

        return (await db.execute(q)).rows;
    }


    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async getVolunteerAverage(fromDate?: string, toDate?: string, remult?: Remult, db?: SqlDatabase) {
        var fromDateDate = ValueConverters.DateOnly.fromJson(fromDate);
        var toDateDate = ValueConverters.DateOnly.fromJson(toDate);


        let f = await SqlFor(remult.repo(FamilyDeliveries));

        let sql = new SqlBuilder(remult);
        sql.addEntity(f, "FamilyDeliveries")
        let deliveries = await db.execute(await sql.build(sql.query({
            select: () => [f.courier,
            sql.build('count (distinct ', f.family, ') total'),
            ],
            from: f,
            where: () => [f.where({ deliverStatus: DeliveryStatus.isSuccess(), createDate: { "<=": toDateDate, ">": fromDateDate } })]
        }), ' group by ', f.courier));

        let couriers = 0;
        let totFamilies: number = 0;
        for (const r of deliveries.rows) {
            totFamilies += +r['total'];
            couriers++;
        }

        return (totFamilies / couriers).toFixed(1);

    }
}