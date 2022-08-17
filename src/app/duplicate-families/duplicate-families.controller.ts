
import { BackendMethod, remult, Remult, SqlDatabase } from 'remult';

import { getDb, SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";

import { Families } from '../families/families';
import { FamilyStatus } from '../families/FamilyStatus';

import { getSettings } from '../manage/ApplicationSettings';

import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';

export class DuplicateFamiliesController {
    @BackendMethod({ allowed: true })
    static async familiesInSameAddress(compare: { address: boolean, name: boolean, phone: boolean, tz: boolean, onlyActive: boolean }) {
        if (!compare.address && !compare.name && !compare.phone && !compare.tz)
            throw "some column needs to be selected for compare";
        let sql = new SqlBuilder();
        let f = SqlFor(remult.repo(Families));
        let fd = SqlFor(remult.repo(ActiveFamilyDeliveries));
        let q = '';
        for (const tz of [f.tz, f.tz2]) {
            for (const phone of [f.phone1, f.phone2, f.phone3, f.phone4]) {
                if (q.length > 0) {
                    q += '\r\n union all \r\n';

                }
                q += await sql.query({
                    select: () => [
                        sql.columnWithAlias(f.addressLatitude, 'lat'),
                        sql.columnWithAlias(f.addressLongitude, 'lng'),
                        sql.columnWithAlias(f.address, 'address'),
                        f.name,
                        sql.columnWithAlias(f.id, 'id'),
                        sql.columnWithAlias(sql.extractNumber(tz), 'tz'),
                        sql.columnWithAlias(sql.extractNumber(phone), 'phone')
                    ],
                    from: f,
                    where: () => {
                        let r: any[] = [f.where({ status: { "!=": FamilyStatus.ToDelete } })];
                        if (compare.onlyActive) {
                            r.push(sql.build(f.id, ' in (', sql.query({ select: () => [fd.family], from: fd }), ')'));
                        }
                        return r;
                    },
                });
            }
        }

        let where = [];
        let groupBy = [];
        if (compare.address) {
            groupBy.push('lat');
            groupBy.push('lng');
        }
        if (compare.phone) {
            groupBy.push('phone');
            where.push('phone<>0');
        }
        if (compare.tz) {
            groupBy.push('tz');
            where.push('tz<>0');
        }
        if (compare.name) {
            groupBy.push('name');
        }
        q = await sql.build('select ', [
            sql.columnWithAlias(sql.max('address'), 'address'),
            sql.columnWithAlias(sql.max('name'), '"name"'),
            sql.columnWithAlias(sql.max('tz'), 'tz'),
            sql.columnWithAlias(sql.max('phone'), 'phone'), 'count (distinct id) c', "string_agg(id::text, ',') ids"], ' from ('
            , q, ') as result');
        if (where.length > 0)
            q += ' where ' + await sql.and(...where);
        q += ' group by ' + await sql.build([groupBy]);
        q += ' having count(distinct id)>1';





        return (await getDb().execute(q)).rows.map(x => ({
            address: x['address'],
            name: x['name'],
            phone: getSettings().forWho.formatPhone(x['phone']),
            tz: x['tz'],
            count: +x['c'],
            ids: x['ids'].split(',').filter((val, index, self) => self.indexOf(val) == index).join(',')
        } as duplicateFamilies));
    }
}
export interface duplicateFamilies {
    address: string,
    name: string,
    tz: number,
    phone: string,
    count: number,
    ids: string
}
