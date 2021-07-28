import { Component, OnInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { Location, GeocodeInformation, toLongLat, GetDistanceBetween } from '../shared/googleApiHelpers';
import { UrlBuilder, Filter, BackendMethod, SqlDatabase, AndFilter, FieldRef, FilterFactories, Allow } from 'remult';

import { DeliveryStatus } from "../families/DeliveryStatus";
import { YesNo } from "../families/YesNo";

import { Helpers, HelpersBase } from '../helpers/helpers';
import { DialogService, DestroyHelper, extractError } from '../select-popup/dialog';
import { UserFamiliesList } from '../my-families/user-families';

import { environment } from '../../environments/environment';
import { Route } from '@angular/router';

import { foreachSync, PromiseThrottle } from '../shared/utils';
import { ApplicationSettings, getSettings } from '../manage/ApplicationSettings';


import { Context } from 'remult';

import { BasketType } from '../families/BasketType';



import { SqlBuilder, SqlDefs, SqlFor } from "../model-shared/SqlBuilder";
import { Phone } from "../model-shared/phone";
import { BusyService, DataAreaSettings, InputField, openDialog, SelectValueDialogComponent } from '@remult/angular';
import { Roles, AdminGuard, distCenterAdminGuard } from '../auth/roles';
import { GroupsStatsPerDistributionCenter, GroupsStats, GroupsStatsForAllDeliveryCenters } from '../manage/manage.component';
import { SendSmsAction } from './send-sms-action';

import { SelectCompanyComponent } from '../select-company/select-company.component';
import { SelectHelperComponent } from '../select-helper/select-helper.component';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { SelectFamilyComponent } from '../select-family/select-family.component';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { CommonQuestionsComponent } from '../common-questions/common-questions.component';
import { DistributionCenters } from '../manage/distribution-centers';
import { CitiesStats, CitiesStatsPerDistCenter } from '../family-deliveries/family-deliveries-stats';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { Families } from '../families/families';

import { HelperFamiliesComponent, DeliveryInList } from '../helper-families/helper-families.component';
import { familiesInRoute, optimizeRoute, routeStats, routeStrategy } from './route-strategy';
import { moveDeliveriesHelper } from '../helper-families/move-deliveries-helper';
import { SelectListComponent } from '../select-list/select-list.component';
import { use } from '../translate';
import { MltFamiliesComponent } from '../mlt-families/mlt-families.component';
import { getLang } from '../sites/sites';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';




@Component({
    selector: 'app-asign-family',
    templateUrl: './asign-family.component.html',
    styleUrls: ['./asign-family.component.scss']
})

export class AsignFamilyComponent implements OnInit, OnDestroy {
    static route: Route = {
        path: 'assign-families', component: AsignFamilyComponent, canActivate: [distCenterAdminGuard]
    };
    @ViewChild("phoneInput", { static: false }) phoneInput: ElementRef;

    canSeeCenter() {
        return this.context.isAllowed(Roles.admin);
    }
    assignOnMap() {
        this.familyLists.forceShowMap = true;
        setTimeout(() => {
            this.helperFamilies.switchToMap();

            setTimeout(() => {
                this.familyLists.startAssignByMap(this.filterCity, this.filterGroup, this.dialog.distCenter, this.filterArea, this.basketType.basket);
            }, 50);
        }, 50);

    }
    @ViewChild("helperFamilies", { static: false }) helperFamilies: HelperFamiliesComponent;

    hasPreferred() {
        return this.familyLists.helper.preferredDistributionAreaAddress || this.familyLists.helper.preferredFinishAddress;
    }
    preferredText() {
        if (this.hasPreferred()) {
            let r = this.familyLists.helper.preferredDistributionAreaAddress;
            if (this.familyLists.helper.preferredFinishAddress) {
                if (r.length > 0)
                    r += ", ";
                r += this.familyLists.helper.preferredFinishAddress;
            }
            return this.settings.lang.volunteerPreferences + ": " + r;
        }
    }
    async editHelper() {
        await this.familyLists.helper.displayEditDialog(this.dialog, this.busy);
        if (this.phone != this.familyLists.helper.phone.thePhone)
            this.phone = this.familyLists.helper.phone.thePhone;

    }
    async searchPhone() {
        this.clearHelperInfo(false);
        let cleanPhone = Phone.fixPhoneInput(this.phone, this.context);

        if (this.isValidPhone()) {
            let thisPhone = new Phone(this.phone);
            this.phone = cleanPhone;
            let helper = await this.context.for(Helpers).findFirst(h => h.phone.isEqualTo(thisPhone));
            if (helper) {

                this.initHelper(helper);
            } else {
                helper = this.context.for(Helpers).create();
                helper.phone = thisPhone;
                this.initHelper(helper);

            }

        }
    }
    isValidPhone() {
        let cleanPhone = Phone.fixPhoneInput(this.phone, this.context);

        return (cleanPhone.length == 10 || cleanPhone.startsWith('+') && cleanPhone.length > 11);
    }
    async initHelper(helper: HelpersBase) {
        let other = await helper.$.theHelperIAmEscorting.load();
        if (other) {

            if (await openDialog(YesNoQuestionComponent, q => q.args = {
                question: helper.name + ' ' + this.settings.lang.isDefinedAsEscortOf + ' ' + other.name + '. ' + this.settings.lang.displayFamiliesOf + ' ' + other.name + '?'
            }, q => q.yes)) {
                this.initHelper(other);
            }
            else
                this.clearHelperInfo();
            return;
        }
        this.helper = await helper.getHelper();
        this.initArea();
        this.phone = this.helper.phone.thePhone;
        if (helper.isNew()) {
            await this.refreshList();
        }
        else {
            Helpers.addToRecent(helper);
            await this.refreshList();
            if (helper.leadHelper && this.familyLists.toDeliver.length == 0) {
                let from = await helper.$.leadHelper.load();
                new moveDeliveriesHelper(this.context, this.settings, this.dialog, () => this.familyLists.reload()).move(from, this.familyLists.helper, false
                    , this.settings.lang.for + " \"" + this.familyLists.helper.name + "\" " + this.settings.lang.isDefinedAsLeadVolunteerOf + " \"" + from.name + "\".")
            }
        }
    }

    clearHelperInfo(clearPhone = true) {
        this.helper = undefined;
        this.area = undefined;
        if (clearPhone)
            this.phone = '';
        this.familyLists.setRouteStats(undefined);
        this.preferRepeatFamilies = true;
        this.showRepeatFamilies = false;
        this.clearList();
        if (this.phoneInput)
            setTimeout(() => {
                this.phoneInput.nativeElement.focus();
            }, 200);
    }


    filterCity = '';
    filterArea = use.language.allRegions;
    allBaskets: BasketInfo = { id: 'undefined', name: this.settings.lang.allBaskets, unassignedFamilies: 0, basket: null };
    basketType: BasketInfo = this.allBaskets;
    selectCity() {
        this.refreshBaskets();
    }

    async assignmentCanceled() {
        this.lastRefreshRoute = this.lastRefreshRoute.then(
            async () => await this.refreshBaskets());
        this.doRefreshRoute();

    }
    moveBasktesFromOtherHelper() {
        openDialog(
            SelectHelperComponent, s => s.args = {
                filter: h => h.deliveriesInProgress.isGreaterOrEqualTo(1).and(h.id.isDifferentFrom(this.helper.id)),
                hideRecent: true,
                onSelect: async h => {
                    if (h) {
                        await this.verifyHelperExistance();
                        new moveDeliveriesHelper(this.context, this.settings, this.dialog, () => this.familyLists.reload()).move(h, this.familyLists.helper, false)
                    }
                }
            });
    }

    showHelperInput = true;
    specificToHelper(h: HelpersBase) {
        this.showHelperInput = false;
        this.phone = h.phone.thePhone;
        this.initHelper(h);
    }
    lastRefreshRoute = Promise.resolve();
    useGoogleOptimization = true;
    doRefreshRoute() {

        this.lastRefreshRoute = this.lastRefreshRoute.then(
            async () => await this.busy.donotWait(

                async () =>
                    await this.familyLists.refreshRoute({ doNotUseGoogle: !this.useGoogleOptimization })


            )).catch(x => this.lastRefreshRoute = Promise.resolve());

    }
    smsSent() {
        this.clearHelperInfo();
    }



    async refreshBaskets() {
        await this.busy.donotWait(async () => {
            let groups: Promise<GroupsStats[]>;
            if (!this.dialog.distCenter) {
                groups = this.context.for(GroupsStatsForAllDeliveryCenters).find({ where: f => f.familiesCount.isGreaterThan(0), limit: 1000 });
            }
            else
                groups = this.context.for(GroupsStatsPerDistributionCenter).find({ where: f => f.familiesCount.isGreaterThan(0).and(this.dialog.filterDistCenter(f.distCenter)), limit: 1000 });
            groups.then(g => {
                this.groups = g;
                if (this.filterGroup != '' && !this.groups.find(x => x.name == this.filterGroup)) {

                    this.groups.push({ name: this.filterGroup, familiesCount: 0 });
                }
            });

            let r = (await AsignFamilyComponent.getBasketStatus(this.helper, this.basketType.basket, this.dialog.distCenter, {
                filterGroup: this.filterGroup,
                filterCity: this.filterCity,
                filterArea: this.filterArea
            }));
            this.baskets = [this.allBaskets];
            this.baskets.push(...await Promise.all(r.baskets.map(async x => ({
                ...x,
                basket: await this.context.for(BasketType).findId(x.id)
            }))));
            this.allBaskets.unassignedFamilies = 0;
            let found = false;
            if (this.basketType == this.allBaskets)
                found = true;
            for (const iterator of this.baskets) {
                this.allBaskets.unassignedFamilies += +iterator.unassignedFamilies;
                if (!found && this.basketType.id == iterator.id) {
                    this.basketType = iterator;
                    found = true;
                }
            }


            this.cities = r.cities;
            if (this.filterCity != '' && !this.cities.find(x => x.name == this.filterCity)) {

                this.cities.push({ name: this.filterCity, unassignedFamilies: 0 });
            }

            this.areas = r.areas;
            if (this.filterArea != getLang(this.context).allRegions && !this.areas.find(x => x.name == this.filterArea)) {

                this.areas.push({ name: this.filterArea, unassignedFamilies: 0 });
            }

            this.specialFamilies = +r.special;
            this.repeatFamilies = r.repeatFamilies;
            if (this.repeatFamilies.length > 0)
                this.showRepeatFamilies = true;

        });
    }

    baskets: BasketInfo[] = [];
    cities: CityInfo[] = [];
    areas: CityInfo[] = [];
    specialFamilies = 0;
    showRepeatFamilies = false;
    repeatFamilies: string[] = [];

    preferRepeatFamilies = true;
    async refreshList() {
        await Promise.all([
            this.familyLists.initForHelper(this.helper), this.refreshBaskets()]);

    }
    familyLists = new UserFamiliesList(this.context, this.settings);
    filterGroup = '';
    groups: GroupsStats[] = [];
    phone: string;
    helper: Helpers;

    area: DataAreaSettings = new DataAreaSettings({});
    changeShowCompany() {
        this.initArea();
        this.settings.save();
    }








    private initArea() {
        if (this.helper)
            this.area = new DataAreaSettings({
                fields: () => {
                    let r = [];
                    if (this.settings.showCompanies)
                        r.push([this.helper.$.name,
                        {
                            field: this.helper.$.company,
                            click: () => this.findCompany(),
                            clickIcon: 'search'
                        }
                        ]);
                    else r.push([this.helper.$.name]);
                    if (this.settings.showHelperComment)
                        r.push(this.helper.$.eventComment);
                    if (this.settings.manageEscorts) {
                        r.push([this.helper.$.needEscort, this.helper.$.escort]);
                    }

                    return r;
                }
            });
    }

    clearList() {
        this.familyLists.clear();
    }
    findHelper() {
        openDialog(SelectHelperComponent, s => s.args = {
            onSelect: async h => {
                if (h) {
                    this.clearHelperInfo(false);
                    this.initHelper(await this.context.for(Helpers).findId(h.id));
                }
                else {
                    this.clearHelperInfo();
                }
            }
        })
    }



    destroyHelper = new DestroyHelper();
    ngOnDestroy(): void {
        this.destroyHelper.destroy();
    }

    constructor(public dialog: DialogService, private context: Context, public busy: BusyService, public settings: ApplicationSettings) {
        this.dialog.onDistCenterChange(() => this.refreshBaskets(), this.destroyHelper);

    }

    filterOptions: FieldRef<any, boolean>[] = [];
    async ngOnInit() {


        this.filterOptions.push(this.settings.$.showGroupsOnAssing, this.settings.$.showCityOnAssing, this.settings.$.showAreaOnAssing, this.settings.$.showBasketOnAssing, this.settings.$.showNumOfBoxesOnAssing);
        this.initArea();
        this.familyLists.userClickedOnFamilyOnMap =
            async families => {
                if (families.length == 1)
                    await this.assignFamilyBasedOnIdFromMap(families[0]);
                else if (families.length > 1) {
                    this.dialog.YesNoQuestion(this.settings.lang.atThisLocationThereAre + " " + families.length + this.settings.lang.deliveriesAssignAllOfThem, async () => {
                        await this.busy.doWhileShowingBusy(async () => {
                            for (const iterator of families) {
                                await this.assignFamilyBasedOnIdFromMap(iterator);
                            }
                        });
                    });
                }
            };

        if (!environment.production && this.showHelperInput) {
            this.phone = '0507330590';
            await this.searchPhone();

        }
        setTimeout(() => {
            if (this.phoneInput)
                this.phoneInput.nativeElement.focus();
        }, 200);

    }
    numOfBaskets: number = 1;
    private async assignFamilyBasedOnIdFromMap(familyId: string) {
        await this.busy.donotWait(async () => {
            let f = await this.context.for(ActiveFamilyDeliveries).findId(familyId);
            if (f && f.deliverStatus == DeliveryStatus.ReadyForDelivery && !f.courier) {
                this.performSpecificFamilyAssignment(f, 'assign based on map');
            }
        });
    }

    add(what: number) {
        this.numOfBaskets += what;
        if (this.numOfBaskets < 1)
            this.numOfBaskets = 1;

    }
    getBasketsToClick() {
        return this.basketType.unassignedFamilies;
    }
    assigning = false;
    async assignItem(allRepeat?: boolean) {
        this.assigning = true;

        await this.verifyHelperExistance();
        try {
            let x = await AsignFamilyComponent.AddBox(this.helper, this.basketType.basket, this.dialog.distCenter, {
                group: this.filterGroup,
                city: this.filterCity,
                area: this.filterArea,
                numOfBaskets: allRepeat ? this.repeatFamilies.length : this.numOfBaskets,
                preferRepeatFamilies: this.preferRepeatFamilies && this.repeatFamilies.length > 0,
                allRepeat: allRepeat
            });
            if (x.addedBoxes) {
                this.familyLists.initForFamilies(this.helper, x.families);

                let refreshBaskets = this.basketType.basket == undefined;
                if (x.familiesInSameAddress.length > 0) {
                    if (await this.dialog.YesNoPromise(this.settings.lang.thereAreAdditional + " " + x.familiesInSameAddress.length + " " + this.settings.lang.deliveriesAtSameAddress)) {
                        await this.busy.doWhileShowingBusy(async () => {
                            this.dialog.analytics('More families in same address');
                            for (const id of x.familiesInSameAddress) {
                                let f = await this.context.for(ActiveFamilyDeliveries).findFirst(f => f.id.isEqualTo(id).and(FamilyDeliveries.readyFilter()));
                                f.courier = this.helper;
                                await f.save();
                            }
                            await this.familyLists.initForHelper(this.helper)
                        });
                    }
                }
                if (!refreshBaskets) {
                    this.basketType.unassignedFamilies -= x.addedBoxes;

                }
                else {
                    this.refreshBaskets();
                }



                this.dialog.analytics('Assign Family');
                if (this.baskets == undefined)
                    this.dialog.analytics('Assign any Family (no box)');
                if (this.filterGroup)
                    this.dialog.analytics('assign family-group');
                if (this.filterCity)
                    this.dialog.analytics('assign family-city');
                if (this.numOfBaskets > 1)
                    this.dialog.analytics('assign family boxes=' + this.numOfBaskets);
            }
            else {
                this.refreshList();
                this.dialog.Info(this.settings.lang.noMatchingDelivery);
            }
            this.assigning = false;
        }
        catch (err) {
            this.assigning = false;
            await this.dialog.exception(this.settings.lang.assignDeliveryMenu, err);
        }

    }

    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async getBasketStatus(helper: HelpersBase, basket: BasketType, distCenter: DistributionCenters, info: GetBasketStatusActionInfo, context?: Context, db?: SqlDatabase): Promise<GetBasketStatusActionResponse> {

        let result: GetBasketStatusActionResponse = {
            baskets: [],
            cities: [],
            areas: [],
            special: 0,
            repeatFamilies: []
        };


        let countFamilies = (additionalWhere?: (f: FilterFactories<ActiveFamilyDeliveries>) => Filter) => {
            return context.for(ActiveFamilyDeliveries).count(f => {
                let where = FamilyDeliveries.readyFilter(info.filterCity, info.filterGroup, info.filterArea, basket).and(context.filterDistCenter(f.distributionCenter, distCenter));
                if (additionalWhere) {
                    where = where.and(additionalWhere(f));
                }

                return where;
            });
        };

        result.special = await countFamilies(f => f.special.isEqualTo(YesNo.Yes));


        let sql = new SqlBuilder(context);
        let f = SqlFor(context.for(ActiveFamilyDeliveries));
        let fd = SqlFor(context.for(FamilyDeliveries));
        if (helper) {
            let r = await db.execute(await sql.build('select ', f.id, ' from ', f, ' where ', ActiveFamilyDeliveries.active(f).and(context.filterDistCenter(f.distributionCenter, distCenter)).and(FamilyDeliveries.readyFilter(info.filterCity, info.filterGroup, info.filterArea, basket).and(f.special.isEqualTo(YesNo.No))), ' and ',
                filterRepeatFamilies(sql, f, fd, helper), ' limit 30'));
            result.repeatFamilies = r.rows.map(x => x[r.getColumnKeyInResultForIndexInSelect(0)]);
        }



        if (!distCenter) {
            for await (let c of context.for(CitiesStats).iterate({
                orderBy: ff => ff.city,
            })) {
                var ci = {
                    name: c.city,
                    unassignedFamilies: c.deliveries
                };
                if (!info.filterGroup) {
                    result.cities.push(ci);
                }
                else {
                    ci.unassignedFamilies = await countFamilies(f => f.city.isEqualTo(c.city));
                    if (ci.unassignedFamilies > 0)
                        result.cities.push(ci);
                }
            }
        } else {
            for await (let c of context.for(CitiesStatsPerDistCenter).iterate({
                orderBy: ff => ff.city,
                where: ff => context.filterDistCenter(ff.distributionCenter, distCenter)
            })) {
                var ci = {
                    name: c.city,
                    unassignedFamilies: c.families
                };
                if (!info.filterGroup) {
                    result.cities.push(ci);
                }
                else {
                    ci.unassignedFamilies = await countFamilies(f => f.city.isEqualTo(c.city));
                    if (ci.unassignedFamilies > 0)
                        result.cities.push(ci);
                }
            }
        }
        let groupBy = (await db.execute(await sql.build(await sql.query({
            select: () => [
                sql.columnWithAlias(f.area, 'area'),
                sql.columnWithAlias(sql.func('count ', '*'), 'c')
            ],
            from: f,
            where: () => [context.filterDistCenter(f.distributionCenter, distCenter), FamilyDeliveries.readyFilter(info.filterCity, info.filterGroup, undefined, basket)]
        }), ' group by ', f.area, ' order by ', f.area)));
        result.areas = groupBy.rows.map(x => {
            let r: CityInfo = {
                name: x['area'],
                unassignedFamilies: +x['c']
            }
            return r;
        });



        let baskets = await db.execute(await sql.build(sql.query({
            select: () => [f.basketType,
            sql.build('count (', f.quantity, ') b'),
            ],
            from: f,
            where: () => [context.filterDistCenter(f.distributionCenter, distCenter), FamilyDeliveries.readyFilter(info.filterCity, info.filterGroup, info.filterArea)]
        }), ' group by ', f.basketType));
        for (const r of baskets.rows) {
            let basketId = r[baskets.getColumnKeyInResultForIndexInSelect(0)];
            let b = await context.for(BasketType).findId(basketId);
            result.baskets.push({
                id: basketId,
                name: b.name,
                unassignedFamilies: +r['b'],
                basket: undefined
            });
        }

        result.baskets.sort((a, b) => b.unassignedFamilies - a.unassignedFamilies);


        return result;
    }
    @BackendMethod({ allowed: Allow.authenticated, blockUser: false })
    static async RefreshRoute(helper: HelpersBase, args: refreshRouteArgs, strategy?: routeStrategy, context?: Context) {

        if (!context.isAllowed(Roles.distCenterAdmin)) {
            if (!helper.isCurrentUser()) {
                throw "Not Allowed";
            }
        }
        if (!args)
            args = {};
        let existingFamilies = await context.for(ActiveFamilyDeliveries).find({
            where: f => f.courier.isEqualTo(helper).and(
                f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery))
        });
        if (!strategy)
            strategy = (await ApplicationSettings.getAsync(context)).routeStrategy;

        if (!strategy)
            throw "Invalid Strategy";
        let r = await optimizeRoute(await helper.getHelper(), existingFamilies, context, !args.doNotUseGoogle, strategy, args.volunteerLocation);
        r.families = r.families.filter(f => f.checkAllowedForUser());
        r.families = await Promise.all(r.families.map(x => x._.toApiJson()));
        return r;
    }
    findCompany() {
        openDialog(SelectCompanyComponent, s => s.argOnSelect = x => this.helper.company = x);
    }
    async assignClosestDeliveries() {

        let afdList = await (HelperFamiliesComponent.getDeliveriesByLocation(this.familyLists.helper.preferredDistributionAreaAddressHelper.location(), false));

        await openDialog(SelectListComponent, x => {
            x.args = {
                title: use.language.closestDeliveries + ' (' + use.language.mergeFamilies + ')',
                multiSelect: true,
                onSelect: async (selectedItems) => {
                    if (selectedItems.length > 0)
                        this.busy.doWhileShowingBusy(async () => {
                            let ids: string[] = [];
                            for (const selectedItem of selectedItems) {
                                let d: DeliveryInList = selectedItem.item;
                                ids.push(...d.ids);
                            }
                            await MltFamiliesComponent.assignFamilyDeliveryToIndie(ids);

                            await this.familyLists.reload();
                            this.doRefreshRoute();
                        });
                },
                options: afdList
            }
        });


    }
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async AddBox(helper: HelpersBase, basketType: BasketType, distCenter: DistributionCenters, info: AddBoxInfo, context?: Context, db?: SqlDatabase) {
        let result: AddBoxResponse = {
            addedBoxes: 0,
            families: [],
            basketInfo: undefined,
            routeStats: undefined,
            familiesInSameAddress: []
        }
        if (!helper)
            throw "helper does not exist";
        let existingFamilies = await context.for(ActiveFamilyDeliveries).find({
            where: f => f.courier.isEqualTo(helper).and(
                f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)),
            orderBy: f => f.routeOrder.descending()
        });


        let locationReferenceFamilies: Location[] = [];
        let bounds: { lng1?: number, lng2?: number, lat1?: number, lat2?: number };
        let boundsExtend = (l: Location) => {
            if (!bounds) {
                bounds = {
                    lng1: l.lng,
                    lng2: l.lng,
                    lat1: l.lat,
                    lat2: l.lat
                }
            }
            else {
                if (l.lng < bounds.lng1) {
                    bounds.lng1 = l.lng;
                }
                if (l.lng > bounds.lng2) {
                    bounds.lng2 = l.lng;
                }
                if (l.lat < bounds.lat1) {
                    bounds.lat1 = l.lat;
                }
                if (l.lat > bounds.lat2) {
                    bounds.lat2 = l.lat;
                }
            }
        };
        let boundsContains = (l: Location) => {
            return (l.lng >= bounds.lng1 && l.lng <= bounds.lng2 && l.lat >= bounds.lat1 && l.lat <= bounds.lat2);
        };
        {

            let refFam: ActiveFamilyDeliveries[] = [...existingFamilies];
            if (refFam.length == 0) {
                let from = new Date();
                from.setDate(from.getDate() - 1);
                refFam = await context.for(ActiveFamilyDeliveries).find({
                    where: f => f.courier.isEqualTo(helper).and(DeliveryStatus.isAResultStatus(f.deliverStatus)).and(f.deliveryStatusDate.isGreaterOrEqualTo(from)),
                    orderBy: f => f.deliveryStatusDate.descending(),
                    limit: 1
                });
            }
            let m = new Map<string, boolean>();
            for (const f of refFam) {
                let x = JSON.stringify(f.getDrivingLocation());
                if (!m.get(x)) {
                    m.set(x, true);
                    locationReferenceFamilies.push(f.getDrivingLocation());
                    boundsExtend(f.getDrivingLocation());
                }
            }
        }
        function buildWhere(f: FilterFactories<ActiveFamilyDeliveries>) {
            let where = FamilyDeliveries.readyFilter(info.city, info.group, info.area).and(
                f.special.isDifferentFrom(YesNo.Yes).and(context.filterDistCenter(f.distributionCenter, distCenter))
            );
            if (basketType)
                where = where.and(
                    f.basketType.isEqualTo(basketType));
            return where;
        }

        let getFamilies = async () => {
            if (locationReferenceFamilies.length > 0 && info.preferRepeatFamilies && !info.allRepeat) {
                info.preferRepeatFamilies = false;
            }
            let f = SqlFor(context.for(ActiveFamilyDeliveries));
            let sql = new SqlBuilder(context);
            sql.addEntity(f, 'Families');
            let r = (await db.execute(await sql.query({
                select: () => [sql.build('distinct ', [f.addressLatitude, f.addressLongitude])],
                from: f,
                where: async () => {
                    let where = buildWhere(f);
                    let res = [];
                    res.push(where);
                    if (info.preferRepeatFamilies)
                        res.push(filterRepeatFamilies(sql, f, SqlFor(context.for(FamilyDeliveries)), helper));
                    return res;
                }
            })));

            return r.rows.map(x => {
                return {

                    lat: +x[r.getColumnKeyInResultForIndexInSelect(0)],
                    lng: +x[r.getColumnKeyInResultForIndexInSelect(1)]
                } as Location;

            }) as Location[];


        }

        let waitingFamilies = await getFamilies();
        let i = 0;
        let settings = await ApplicationSettings.getAsync(context);
        while (i < info.numOfBaskets) {
            if (info.preferRepeatFamilies && waitingFamilies.length == 0 && !info.allRepeat) {
                info.preferRepeatFamilies = false;
                waitingFamilies = await getFamilies();

            }
            if (waitingFamilies.length == 0)
                break;


            let distCenter: DistributionCenters;

            let addFamilyToResult = async (fqr: Location) => {
                waitingFamilies.splice(waitingFamilies.indexOf(fqr), 1);
                locationReferenceFamilies.push(fqr);
                boundsExtend(fqr);
                for (const family of await context.for(ActiveFamilyDeliveries).find({
                    where: f => buildWhere(f).and(f.addressLongitude.isEqualTo(fqr.lng).and(f.addressLatitude.isEqualTo(fqr.lat)))
                        .and(context.filterDistCenter(f.distributionCenter, distCenter))
                })) {
                    if (i < info.numOfBaskets) {
                        family.courier = helper;
                        family._disableMessageToUsers = true;
                        family.routeOrder = existingFamilies.length + 1;
                        distCenter = family.distributionCenter;
                        await family.save();
                        result.addedBoxes++;
                        existingFamilies.push(family);

                        i++;


                    }
                    else {
                        if (family.addressOk) {
                            result.familiesInSameAddress.push(family.id);
                        }
                    }
                }

            }

            if (waitingFamilies.length > 0) {
                let moreHelperInfo = await helper.getHelper();
                let preferArea = moreHelperInfo.preferredDistributionAreaAddressHelper.ok();
                let preferEnd = moreHelperInfo.preferredFinishAddressHelper.ok();

                if (locationReferenceFamilies.length == 0 || (settings.isSytemForMlt() && (preferArea || preferEnd))) {

                    let distCenter = settings.addressHelper.location();
                    let lastFamiliy = waitingFamilies[0];

                    if (preferArea || preferEnd) {
                        lastFamiliy = undefined;
                        var lastDist: number;
                        for (const f of waitingFamilies) {
                            if (preferArea) {
                                let dist = GetDistanceBetween(f, moreHelperInfo.preferredDistributionAreaAddressHelper.location());
                                if (!lastFamiliy || dist < lastDist) {
                                    lastFamiliy = f;
                                    lastDist = dist;
                                }
                            }
                            if (preferEnd) {
                                let dist = GetDistanceBetween(f, moreHelperInfo.preferredFinishAddressHelper.location());
                                if (!lastFamiliy || dist < lastDist) {
                                    lastFamiliy = f;
                                    lastDist = dist;
                                }
                            }
                        }

                    } else {
                        let lastDist = 0;
                        for (const f of waitingFamilies) {
                            let dist = GetDistanceBetween(f, distCenter);
                            if (dist > lastDist) {
                                lastFamiliy = f;
                                lastDist = dist;
                            }
                        }
                    }
                    await addFamilyToResult(lastFamiliy);
                }
                else {

                    let getDistance = (x: Location) => {
                        let inBounds = boundsContains(x);

                        let r = 1000000;
                        if (!x)
                            return r;
                        let start = locationReferenceFamilies.length - 1;
                        if (start < 25)
                            start = 0;
                        else start -= 25;
                        for (let index = start; index < locationReferenceFamilies.length; index++) {
                            const ef = locationReferenceFamilies[index];
                            let loc = ef;
                            if (loc) {
                                let dis = GetDistanceBetween(x, loc);
                                if (inBounds) {
                                    dis /= 3;
                                }
                                if (dis < r)
                                    r = dis;
                            }

                        }

                        return r;

                    }

                    let smallFamily = waitingFamilies[0];
                    let dist = getDistance({
                        lat: smallFamily.lat,
                        lng: smallFamily.lng
                    });
                    for (let i = 1; i < waitingFamilies.length; i++) {
                        let f = waitingFamilies[i];
                        let myDist = getDistance({ lng: f.lng, lat: f.lat });
                        if (myDist < dist) {
                            dist = myDist;
                            smallFamily = waitingFamilies[i]
                            if (myDist == 0) {
                                break;
                            }
                        }

                    }
                    await addFamilyToResult(smallFamily);



                }

            }

        }

        await Promise.all(existingFamilies.map(f => f.$.distributionCenter.load()));
        existingFamilies = existingFamilies.filter(f => f.checkAllowedForUser());
        existingFamilies.sort((a, b) => a.routeOrder - b.routeOrder);
        result.families = existingFamilies.map(f => f._.toApiJson());


        result.familiesInSameAddress = result.familiesInSameAddress.filter((x, i) => !existingFamilies.find(f => f.id == x) && result.familiesInSameAddress.indexOf(x) == i);
        if (distCenter)
            distCenter.SendMessageToBrowser(settings.lang.deliveriesAssigned, context);
        Families.SendMessageToBrowsers(settings.lang.deliveriesAssigned, context, '');
        return result;
    }


    addSpecial() {
        this.addFamily(f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery).and(
            f.courier.isEqualTo(null).and(f.special.isEqualTo(YesNo.Yes))), 'special');
    }
    addFamily(filter: (f: FilterFactories<ActiveFamilyDeliveries>) => Filter, analyticsName: string, selectStreet?: boolean, allowShowAll?: boolean) {
        openDialog(SelectFamilyComponent, x => x.args = {
            where: f => {
                let where = filter(f);
                if (this.filterCity)
                    where = new AndFilter(f.city.isEqualTo(this.filterCity), where);
                if (this.filterArea != use.language.allRegions)
                    where = new AndFilter(f.area.isEqualTo(this.filterArea), where);
                return where;
            },
            allowShowAll,
            selectStreet,
            distCenter: this.dialog.distCenter,
            onSelect: async selectedDeliveries => {

                for (const f of selectedDeliveries) {

                    let ok = async () => {
                        await this.performSpecificFamilyAssignment(f, analyticsName);
                    };

                    if (f.courier) {
                        if (selectStreet)
                            return;
                        let c = await f.courier;
                        this.dialog.YesNoQuestion(this.settings.lang.theFamily + ' ' +
                            f.name + this.settings.lang.isAlreadyAsignedTo + ' ' + c.name + ' ' + this.settings.lang.onStatus + ' ' +
                            f.deliverStatus.caption + '. ' + this.settings.lang.shouldAssignTo + ' ' + this.helper.name + '?', async () => {
                                await ok();
                            });

                    }
                    else
                        await ok();
                }


            }
        })
    }

    private async performSpecificFamilyAssignment(f: ActiveFamilyDeliveries, analyticsName: string) {
        await this.verifyHelperExistance();
        f.courier = this.helper;
        f.deliverStatus = DeliveryStatus.ReadyForDelivery;
        this.dialog.analytics(analyticsName);
        await f.save();
        this.familyLists.addFamily(f);
        setTimeout(() => {
            this.refreshBaskets();
        }, 300);
    }
    private async assignMultipleFamilies(ids: string[], quantity = 0) {
        await this.verifyHelperExistance();
        await AsignFamilyComponent.assignMultipleFamilies(this.helper, {
            ids,
            quantity
        });
        this.refreshList();
    }
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async assignMultipleFamilies(helper: HelpersBase, args: {
        ids: string[],
        quantity: number,
    }, context?: Context) {
        let familyDeliveries = await context.for(ActiveFamilyDeliveries).find({
            where: fd =>
                fd.id.isIn(args.ids).and(FamilyDeliveries.readyFilter())
        });
        if (args.quantity > 0) {
            familyDeliveries.sort((a, b) => {
                if (a.floor == b.floor) {
                    return (+b.appartment - +a.appartment);
                }
                return +b.floor - +a.floor;
            });
        }
        let added = 0;
        for (const fd of familyDeliveries) {
            if (args.quantity) {
                added += fd.quantity;
                if (added > args.quantity)
                    break;
            }
            fd.courier = helper;
            await fd.save();
        }
    }
    showSave() {
        return this.helper && this.helper.wasChanged();
    }
    async saveHelper() {
        await this.verifyHelperExistance();
        this.clearHelperInfo();
    }
    async verifyHelperExistance() {

        if (this.showSave()) {
            try {
                await this.helper.save();
            } catch (err) {
                await this.dialog.exception(this.settings.lang.saveVolunteerInfo, err);
                throw err;

            }
        }
        Helpers.addToRecent(this.helper);
    }
    addRepeat() {
        this.addFamily(f => f.id.isIn(this.repeatFamilies), 'repeat-families')
    }
    addSpecific() {
        this.addFamily(f => FamilyDeliveries.readyFilter(this.filterCity, this.filterGroup, this.filterArea, this.basketType.basket), 'specific', false, true);
    }
    addStreet() {
        this.addFamily(f => FamilyDeliveries.readyFilter(this.filterCity, this.filterGroup, this.filterArea, this.basketType.basket), 'street', true);
    }
    async addBuilding() {
        let rows = await AsignFamilyComponent.selectBuildings(this.basketType.basket, this.dialog.distCenter, {
            filterCity: this.filterCity,
            filterArea: this.filterArea,
            filterGroup: this.filterGroup
        });
        if (rows.length == 0) {
            this.dialog.Error(this.settings.lang.noDeliveriesLeft);
        }
        else {
            openDialog(SelectValueDialogComponent, x => x.args(
                {
                    values: rows.map(r => ({
                        caption: r.address + " - (" + r.quantity + ")",
                        item: r
                    }))
                    , onSelect: async r => {
                        let q = new InputField<number>({ valueType: Number, caption: this.settings.lang.quantity });
                        q.value = r.item.quantity;
                        await openDialog(InputAreaComponent, x => x.args = {
                            settings: {
                                fields: () => [q]
                            },
                            title: this.settings.lang.quantity + " " + this.settings.lang.for + " " + r.item.address,
                            cancel: () => { },
                            ok: async () => {
                                await this.assignMultipleFamilies(r.item.ids, q.value);
                            }
                        });


                    }
                    , title: this.settings.lang.assignBuildings

                }))
        }
    }
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async selectBuildings(basket: BasketType, distCenter: DistributionCenters, args: {
        filterCity: string,
        filterGroup: string,
        filterArea: string
    },
        context?: Context,
        db?: SqlDatabase
    ) {
        var sql = new SqlBuilder(context);
        var fd = SqlFor(context.for(ActiveFamilyDeliveries));

        let result = await db.execute(await sql.query({
            from: fd,
            select: () => [sql.columnWithAlias(sql.max('address'), 'address'), sql.sumWithAlias(fd.quantity, "quantity"), sql.build("string_agg(", fd.id, "::text, ',') ids")],
            where: () => [context.filterDistCenter(fd.distributionCenter, distCenter),
                FamilyDeliveries.readyFilter(args.filterCity, args.filterGroup, args.filterArea, basket)],
            groupBy: () => [fd.addressLatitude, fd.addressLongitude],
            having: () => [sql.build("sum(quantity)", '> 4')]
        }));
        let r: {
            address: string,
            quantity: number,
            ids: string[]
        }[] = []
        r = result.rows.map(r => ({
            address: r.address,
            quantity: r.quantity,
            ids: r.ids.split(',')
        }));
        return r;
    }

}

export interface AddBoxInfo {
    group: string;
    city: string;
    area: string;
    numOfBaskets: number;
    preferRepeatFamilies: boolean;
    allRepeat: boolean;
}
export interface AddBoxResponse {
    families: any[];
    basketInfo: GetBasketStatusActionResponse
    addedBoxes: number;
    routeStats: routeStats;
    familiesInSameAddress: string[];


}
interface familyQueryResult {
    addressLatitude: number;
    addressLongitude: number;
}



function getInfo(r: any) {
    let dist = 0;
    let duration = 0;
    r.routes[0].legs.forEach(e => {
        dist += e.distance.value;
        duration += e.duration.value;
    });
    return {
        dist, duration
    }
}

export interface GetBasketStatusActionInfo {
    filterGroup: string;
    filterCity: string;
    filterArea: string;
}
export interface GetBasketStatusActionResponse {
    baskets: BasketInfo[];
    cities: CityInfo[];
    areas: CityInfo[];
    special: number;
    repeatFamilies: string[];
}
export interface BasketInfo {
    name: string;
    id: string;
    basket: BasketType;
    unassignedFamilies: number;

}
function filterRepeatFamilies(sql: SqlBuilder, f: SqlDefs<ActiveFamilyDeliveries>, fd: SqlDefs<FamilyDeliveries>, helperId: HelpersBase) {
    return sql.build(f.family, ' in (select ', fd.family, ' from ', fd, ' where ', fd.courier.isEqualTo(helperId), ')');

}
export interface CityInfo {
    name: string;
    unassignedFamilies: number;
}



export interface refreshRouteArgs {
    doNotUseGoogle?: boolean,
    volunteerLocation?: Location
}
