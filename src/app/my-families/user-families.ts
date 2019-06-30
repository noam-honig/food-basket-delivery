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
        this.map.userClickedOnFamilyOnMap = (f) => this.userClickedOnFamilyOnMap(f);
    }
    startAssignByMap(){
        this.map.loadPotentialAsigment();
        this.mapElementOrder =-1;
    }
    mapElementOrder = 0;
    constructor(private context: Context) { }
    toDeliver: Families[] = [];
    delivered: Families[] = [];
    problem: Families[] = [];
    allFamilies: Families[] = [];
    helperId: string;
    helperName: string;
    helperOptional: Helpers;
    routeStats: routeStats;
    userClickedOnFamilyOnMap: (familyId: string) => void;
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
            return 'שומר מקום';
        let r = '';
        if (this.toDeliver.length == 1) {
            r = 'משפחה אחת לחלוקה';
        }
        else
            r = this.toDeliver.length + ' משפחות לחלוקה';


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
            this.allFamilies = await this.context.for(Families).find({ where: f => f.courier.isEqualTo(this.helperId).and(f.deliverStatus.isActiveDelivery()).and(f.visibleToCourier.isEqualTo(true)), orderBy: f => [f.routeOrder, f.address], limit: 1000 });
        else
            this.allFamilies = [];
        this.initFamilies();
    }


    initFamilies() {

        this.toDeliver = this.allFamilies.filter(f => f.deliverStatus.value == DeliveryStatus.ReadyForDelivery);
        this.delivered = this.allFamilies.filter(f => f.deliverStatus.value == DeliveryStatus.Success || f.deliverStatus.value == DeliveryStatus.SuccessLeftThere);
        this.problem = this.allFamilies.filter(f => {
            switch (f.deliverStatus.value) {
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
            if (ff.deliverStatus.value != DeliveryStatus.Success && ff.deliverStatus.value != DeliveryStatus.SuccessLeftThere) {
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
        this.mapElementOrder = 1;
        if (this.map)
            this.map.clear();



    }
}
export interface basketStats {
    name: () => string;
    count: number;
}