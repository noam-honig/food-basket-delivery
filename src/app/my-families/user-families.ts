import { Families } from '../families/families';
import { DeliveryStatus } from "../families/DeliveryStatus";
import { BasketType } from "../families/BasketType";
import { Helpers } from '../helpers/helpers';
import { MapComponent } from '../map/map.component';
import { Location, GeocodeInformation } from '../shared/googleApiHelpers';
import { Context } from '../shared/context';
import { routeStats } from '../asign-family/asign-family.component';

export class UserFamiliesList {
    map: MapComponent;
    setMap(map: MapComponent): any {
        this.map = map;
    }
    constructor(private context: Context) { }
    toDeliver: Families[] = [];
    delivered: Families[] = [];
    problem: Families[] = [];
    allFamilies: Families[] = [];
    helperId: string;
    helperName: string;
    helperOptional: Helpers;
    routeStats: routeStats;
    async initForHelper(helperId: string, name: string, helperOptional?: Helpers) {

        this.helperOptional = helperOptional;
        this.helperId = helperId;
        this.helperName = name;
        if (helperOptional) {
            this.routeStats = helperOptional.getRouteStats();
        }
        await this.reload();

    }
    getLeftFamiliesDescription() {


        let boxes = 0;
        for (const iterator of this.toDeliver) {
            boxes += this.context.for(BasketType).lookup(iterator.basketType).boxes.value;
        }
        if (this.toDeliver.length == 0)
            return '';
        let r = '';
        if (this.toDeliver.length == 1) {
            r = 'נותרה משפחה אחת לחלוקה';
        }
        else
            r = 'נותרו ' + this.toDeliver.length + ' משפחות לחלוקה';


        if (boxes > this.toDeliver.length)
            r += ' (' + boxes + ' ארגזים)';
        return r;

    }
    async initForFamilies(helperId: string, name: string, familiesPocoArray: any[]) {
        this.helperId = helperId;
        this.helperName = name;
        let newFamilies = familiesPocoArray.map(x => this.context.for(Families).create().source.fromPojo(x));
        newFamilies.push(...this.delivered);
        newFamilies.push(...this.problem);
        this.allFamilies = newFamilies;
        this.initFamilies();
    }

    async reload() {
        if (this.helperId)
            this.allFamilies = await this.context.for(Families).find({ where: f => f.courier.isEqualTo(this.helperId).and(f.deliverStatus.isActiveDelivery()), orderBy: f => [f.routeOrder, f.address], limit: 1000 });
        else
            this.allFamilies = [];
        this.initFamilies();
    }


    initFamilies() {
      
        this.toDeliver = this.allFamilies.filter(f => f.deliverStatus.listValue == DeliveryStatus.ReadyForDelivery);
        this.delivered = this.allFamilies.filter(f => f.deliverStatus.listValue == DeliveryStatus.Success || f.deliverStatus.listValue == DeliveryStatus.SuccessLeftThere);
        this.problem = this.allFamilies.filter(f => {
            switch (f.deliverStatus.listValue) {
                case DeliveryStatus.FailedBadAddress:
                case DeliveryStatus.FailedNotHome:
                case DeliveryStatus.FailedOther:
                    return true;
            }
            return false;

        });
        if (this.map)
            this.map.test(this.allFamilies);
        let hash: any = {};
        this.totals = [];
        this.allFamilies.forEach(ff => {
            if (ff.deliverStatus.listValue != DeliveryStatus.Success && ff.deliverStatus.listValue != DeliveryStatus.SuccessLeftThere) {
                let x: basketStats = hash[ff.basketType.value];
                if (!x) {
                    hash[ff.basketType.value] = this.totals[this.totals.push({
                        name: () => this.context.for(BasketType).lookup(ff.basketType).name.value,
                        count: 1
                    }) - 1];
                }
                else {
                    x.count++;
                }
            }

        });

    }
    totals: basketStats[] = [];
    remove(f: Families) {
        this.allFamilies.splice(this.allFamilies.indexOf(f), 1);
        this.initFamilies();
    }
    clear() {
        this.allFamilies = [];
        this.delivered = [];
        this.problem = [];
        this.toDeliver = [];
    }
}
export interface basketStats {
    name: () => string;
    count: number;
}