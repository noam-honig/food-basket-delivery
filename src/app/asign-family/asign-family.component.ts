import { Component, OnInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { Location, GeocodeInformation, toLongLat } from '../shared/googleApiHelpers';
import { UrlBuilder, FilterBase, ServerFunction, StringColumn, DataAreaSettings, BoolColumn, SqlDatabase, AndFilter, FilterConsumerBridgeToSqlRequest } from '@remult/core';

import { DeliveryStatus } from "../families/DeliveryStatus";
import { YesNo } from "../families/YesNo";

import { Helpers } from '../helpers/helpers';
import { DialogService, DestroyHelper, extractError } from '../select-popup/dialog';
import { UserFamiliesList } from '../my-families/user-families';

import { environment } from '../../environments/environment';
import { Route } from '@angular/router';

import { foreachSync } from '../shared/utils';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import * as fetch from 'node-fetch';

import { Context } from '@remult/core';

import { BasketType } from '../families/BasketType';


import { SqlBuilder, wasChanged, PhoneColumn } from '../model-shared/types';
import { BusyService } from '@remult/core';
import { Roles, AdminGuard, distCenterAdminGuard } from '../auth/roles';
import { Groups, GroupsStats } from '../manage/manage.component';
import { SendSmsAction } from './send-sms-action';
import { translate, getLang } from '../translate';
import { SelectCompanyComponent } from '../select-company/select-company.component';
import { SelectHelperComponent } from '../select-helper/select-helper.component';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { SelectFamilyComponent } from '../select-family/select-family.component';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { CommonQuestionsComponent } from '../common-questions/common-questions.component';
import { DistributionCenters, DistributionCenterId, allCentersToken } from '../manage/distribution-centers';
import { CitiesStatsPerDistCenter } from '../family-deliveries/family-deliveries-stats';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { Families } from '../families/families';
import { PromiseThrottle } from '../import-from-excel/import-from-excel.component';



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
        this.familyLists.startAssignByMap(this.filterCity, this.filterGroup, this.dialog.distCenter.value, this.filterArea);
    }
    translate = translate;
    async searchPhone() {
        this.clearHelperInfo(false);
        let cleanPhone = PhoneColumn.fixPhoneInput(this.phone);

        if (this.isValidPhone()) {
            this.phone = cleanPhone;
            let helper = await this.context.for(Helpers).findFirst(h => h.phone.isEqualTo(this.phone));
            if (helper) {

                this.initHelper(helper);
            } else {
                helper = this.context.for(Helpers).create();
                helper.phone.value = this.phone;
                this.initHelper(helper);

            }

        }
    }
    isValidPhone() {
        let cleanPhone = PhoneColumn.fixPhoneInput(this.phone);

        return (cleanPhone.length == 10 || cleanPhone.startsWith('+') && cleanPhone.length > 11);
    }
    async initHelper(helper: Helpers) {
        if (helper.theHelperIAmEscorting.value) {
            let other = await this.context.for(Helpers).findFirst(x => x.id.isEqualTo(helper.theHelperIAmEscorting));
            if (await this.context.openDialog(YesNoQuestionComponent, q => q.args = {
                question: helper.name.value + ' ' + this.settings.lang.isDefinedAsEscortOf + ' ' + other.name.value + '. ' + this.settings.lang.displayFamiliesOf + ' ' + other.name.value + '?'
            }, q => q.yes)) {
                this.initHelper(other);
            }
            else
                this.clearHelperInfo();
            return;
        }
        this.helper = helper;
        this.initArea();
        this.phone = this.helper.phone.value;
        if (helper.isNew()) {
            await this.refreshList();
        }
        else {
            Helpers.addToRecent(helper);
            this.familyLists.routeStats = helper.getRouteStats();
            await this.refreshList();
        }
    }
    clearHelperInfo(clearPhone = true) {
        this.helper = undefined;
        this.area = undefined;
        if (clearPhone)
            this.phone = '';
        this.familyLists.routeStats = undefined;
        this.preferRepeatFamilies = true;
        this.showRepeatFamilies = false;
        this.clearList();
        if (this.phoneInput)
            setTimeout(() => {
                this.phoneInput.nativeElement.focus();
            }, 200);
    }


    filterCity = '';
    filterArea = '';
    allBaskets: BasketInfo = { id: 'undefined', name: this.settings.lang.allBaskets, unassignedFamilies: 0 };
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
        this.context.openDialog(
            SelectHelperComponent, s => s.args = {
                filter: h => h.deliveriesInProgress.isGreaterOrEqualTo(1).and(h.id.isDifferentFrom(this.helper.id)),
                hideRecent: true,
                onSelect: async h => {
                    if (h) {
                        let families = await this.context.for(ActiveFamilyDeliveries).find({ where: f => f.courier.isEqualTo(h.id).and(f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)), limit: 1000 });
                        this.dialog.YesNoQuestion(this.settings.lang.transfer + " " + families.length + " " + this.settings.lang.deliveriesFrom + '"' + h.name.value + '"' + " " + this.settings.lang.toVolunteer + " " + '"' + this.helper.name.value + '"', async () => {
                            await this.busy.doWhileShowingBusy(async () => {
                                await this.verifyHelperExistance();
                                for (const f of families) {
                                    f.courier.value = this.helper.id.value;
                                    await f.save();
                                }
                                await this.familyLists.reload();
                                this.doRefreshRoute();
                            });
                        });
                    }
                }
            });


    }
    showHelperInput = true;
    specificToHelper(h: Helpers) {
        this.showHelperInput = false;
        this.phone = h.phone.value;
        this.searchPhone();
    }
    lastRefreshRoute = Promise.resolve();
    useGoogleOptimization = true;
    doRefreshRoute() {

        this.lastRefreshRoute = this.lastRefreshRoute.then(
            async () => await this.busy.donotWait(
                async () => await AsignFamilyComponent.RefreshRoute(this.helper.id.value, this.useGoogleOptimization).then(r => {

                    if (r && r.ok && r.families.length == this.familyLists.toDeliver.length) {
                        this.familyLists.routeStats = r.stats;
                        this.familyLists.initForFamilies(this.helper, r.families);
                    }

                }))).catch(x => this.lastRefreshRoute = Promise.resolve());

    }
    smsSent() {
        this.clearHelperInfo();
    }



    async refreshBaskets() {
        await this.busy.donotWait(async () => {

            this.context.for(GroupsStats).find({ limit: 1000, orderBy: f => f.name, where: f => f.familiesCount.isGreaterThan(0).and(f.distCenter.isEqualTo(this.dialog.distCenter)) }).then(g => this.groups = g);
            let r = (await AsignFamilyComponent.getBasketStatus({
                filterGroup: this.filterGroup,
                filterCity: this.filterCity,
                filterArea: this.filterArea,
                helperId: this.helper ? this.helper.id.value : '',
                distCenter: this.dialog.distCenter.value
            }));
            this.baskets = [this.allBaskets];
            this.baskets.push(...r.baskets);
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
            if (this.filterArea != '' && !this.areas.find(x => x.name == this.filterArea)) {

                this.areas.push({ name: this.filterArea, unassignedFamilies: 0 });
            }

            this.specialFamilies = +r.special;
            this.repeatFamilies = +r.repeatFamilies;
            if (this.repeatFamilies)
                this.showRepeatFamilies = true;

        });
    }

    baskets: BasketInfo[] = [];
    cities: CityInfo[] = [];
    areas: CityInfo[] = [];
    specialFamilies = 0;
    showRepeatFamilies = false;
    repeatFamilies = 0;

    preferRepeatFamilies = true;
    async refreshList() {
        await this.refreshBaskets();
        await this.familyLists.initForHelper(this.helper);

    }
    familyLists = new UserFamiliesList(this.context, this.settings);
    filterGroup = '';
    groups: GroupsStats[] = [];
    phone: string;
    helper: Helpers;

    area: DataAreaSettings<any> = new DataAreaSettings<any>({});
    changeShowCompany() {
        this.initArea();
        this.settings.save();
    }








    private initArea() {
        if (this.helper)
            this.area = new DataAreaSettings({
                columnSettings: () => {
                    let r = [];
                    if (this.settings.showCompanies.value)
                        r.push([this.helper.name,
                        {
                            column: this.helper.company,
                            click: () => this.findCompany(),
                            clickIcon: 'search'
                        }
                        ]);
                    else r.push([this.helper.name]);
                    if (this.settings.showHelperComment.value)
                        r.push(this.helper.eventComment);
                    if (this.settings.manageEscorts.value) {
                        r.push([this.helper.needEscort, this.helper.escort]);
                    }

                    return r;
                }
            });
    }

    clearList() {
        this.familyLists.clear();
    }
    findHelper() {
        this.context.openDialog(SelectHelperComponent, s => s.args = {
            onSelect: async h => {
                if (h) {
                    this.initHelper(await this.context.for(Helpers).findFirst(hh => hh.id.isEqualTo(h.id)));
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
    constructor(private dialog: DialogService, private context: Context, private busy: BusyService, public settings: ApplicationSettings) {
        if (this.dialog.distCenter.value === undefined) {
            this.dialog.distCenter.value = '';
        }
        this.dialog.onDistCenterChange(() => this.clearHelperInfo(), this.destroyHelper);

    }
    disableAll() {
        return this.dialog.distCenter.value == allCentersToken;
    }
    filterOptions: BoolColumn[] = [];
    async ngOnInit() {


        this.filterOptions.push(this.settings.showGroupsOnAssing, this.settings.showCityOnAssing, this.settings.showAreaOnAssing, this.settings.showBasketOnAssing, this.settings.showNumOfBoxesOnAssing);
        this.initArea();
        this.familyLists.userClickedOnFamilyOnMap =
            async  families => {
                if (families.length == 1)
                    await this.assignFamilyBasedOnIdFromMap(families[0]);
                else if (families.length > 1) {
                    this.dialog.YesNoQuestion(this.settings.lang.atThisLocationThereAre + " " + families.length + translate(this.settings.lang.deliveriesAssignAllOfThem), async () => {
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
        await this.busy.doWhileShowingBusy(async () => {
            let f = await this.context.for(ActiveFamilyDeliveries).findFirst(f => f.id.isEqualTo(familyId));
            if (f && f.deliverStatus.value == DeliveryStatus.ReadyForDelivery && f.courier.value == "") {
                this.performSepcificFamilyAssignment(f, 'assign based on map');
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
        let basket = this.basketType;
        if (this.allBaskets == basket)
            basket = undefined;
        await this.verifyHelperExistance();
        try {
            let x = await AsignFamilyComponent.AddBox({
                basketType: basket ? basket.id : undefined,
                helperId: this.helper.id.value,
                group: this.filterGroup,
                city: this.filterCity,
                area: this.filterArea,
                numOfBaskets: allRepeat ? this.repeatFamilies : this.numOfBaskets,
                preferRepeatFamilies: this.preferRepeatFamilies && this.repeatFamilies > 0,
                allRepeat: allRepeat,
                distCenter: this.dialog.distCenter.value
            });
            if (x.addedBoxes) {
                this.familyLists.initForFamilies(this.helper, x.families);

                let refreshBaskets = basket == undefined;
                if (x.familiesInSameAddress.length > 0) {
                    if (await this.dialog.YesNoPromise(this.settings.lang.thereAreAdditional + " " + x.familiesInSameAddress.length + " " + this.settings.lang.deliveriesAtSameAddress)) {
                        await this.busy.doWhileShowingBusy(async () => {
                            this.dialog.analytics('More families in same address');
                            for (const id of x.familiesInSameAddress) {
                                let f = await this.context.for(ActiveFamilyDeliveries).findFirst(f => f.id.isEqualTo(id).and(f.readyFilter()));
                                f.courier.value = this.helper.id.value;
                                await f.save();
                            }
                            await this.familyLists.initForHelper(this.helper)
                        });
                    }
                }
                if (!refreshBaskets) {
                    basket.unassignedFamilies -= x.addedBoxes;
                    if (this.preferRepeatFamilies && this.repeatFamilies > 0)
                        this.repeatFamilies--;
                }
                else {
                    this.refreshBaskets();
                }


                this.doRefreshRoute();
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
                this.dialog.Info(translate(this.settings.lang.noMatchingDelivery));
            }
            this.assigning = false;
        }
        catch (err) {
            this.assigning = false;
            await this.dialog.exception(this.settings.lang.assignDeliveryMenu, err);
        }

    }

    @ServerFunction({ allowed: Roles.distCenterAdmin })
    static async getBasketStatus(info: GetBasketStatusActionInfo, context?: Context, db?: SqlDatabase): Promise<GetBasketStatusActionResponse> {

        let result: GetBasketStatusActionResponse = {
            baskets: [],
            cities: [],
            areas: [],
            special: 0,
            repeatFamilies: 0
        };

        let countFamilies = (additionalWhere?: (f: ActiveFamilyDeliveries) => FilterBase) => {
            return context.for(ActiveFamilyDeliveries).count(f => {
                let where = f.readyFilter(info.filterCity, info.filterGroup, info.filterArea).and(f.filterDistCenterAndAllowed(info.distCenter));
                if (additionalWhere) {
                    where = where.and(additionalWhere(f));
                }

                return where;
            });
        };

        result.special = await countFamilies(f => f.special.isEqualTo(YesNo.Yes));


        let sql = new SqlBuilder();
        let f = context.for(ActiveFamilyDeliveries).create();
        let fd = context.for(FamilyDeliveries).create();
        if (info.helperId) {
            let r = await db.execute(sql.build('select count(*) from ', f, ' where ', f.active().and(f.distributionCenter.filter(info.distCenter)).and(f.readyFilter(info.filterCity, info.filterGroup, info.filterArea).and(f.special.isEqualTo(YesNo.No))), ' and ',
                filterRepeatFamilies(sql, f, fd, info.helperId)));
            result.repeatFamilies = r.rows[0][r.getColumnKeyInResultForIndexInSelect(0)];
        }


        for (let c of await context.for(CitiesStatsPerDistCenter).find({
            orderBy: ff => [{ column: ff.city }],
            where: ff => ff.distributionCenter.filter(info.distCenter)
        })) {
            var ci = {
                name: c.city.value,
                unassignedFamilies: c.families.value
            };
            if (!info.filterGroup) {
                result.cities.push(ci);
            }
            else {
                ci.unassignedFamilies = await countFamilies(f => f.city.isEqualTo(c.city.value));
                if (ci.unassignedFamilies > 0)
                    result.cities.push(ci);
            }
        }
        let groupBy = (await db.execute(sql.build(sql.query({
            select: () => [
                sql.columnWithAlias(f.area, 'area'),
                sql.columnWithAlias(sql.func('count ', '*'), 'c')
            ],
            from: f,
            where: () => [f.filterDistCenterAndAllowed(info.distCenter), f.readyFilter(info.filterCity, info.filterGroup)]
        }), ' group by ', f.area, ' order by ', f.area)));
        result.areas = groupBy.rows.map(x => {
            let r: CityInfo = {
                name: x['area'],
                unassignedFamilies: +x['c']
            }
            return r;
        });



        let baskets = await db.execute(sql.build(sql.query({
            select: () => [f.basketType,
            sql.build('count (', f.quantity, ') b'),
            ],
            from: f,
            where: () => [f.filterDistCenterAndAllowed(info.distCenter), f.readyFilter(info.filterCity, info.filterGroup, info.filterArea)]
        }), ' group by ', f.basketType));
        for (const r of baskets.rows) {
            let basketId = r[baskets.getColumnKeyInResultForIndexInSelect(0)];
            let b = await context.for(BasketType).lookupAsync(b => b.id.isEqualTo(basketId));
            result.baskets.push({
                id: basketId,
                name: b.name.value,
                unassignedFamilies: +r['b']
            });
        }

        result.baskets.sort((a, b) => b.unassignedFamilies - a.unassignedFamilies);


        return result;
    }
    @ServerFunction({ allowed: Roles.distCenterAdmin, blockUser: false })
    static async RefreshRoute(helperId: string, useGoogle: boolean, context?: Context) {
        let existingFamilies = await context.for(ActiveFamilyDeliveries).find({
            where: f => f.courier.isEqualTo(helperId).and(
                f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery))
        });
        let h = await context.for(Helpers).findFirst(h => h.id.isEqualTo(helperId));
        let r = await AsignFamilyComponent.optimizeRoute(h, existingFamilies, context, useGoogle);
        r.families = r.families.filter(f => f.checkAllowedForUser());
        r.families = await context.for(ActiveFamilyDeliveries).toPojoArray(r.families);
        return r;
    }
    findCompany() {
        this.context.openDialog(SelectCompanyComponent, s => s.argOnSelect = x => this.helper.company.value = x);
    }
    @ServerFunction({ allowed: Roles.distCenterAdmin })
    static async AddBox(info: AddBoxInfo, context?: Context, db?: SqlDatabase) {
        let result: AddBoxResponse = {
            addedBoxes: 0,
            families: [],
            basketInfo: undefined,
            routeStats: undefined,
            familiesInSameAddress: []
        }
        if (!info.helperId)
            throw 'invalid helper';

        let existingFamilies = await context.for(ActiveFamilyDeliveries).find({
            where: f => f.courier.isEqualTo(info.helperId).and(
                f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)),
            orderBy: f => [{ column: f.routeOrder, descending: true }]
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
                    where: f => f.courier.isEqualTo(info.helperId).and(f.deliverStatus.isAResultStatus()).and(f.deliveryStatusDate.isGreaterOrEqualTo(from)),
                    orderBy: f => [{ column: f.deliveryStatusDate, descending: true }],
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
        function buildWhere(f: ActiveFamilyDeliveries) {
            let where = f.readyFilter(info.city, info.group, info.area).and(
                f.special.isDifferentFrom(YesNo.Yes).and(f.filterDistCenterAndAllowed(info.distCenter))
            );
            if (info.basketType != undefined)
                where = where.and(
                    f.basketType.isEqualTo(info.basketType));
            return where;
        }

        let getFamilies = async () => {

            let f = context.for(ActiveFamilyDeliveries).create();
            let sql = new SqlBuilder();
            sql.addEntity(f, 'Families');
            let r = (await db.execute(sql.query({
                select: () => [sql.build('distinct ', [f.addressLatitude, f.addressLongitude])],
                from: f,
                where: () => {
                    let where = buildWhere(f);
                    let res = [];
                    res.push(where);
                    if (info.preferRepeatFamilies)
                        res.push(filterRepeatFamilies(sql, f, context.for(FamilyDeliveries).create(), info.helperId));
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



            let addFamilyToResult = async (fqr: Location) => {
                waitingFamilies.splice(waitingFamilies.indexOf(fqr), 1);
                locationReferenceFamilies.push(fqr);
                boundsExtend(fqr);
                for (const family of await context.for(ActiveFamilyDeliveries).find({
                    where: f => buildWhere(f).and(f.addressLongitude.isEqualTo(fqr.lng).and(f.addressLatitude.isEqualTo(fqr.lat)))
                        .and(f.filterDistCenterAndAllowed(info.distCenter))
                })) {
                    if (i < info.numOfBaskets) {
                        family.courier.value = info.helperId;
                        family._disableMessageToUsers = true;
                        family.routeOrder.value = existingFamilies.length + 1;
                        await family.save();
                        result.addedBoxes++;
                        existingFamilies.push(family);

                        i++;


                    }
                    else {
                        if (family.addressOk.value) {
                            result.familiesInSameAddress.push(family.id.value);
                        }
                    }
                }

            }

            if (waitingFamilies.length > 0) {

                if (locationReferenceFamilies.length == 0) {
                    let position = Math.trunc(Math.random() * waitingFamilies.length);
                    let distCenter = settings.getGeocodeInformation().location();
                    let lastFamiliy = waitingFamilies[0];
                    let lastDist = 0;
                    for (const f of waitingFamilies) {
                        let dist = GeocodeInformation.GetDistanceBetweenPoints({ lng: f.lng, lat: f.lat }, distCenter);
                        if (dist > lastDist) {
                            lastFamiliy = f;
                            lastDist = dist;
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
                                let dis = GeocodeInformation.GetDistanceBetweenPoints(x, loc);
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


        existingFamilies = existingFamilies.filter(f => f.checkAllowedForUser());
        existingFamilies.sort((a, b) => a.routeOrder.value - b.routeOrder.value);
        result.families = await context.for(ActiveFamilyDeliveries).toPojoArray(existingFamilies);

        result.familiesInSameAddress = result.familiesInSameAddress.filter((x, i) => !existingFamilies.find(f => f.id.value == x) && result.familiesInSameAddress.indexOf(x) == i);
        Families.SendMessageToBrowsers(settings.lang.deliveriesAssigned, context, '');
        return result;
    }

    static async optimizeRoute(helper: Helpers, families: ActiveFamilyDeliveries[], context: Context, useGoogle: boolean) {


        let result: {
            families: ActiveFamilyDeliveries[],
            stats: {
                totalKm: number,
                totalTime: number
            }
            ok: boolean
        } = {
            stats: {
                totalKm: 0,
                totalTime: 0
            },
            families: [],
            ok: false
        } as optimizeRouteResult;
        if (families.length < 1)
            return result;
        var fams: familiesInRoute[] = [];
        {
            var map = new Map<string, familiesInRoute>();
            for (const f of families) {
                let location = f.getDrivingLocation();
                let longlat = toLongLat(location);
                let loc: familiesInRoute = map.get(longlat);
                if (!loc) {
                    loc = {
                        families: [],
                        location: location,
                        longlat: longlat,
                        address: f.address.value
                    };
                    map.set(longlat, loc);
                    fams.push(loc);
                }
                loc.families.push(f);
            }
        }
        let startPoint = await (await families[0].distributionCenter.getRouteStartGeo());
        //manual sorting of the list from closest to farthest
        {
            let temp = fams;
            let sorted = [];
            let lastLoc = startPoint.location();


            let total = temp.length;
            for (let i = 0; i < total; i++) {
                let closest = temp[0];
                let closestIndex = 0;
                let closestDist = GeocodeInformation.GetDistanceBetweenPoints(lastLoc, closest.location);
                for (let j = 0; j < temp.length; j++) {
                    let dist = GeocodeInformation.GetDistanceBetweenPoints(lastLoc, temp[j].location);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestIndex = j;
                        closest = temp[j];
                    }

                }
                lastLoc = closest.location;
                sorted.push(temp.splice(closestIndex, 1)[0]);

            }

            fams = sorted;

        }
        for (const f of fams) {
            if (f.families.length > 0)
                f.families.sort((a, b) => { return (+a.appartment.value) - (+b.appartment.value) });
        }


        let r = await getRouteInfo(fams, useGoogle, startPoint, context);
        if (r.status == 'OK' && r.routes && r.routes.length > 0 && r.routes[0].waypoint_order) {
            result.ok = true;
            let i = 1;

            await foreachSync(r.routes[0].waypoint_order, async (p: number) => {
                let waypoint = fams[p];
                for (const f of waypoint.families) {
                    if (f.routeOrder.value != i) {
                        f.routeOrder.value = i;
                        f.save();
                    }
                    i++;
                }



            });

            for (let i = 0; i < r.routes[0].legs.length; i++) {
                let l = r.routes[0].legs[i];
                result.stats.totalKm += l.distance.value;
                result.stats.totalTime += l.duration.value;
            }
            result.stats.totalKm = Math.round(result.stats.totalKm / 1000);
            result.stats.totalTime = Math.round(result.stats.totalTime / 60);
            helper.totalKm.value = result.stats.totalKm;
            helper.totalTime.value = result.stats.totalTime;
        }
        else {
            result.ok = true;
            let i = 1;
            for (const addre of fams) {
                for (const f of addre.families) {
                    f.routeOrder.value = i++;
                    if (wasChanged(f.routeOrder))
                        await f.save();
                }
            }

        }
        families.sort((a, b) => a.routeOrder.value - b.routeOrder.value);
        result.families = families;

        helper.save();


        return result;

    }
    addSpecial() {
        this.addFamily(f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery).and(
            f.courier.isEqualTo('').and(f.special.isEqualTo(YesNo.Yes))), 'special');
    }
    addFamily(filter: (f: ActiveFamilyDeliveries) => FilterBase, analyticsName: string, selectStreet?: boolean) {
        this.context.openDialog(SelectFamilyComponent, x => x.args = {
            where: f => {
                let where = filter(f);
                if (this.filterCity)
                    where = new AndFilter(f.city.isEqualTo(this.filterCity), where);
                if (this.filterArea)
                    where = new AndFilter(f.area.isEqualTo(this.filterArea), where);
                return where;
            },
            selectStreet,
            distCenter: this.dialog.distCenter.value,
            onSelect: async f => {


                let ok = async () => {
                    await this.performSepcificFamilyAssignment(f, analyticsName);
                };

                if (f.courier.value) {
                    if (selectStreet)
                        return;
                    let c = await f.courier.getTheName();
                    this.dialog.YesNoQuestion(translate(this.settings.lang.theFamily) + ' ' +
                        f.name.value + this.settings.lang.isAlreadyAsignedTo + ' ' + c + ' ' + this.settings.lang.onStatus + ' ' +
                        f.deliverStatus.displayValue + '. ' + this.settings.lang.shouldAssignTo + ' ' + this.helper.name.value + '?', () => {
                            ok();
                        });

                }
                else
                    ok();



            }
        })
    }
    private async performSepcificFamilyAssignment(f: ActiveFamilyDeliveries, analyticsName: string) {
        await this.verifyHelperExistance();
        f.courier.value = this.helper.id.value;
        f.deliverStatus.value = DeliveryStatus.ReadyForDelivery;
        this.dialog.analytics(analyticsName);
        await f.save();
        this.refreshList();
        this.doRefreshRoute();
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

    addSpecific() {
        this.addFamily(f => undefined, 'specific');
    }
    addStreet() {
        this.addFamily(f => f.readyFilter(this.filterCity, this.filterGroup, this.filterArea), 'street', true);
    }
}

export interface AddBoxInfo {
    basketType: string;
    group: string;
    helperId: string;
    city: string;
    area: string;
    numOfBaskets: number;
    preferRepeatFamilies: boolean;
    allRepeat: boolean;
    distCenter: string;

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
export interface routeStats {
    totalKm: number;
    totalTime: number;
}
export interface optimizeRouteResult {
    stats: routeStats;
    families: ActiveFamilyDeliveries[];
    ok: boolean;
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
async function getRouteInfo(families: familiesInRoute[], optimize: boolean, start: GeocodeInformation, context: Context) {
    if (families.length > 25)
        return {};
    let u = new UrlBuilder('https://maps.googleapis.com/maps/api/directions/json');

    let startAndEnd = start.getlonglat();
    let waypoints = 'optimize:' + (optimize ? 'true' : 'false');
    let addresses = [];
    families.forEach(f => {
        if (f.location)
            waypoints += '|' + toLongLat(f.location);
        addresses.push(f.address);
    });
    let args = {
        origin: startAndEnd,
        destination: toLongLat(families[families.length - 1].location),
        waypoints: waypoints,
        language: getLang(context).languageCode,
        key: process.env.GOOGLE_GECODE_API_KEY
    };
    u.addObject(args);


    let r = await (await fetch.default(u.url)).json();
    if (!r || r.status != "OK") {
        let status = 'no response';
        if (r && r.status) {
            status = r.status;
        }
        console.error("error in google route api", status, r, u.url);
    }
    return r;
}
export interface GetBasketStatusActionInfo {
    filterGroup: string;
    filterCity: string;
    filterArea: string;
    helperId: string;
    distCenter: string;
}
export interface GetBasketStatusActionResponse {
    baskets: BasketInfo[];
    cities: CityInfo[];
    areas: CityInfo[];
    special: number;
    repeatFamilies: number;
}
export interface BasketInfo {
    name: string;
    id: string;
    unassignedFamilies: number;

}
function filterRepeatFamilies(sql: SqlBuilder, f: ActiveFamilyDeliveries, fd: FamilyDeliveries, helperId: string) {
    return sql.build(f.family, ' in (select ', fd.family, ' from ', fd, ' where ', fd.courier.isEqualTo(helperId), ')');

}
export interface CityInfo {
    name: string;
    unassignedFamilies: number;
}
interface familiesInRoute {
    location: Location;
    longlat: string;
    families: ActiveFamilyDeliveries[];
    address: string;
}