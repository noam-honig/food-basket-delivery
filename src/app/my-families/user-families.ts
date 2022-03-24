
import { DeliveryStatus } from "../families/DeliveryStatus";
import { BasketType, quantityHelper } from "../families/BasketType";
import { Helpers, HelpersBase } from '../helpers/helpers';
import { MapComponent } from '../map/map.component';
import { Remult } from 'remult';

import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { BasketSummaryComponent } from "../basket-summary/basket-summary.component";
import { ApplicationSettings } from "../manage/ApplicationSettings";
import { DistributionCenters } from "../manage/distribution-centers";
import { routeStats, routeStrategy } from "../asign-family/route-strategy";
import { openDialog } from "@remult/angular";
import { Roles } from "../auth/roles";

const useWazeKey = "useWaze";
export class UserFamiliesList {

    useWaze: boolean;
    chooseNavigation(useWaze: boolean) {
        if (useWaze != this.useWaze) {
            localStorage.setItem(useWazeKey, JSON.stringify(useWaze));
            this.useWaze = useWaze;
        }
    }

    map: MapComponent;
    setMap(map: MapComponent): any {
        this.map = map;
        this.map.userClickedOnFamilyOnMap = (f) => this.userClickedOnFamilyOnMap(f);
        if (this.allFamilies)
            this.map.test(this.allFamilies, this.helper);
    }
    startAssignByMap(city: string, group: string, distCenter: DistributionCenters, area: string, basketType: BasketType) {

        this.map.loadPotentialAsigment(city, group, distCenter, area, basketType);

    }
    forceShowMap = false;

    constructor(private remult: Remult, private settings: ApplicationSettings) {
        this.useWaze = this.settings.lang.languageCode == 'iw';
        let x = localStorage.getItem(useWazeKey);
        if (x != undefined) {
            this.useWaze = Boolean(JSON.parse(x));
        }
    }
    toDeliver: ActiveFamilyDeliveries[] = [];
    delivered: ActiveFamilyDeliveries[] = [];
    problem: ActiveFamilyDeliveries[] = [];
    allFamilies: ActiveFamilyDeliveries[] = [];
    maxAssignTime: number;
    getHelperPhone() {
        return this.helper.phone.displayValue;
    }
    helper: Helpers;
    escort: HelpersBase;
    prevRouteStats: routeStats;
    routeStats: routeStats;
    setRouteStats(stats: routeStats) {
        this.prevRouteStats = this.routeStats;
        this.routeStats = stats;
    }
    getKmDiffString() {
        if (!this.routeStats || !this.prevRouteStats)
            return '';
        if (this.prevRouteStats.totalKm == 0)
            return '';
        let r = this.routeStats.totalKm - this.prevRouteStats.totalKm;
        if (r >= 0)
            return " (" + r + "+) ";
        return " (" + -r + "-) ";
    }
    userClickedOnFamilyOnMap: (familyId: string[]) => void = x => { };
    async initForHelper(helper: HelpersBase) {
        if (helper != this.helper) {
            await this.initHelper(helper);
            if (helper) {
                this.routeStats = helper.getRouteStats();
                this.prevRouteStats = undefined;
            }
        }
        await this.reload();
        this.loaded = true;
    }
    loaded = false;
    private async initHelper(h: HelpersBase) {
        this.helper = await h.getHelper();
        this.escort = undefined;
        if (this.helper && h.escort) {
            this.escort = await h.escort;
        }

    }
    showBasketSummary() {
        openDialog(BasketSummaryComponent, x => x.families = this);
    }

    getLeftFamiliesDescription() {
        if (this.toDeliver.length == 0)
            return "";
        let r = '';
        if (this.toDeliver.length == 1) {
            r = this.settings.lang.oneDeliveryToDistribute;
        }
        else
            r = this.toDeliver.length + ' ' + this.settings.lang.deliveriesToDistribute;
        return r;

    }
    getBoxes() {
        if (this.whatToTake)
            return;
        let boxes = 0;
        let boxes2 = 0;
        for (const iterator of this.toDeliver) {

            let item = iterator.basketType;
            if (item) {
                boxes += item.boxes * iterator.quantity;
                boxes2 += item.boxes2 * iterator.quantity;
            }
        }
        if (this.toDeliver.length == 0)
            return "";


        let boxesText = '';
        if ((boxes != this.toDeliver.length || boxes2 != 0))
            boxesText += + boxes + ' ' + BasketType.boxes1Name;
        if (boxes2 != 0) {
            boxesText += ' ' + this.settings.lang.and + " " + boxes2 + ' ' + BasketType.boxes2Name;
        }
        return boxesText;

    }
    async initForFamilies(helper: HelpersBase, familiesPocoArray: any[]) {
        this.initHelper(helper);
        let newFamilies = await Promise.all(familiesPocoArray.map(x => this.remult.repo(ActiveFamilyDeliveries).fromJson(x)));
        newFamilies.push(...this.delivered);
        newFamilies.push(...this.problem);
        this.allFamilies = newFamilies;
        this.initFamilies();
    }
    addFamily(d: FamilyDeliveries) {
        this.allFamilies.push(d);
        this.initFamilies();
    }
    familiesAlreadyAssigned = new Map<string, boolean>();
    highlightNewFamilies = false;
    lastHelperId = undefined;
    async reload() {
        if (this.helper && !this.helper.isNew()) {
            this.allFamilies = await this.remult.repo(ActiveFamilyDeliveries).find({
                where: {
                    courier: this.helper,
                    visibleToCourier: !this.settings.isSytemForMlt && !this.remult.isAllowed(Roles.distCenterAdmin) ? true : undefined

                }, orderBy: {
                    deliverStatus: "asc",
                    routeOrder: "asc",
                    address: "asc"
                },
                limit: 1000
            });
            if (this.lastHelperId != this.helper.id) {
                this.lastHelperId = this.helper.id;
                this.familiesAlreadyAssigned = new Map<string, boolean>();
                this.highlightNewFamilies = false;
                for (const f of this.allFamilies) {
                    this.highlightNewFamilies = true;
                    this.familiesAlreadyAssigned.set(f.id, true);
                }

            }
        }
        else {
            this.allFamilies = [];
            this.highlightNewFamilies = false;
        }
        this.initFamilies();
    }

    distCenter: DistributionCenters;

    async refreshRoute(args: import("../asign-family/asign-family.controller").refreshRouteArgs, strategy?: routeStrategy) {

        await (await import("../asign-family/asign-family.controller")).AsignFamilyController.RefreshRoute(this.helper, args, strategy).then(r => {

            if (r && r.ok && r.families.length == this.toDeliver.length) {
                this.setRouteStats(r.stats);
                this.initForFamilies(this.helper, r.families);
            }
        });
    }
    labs = Boolean(localStorage.getItem("labs"));
    toggleLabs() {
        this.labs = !this.labs;
        localStorage.setItem("labs", this.labs ? "true" : "");
    }
    whatToTake: string = '';

    initFamilies() {


        this.allFamilies = this.allFamilies.filter(f => f.archive == false);

        if (this.allFamilies.length > 0 && this.settings.showDistCenterAsEndAddressForVolunteer) {
            this.distCenter = this.allFamilies[0].distributionCenter;
        }
        else {
            this.distCenter = undefined;
        }
        this.toDeliver = this.allFamilies.filter(f => f.deliverStatus == DeliveryStatus.ReadyForDelivery);
        if (this.toDeliver.find(f => f.routeOrder == 0) && this.toDeliver.length > 0) {
            this.refreshRoute({});
        }
        const q = new quantityHelper();
        this.toDeliver.forEach(d => q.parseComment(d?.basketType?.whatToTake));
        this.whatToTake = q.toString();
        if (this.toDeliver.length == 0)
            this.prevRouteStats = undefined;
        this.maxAssignTime = undefined;
        for (const f of this.toDeliver) {
            if (f.courierAssingTime && (this.maxAssignTime == undefined || this.maxAssignTime < f.courierAssingTime.valueOf()))
                this.maxAssignTime = f.courierAssingTime.valueOf();
        }
        this.delivered = this.allFamilies.filter(f => f.deliverStatus == DeliveryStatus.Success || f.deliverStatus == DeliveryStatus.SuccessLeftThere);
        this.problem = this.allFamilies.filter(f => {
            switch (f.deliverStatus) {
                case DeliveryStatus.FailedBadAddress:
                case DeliveryStatus.FailedNotHome:
                case DeliveryStatus.FailedDoNotWant:

                case DeliveryStatus.FailedNotReady:
                case DeliveryStatus.FailedTooFar:

                case DeliveryStatus.FailedOther:
                    return true;
            }
            return false;

        });
        if (this.map)
            this.map.test(this.allFamilies, this.helper);
        let hash: any = {};


    }

    remove(f: ActiveFamilyDeliveries) {
        this.allFamilies.splice(this.allFamilies.indexOf(f), 1);
        this.initFamilies();
    }
    clear() {
        this.allFamilies = [];
        this.delivered = [];
        this.problem = [];
        this.toDeliver = [];
        if (this.map)
            this.map.clear();
        this.forceShowMap = false;



    }
}
