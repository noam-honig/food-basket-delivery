import { BackendMethod, FilterFactories } from 'remult';
import { Filter } from 'remult';
import { Families } from "./families";
import { Remult } from 'remult';
import { BasketInfo } from "../asign-family/asign-family.component";

import { Roles } from "../auth/roles";
import { Groups } from "../manage/groups";

import { FamilyStatus } from './FamilyStatus';
import { getLang } from '../sites/sites';
import { DistributionCenters } from '../manage/distribution-centers';


export interface OutArgs {
    data: any;
    baskets: BasketInfo[];

}
export const colors = {
    yellow: '#FDE098'//yello
    , orange: '#FAC090'//orange
    , blue: '#84C5F1'//blue
    , green: '#91D7D7'//green
    , red: '#FD9FB3'//red
    , gray: 'gray'
};
export class Stats {
    constructor(private remult: Remult) {

    }
    outOfList = new FaimilyStatistics(getLang(this.remult).removedFromList, f => f.status.isEqualTo(FamilyStatus.RemovedFromList), colors.gray);
    frozen = new FaimilyStatistics(getLang(this.remult).frozen, f => f.status.isEqualTo(FamilyStatus.Frozen), colors.orange);
    toDelete = new FaimilyStatistics(getLang(this.remult).toDelete, f => f.status.isEqualTo(FamilyStatus.ToDelete), colors.red);
    active = new FaimilyStatistics(getLang(this.remult).active, f => f.status.isEqualTo(FamilyStatus.Active), colors.green);
    problem = new FaimilyStatistics(getLang(this.remult).adderssProblems, f => f.status.isEqualTo(FamilyStatus.Active).and(f.addressOk.isEqualTo(false).and(f.defaultSelfPickup.isEqualTo(false))), colors.orange);

    async getData(distCenter: DistributionCenters) {
        let r = await Stats.getFamilyStats(distCenter?.id);
        for (let s in this) {
            let x: any = this[s];
            if (x instanceof FaimilyStatistics) {
                x.loadFrom(r.data);
            }
        }
        return r;
    }
    @BackendMethod({ allowed: Roles.admin })
    static async getFamilyStats(distCenter: string, remult?: Remult) {
        let result = { data: {}, groups: [] as groupStats[] };
        let stats = new Stats(remult);
        let pendingStats = [];
        for (let s in stats) {
            let x = stats[s];
            if (x instanceof FaimilyStatistics) {
                pendingStats.push(x.saveTo(distCenter, result.data, remult));
            }
        }

        await  remult.repo(Groups).find({
            limit: 1000,
            orderBy: f =>  f.name 
        }).then(groups => {
            for (const g of groups) {
                let x: groupStats = {
                    name: g.name,
                    total: 0
                };
                result.groups.push(x);
                pendingStats.push( remult.repo(Families).count(f => f.groups.contains(x.name).and(
                    f.status.isEqualTo(FamilyStatus.Active))).then(r => x.total = r));
            }
        });


        await Promise.all(pendingStats);

        return result;
    }
}



export class FaimilyStatistics {
    constructor(public name: string, public rule: (f: FilterFactories<Families>) => Filter, public color?: string, value?: number) {
        this.value = value;
    }

    value = 0;
    async saveTo(distCenter: string, data: any, remult: Remult) {

        data[this.name] = await  remult.repo(Families).count(f => this.rule(f)).then(c => this.value = c);
    }
    async loadFrom(data: any) {
        this.value = data[this.name];
    }
}
interface groupStats {
    name: string,
    total: number
}
