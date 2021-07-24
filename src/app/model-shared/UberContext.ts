import { AndFilter, Context, Filter, FilterFactories, FilterFactory } from "remult";
import { Roles } from "../auth/roles";
import { BasketType } from "../families/BasketType";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { GetDistanceBetween, Location } from "../shared/googleApiHelpers";
import { getLang } from "../sites/sites";

export class UberContext {
    async helperFromJson(id: string): Promise<import("../helpers/helpers").Helpers> {
        if (!id)
            return null;
        return this.context.for((await import("../helpers/helpers")).Helpers).findId(id);

    }
    currentUser: import("../helpers/helpers").Helpers
    constructor(private context: Context) {

    }
    private _defaultBasket: BasketType;
    async defaultBasketType() {

        if (!this._defaultBasket)
            await this.context.for(BasketType).find({ orderBy: x => x.id }).then(y => {
                if (y.length > 0)
                    this._defaultBasket = y[0];
            });
        return this._defaultBasket;
    }
    filterCenterAllowedForUser(center: FilterFactory<import("../manage/distribution-centers").DistributionCenters>) {
        if (this.context.isAllowed(Roles.admin)) {
            return undefined;
        } else if (this.context.authenticated())
            return center.isEqualTo(this.currentUser.distributionCenter);
    }
    static filterActiveDeliveries: (self: FilterFactories<import("../families/FamilyDeliveries").FamilyDeliveries>) => Filter;
    isAllowedForUser(self: FilterFactories<import("../families/FamilyDeliveries").FamilyDeliveries>) {
        if (!this.context.authenticated())
            return self.id.isEqualTo('no rows');
        let user = u(this.context).currentUser;
        user.theHelperIAmEscorting;
        let result: Filter;
        let add = (f: Filter) => result = new AndFilter(f, result);

        if (!this.context.isAllowed([Roles.admin, Roles.lab])) {
            add(UberContext.filterActiveDeliveries(self));
            if (this.context.isAllowed(Roles.distCenterAdmin))
                add(this.filterCenterAllowedForUser(self.distributionCenter));
            else {
                if (user.theHelperIAmEscorting)
                    add(self.courier.isEqualTo(user.theHelperIAmEscorting).and(self.visibleToCourier.isEqualTo(true)));
                else
                    add(self.courier.isEqualTo(user).and(self.visibleToCourier.isEqualTo(true)));
            }
        }
        return result;
    }
    filterDistCenter(distCenterColumn: FilterFactory<import("../manage/distribution-centers").DistributionCenters>, distCenter: import("../manage/distribution-centers").DistributionCenters): Filter {
        let allowed = this.filterCenterAllowedForUser(distCenterColumn);
        if (distCenter != null)
            return new AndFilter(allowed, distCenterColumn.isEqualTo(distCenter));
        return allowed;
    }
    async findClosestDistCenter(loc: Location, centers?: import("../manage/distribution-centers").DistributionCenters[]) {
        let result: import("../manage/distribution-centers").DistributionCenters;
        let DistributionCenters = (await import("../manage/distribution-centers")).DistributionCenters;
        let dist: number;
        if (!centers)
            centers = await this.context.for(DistributionCenters).find({ where: c => DistributionCenters.isActive(c) });
        for (const c of centers) {
            let myDist = GetDistanceBetween(c.addressHelper.location(), loc);
            if (result === undefined || myDist < dist) {
                result = c;
                dist = myDist;
            }
        }
        return result;
    }
    lang = getLang(this.context);
    readyFilter(self: FilterFactories<import("../families/FamilyDeliveries").FamilyDeliveries>, city?: string, group?: string, area?: string, basket?: BasketType) {
        let where = self.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery).and(
            self.courier.isEqualTo(null)).and(this.filterCenterAllowedForUser(self.distributionCenter));
        if (group)
            where = where.and(self.groups.contains(group));
        if (city) {
            where = where.and(self.city.isEqualTo(city));
        }
        if (area !== undefined && area != this.lang.allRegions)
            where = where.and(self.area.isEqualTo(area));
        if (basket != null)
            where = where.and(self.basketType.isEqualTo(basket))

        return where;
    }
}
export function u(context: Context): UberContext {
    let r: UberContext = context[key];
    if (!r) {
        r = context[key] = new UberContext(context);
    }
    return r;
}

const key = Symbol("UberContext");