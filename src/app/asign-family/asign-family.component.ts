import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { Location, GeocodeInformation } from '../shared/googleApiHelpers';
import { UrlBuilder, FilterBase, ServerFunction, StringColumn, DataAreaSettings, BoolColumn, SqlDatabase } from '@remult/core';
import { Families } from '../families/families';
import { DeliveryStatus } from "../families/DeliveryStatus";
import { YesNo } from "../families/YesNo";

import { Helpers } from '../helpers/helpers';
import { DialogService } from '../select-popup/dialog';
import { UserFamiliesList } from '../my-families/user-families';

import { environment } from '../../environments/environment';
import { Route } from '@angular/router';

import { foreachSync } from '../shared/utils';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import * as fetch from 'node-fetch';

import { Context } from '@remult/core';

import { BasketType } from '../families/BasketType';

import { CitiesStats } from '../families/stats-action';
import { SqlBuilder } from '../model-shared/types';
import { BusyService } from '@remult/core';
import { Roles, AdminGuard, distCenterAdminGuard } from '../auth/roles';
import { Groups, GroupsStats } from '../manage/manage.component';
import { SendSmsAction } from './send-sms-action';
import { translate } from '../translate';
import { SelectCompanyComponent } from '../select-company/select-company.component';
import { SelectHelperComponent } from '../select-helper/select-helper.component';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { SelectFamilyComponent } from '../select-family/select-family.component';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { CommonQuestionsComponent } from '../common-questions/common-questions.component';
import { DistributionCenters, DistributionCenterId } from '../manage/distribution-centers';


@Component({
    selector: 'app-asign-family',
    templateUrl: './asign-family.component.html',
    styleUrls: ['./asign-family.component.scss']
})

export class AsignFamilyComponent implements OnInit {
    static route: Route = {
        path: 'assign-families', component: AsignFamilyComponent, canActivate: [distCenterAdminGuard], data: {
            name: 'שיוך משפחות'
        }
    };
    @ViewChild("phoneInput", { static: false }) phoneInput: ElementRef;
    distCenter = new DistributionCenterId(this.context, {
        valueChange: () => this.clearHelperInfo()
    });
    distCenterArea = new DataAreaSettings({ columnSettings: () => [this.distCenter] });
    canSeeCenter() {
        return this.context.isAllowed(Roles.admin);
    }
    assignOnMap() {
        this.familyLists.startAssignByMap(this.filterCity, this.filterGroup,this.distCenter.value);
    }
    translate = translate;
    async searchPhone() {
        this.clearHelperInfo(false);

        if (this.phone.length == 10) {
            let helper = await this.context.for(Helpers).findFirst(h => h.phone.isEqualTo(this.phone).and(h.distributionCenter.isEqualTo(this.distCenter)));
            if (helper) {

                this.initHelper(helper);
            } else {
                helper = this.context.for(Helpers).create();
                helper.phone.value = this.phone;
                helper.distributionCenter.value = this.distCenter.value;
                this.initHelper(helper);

            }

        }
    }
    async initHelper(helper: Helpers) {
        if (helper.theHelperIAmEscorting.value) {
            let other = await this.context.for(Helpers).findFirst(x => x.id.isEqualTo(helper.theHelperIAmEscorting).and(x.distributionCenter.isEqualTo(this.distCenter)));
            if (await this.context.openDialog(YesNoQuestionComponent, q => q.args = {
                question: helper.name.value + ' מוגדר כמלווה של ' + other.name.value + '. האם להציג את המשפחות של ' + other.name.value + '?'
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
            await this.refreshListAndUpdateRouteForFixedCourier();
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

    async refreshListAndUpdateRouteForFixedCourier() {
        await this.refreshList();
        let allFixed = true;
        for (const f of this.familyLists.toDeliver) {
            if (!f.fixedCourier.value)
                allFixed = false;
            if (f.fixedCourier.value != f.courier.value)
                allFixed = false;
        }
        if (allFixed) {
            this.doRefreshRoute();
        }
    }
    filterCity = '';
    allBaskets: BasketInfo = { id: 'undefined', name: 'כל הסלים', unassignedFamilies: 0 };
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
                distCenter: this.distCenter.value,
                onSelect: async h => {
                    if (h) {
                        let families = await this.context.for(Families).find({ where: f => f.courier.isEqualTo(h.id).and(f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)) });
                        this.dialog.YesNoQuestion("להעביר " + families.length + translate(" משפחות מ") + '"' + h.name.value + '"' + " למתנדב " + '"' + this.helper.name.value + '"', async () => {
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

                })));

    }
    smsSent() {
        this.clearHelperInfo();
    }



    async refreshBaskets() {
        await this.busy.donotWait(async () => {

            this.context.for(GroupsStats).find({ limit: 1000, orderBy: f => f.name, where: f => f.familiesCount.isGreaterThan(0).and(f.distCenter.isEqualTo(this.distCenter)) }).then(g => this.groups = g);
            let r = (await AsignFamilyComponent.getBasketStatus({
                filterGroup: this.filterGroup,
                filterCity: this.filterCity,
                helperId: this.helper ? this.helper.id.value : '',
                distCenter: this.distCenter.value
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
            this.specialFamilies = +r.special;
            this.repeatFamilies = +r.repeatFamilies;
            if (this.repeatFamilies)
                this.showRepeatFamilies = true;

        });
    }

    baskets: BasketInfo[] = [];
    cities: CityInfo[] = [];
    specialFamilies = 0;
    showRepeatFamilies = false;
    repeatFamilies = 0;

    preferRepeatFamilies = true;
    async refreshList() {
        await this.refreshBaskets();
        await this.familyLists.initForHelper(this.helper);

    }
    familyLists = new UserFamiliesList(this.context);
    filterGroup = '';
    groups: GroupsStats[] = [];
    phone: string;
    helper: Helpers;

    area: DataAreaSettings<any> = new DataAreaSettings<any>({});
    changeShowCompany() {

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
            distCenter: this.distCenter.value,
            onSelect: async h => {
                if (h) {
                    this.initHelper(await this.context.for(Helpers).findFirst(hh => hh.id.isEqualTo(h.id).and(hh.distributionCenter.isEqualTo(this.distCenter))));
                }
                else {
                    this.clearHelperInfo();
                }
            }
        })
    }




    constructor(private dialog: DialogService, private context: Context, private busy: BusyService, public settings: ApplicationSettings) {
        if (this.distCenter.value === undefined) {
            this.distCenter.value = '';
        }

    }
    filterOptions: BoolColumn[] = [];
    async ngOnInit() {


        this.filterOptions.push(this.settings.showGroupsOnAssing, this.settings.showCityOnAssing, this.settings.showBasketOnAssing, this.settings.showNumOfBoxesOnAssing);
        this.initArea();
        this.familyLists.userClickedOnFamilyOnMap =
            async  families => {
                if (families.length == 1)
                    await this.assignFamilyBasedOnIdFromMap(families[0]);
                else if (families.length > 1) {
                    this.dialog.YesNoQuestion("בנקודה זו יש " + families.length + translate(" משפחות - לשייך את כולן?"), async () => {
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
            let f = await this.context.for(Families).findFirst(f => f.id.isEqualTo(familyId));
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
    lastAssign = Promise.resolve();
    async assignItem(allRepeat?: boolean) {
        let basket = this.basketType;
        if (this.allBaskets == basket)
            basket = undefined;
        await this.verifyHelperExistance();
        this.lastAssign = this.lastAssign.then(async () => {

            let x = await AsignFamilyComponent.AddBox({
                basketType: basket ? basket.id : undefined,
                helperId: this.helper.id.value,
                group: this.filterGroup,
                city: this.filterCity,
                numOfBaskets: allRepeat ? this.repeatFamilies : this.numOfBaskets,
                preferRepeatFamilies: this.preferRepeatFamilies && this.repeatFamilies > 0,
                allRepeat: allRepeat,
                distCenter: this.distCenter.value
            });
            if (x.addedBoxes) {
                this.familyLists.initForFamilies(this.helper, x.families);

                let refreshBaskets = basket == undefined;
                if (x.familiesInSameAddress.length > 0) {
                    if (await this.dialog.YesNoPromise("ישנן עוד " + x.familiesInSameAddress.length + " משפחות באותה הכתובת, האם לשייך גם אותן?")) {
                        await this.busy.doWhileShowingBusy(async () => {
                            this.dialog.analytics('More families in same address');
                            for (const id of x.familiesInSameAddress) {
                                let f = await this.context.for(Families).findFirst(f => f.id.isEqualTo(id).and(f.readyFilter()));
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
                    await this.refreshBaskets();
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
                this.dialog.Info(translate("לא נמצאה משפחה מתאימה"));
            }
        });
    }

    @ServerFunction({ allowed: Roles.distCenterAdmin })
    static async getBasketStatus(info: GetBasketStatusActionInfo, context?: Context, db?: SqlDatabase): Promise<GetBasketStatusActionResponse> {

        let result = {
            baskets: [],
            cities: [],
            special: 0,
            repeatFamilies: 0
        } as GetBasketStatusActionResponse;

        let countFamilies = (additionalWhere?: (f: Families) => FilterBase) => {
            return context.for(Families).count(f => {
                let where = f.readyFilter(info.filterCity, info.filterGroup).and(f.filterDistCenter(info.distCenter));
                if (additionalWhere) {
                    where = where.and(additionalWhere(f));
                }

                return where;
            });
        };

        result.special = await countFamilies(f => f.special.isEqualTo(YesNo.Yes));


        let sql = new SqlBuilder();
        let f = context.for(Families).create();
        let fd = context.for(FamilyDeliveries).create();
        if (info.helperId) {
            let r = await db.execute(sql.build('select count(*) from ', f, ' where ', f.readyFilter(info.filterCity, info.filterGroup).and(f.special.isEqualTo(YesNo.No)), ' and ',
                filterRepeatFamilies(sql, f, fd, info.helperId)));
            result.repeatFamilies = r.rows[0][r.getColumnKeyInResultForIndexInSelect(0)];
        }


        for (let c of await context.for(CitiesStats).find({
            orderBy: ff => [{ column: ff.city }]
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
        for (let b of await context.for(BasketType).find({})) {
            let bi = {
                id: b.id.value,
                name: b.name.value,
                unassignedFamilies: await countFamilies(f => f.basketType.isEqualTo(b.id.value).and(f.special.isEqualTo(YesNo.No)))
            };
            if (bi.unassignedFamilies > 0)
                result.baskets.push(bi);
        }
        result.baskets.sort((a, b) => b.unassignedFamilies - a.unassignedFamilies);


        return result;
    }
    @ServerFunction({ allowed: Roles.distCenterAdmin })
    static async RefreshRoute(helperId: string, useGoogle: boolean, context?: Context) {
        let existingFamilies = await context.for(Families).find({
            where: f => f.courier.isEqualTo(helperId).and(
                f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)).and(
                    f.distributionCenter.isAllowedForUser())
        });
        let h = await context.for(Helpers).findFirst(h => h.id.isEqualTo(helperId));
        return await AsignFamilyComponent.optimizeRoute(h, existingFamilies, context, useGoogle);
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

        let existingFamilies = await context.for(Families).find({
            where: f => f.courier.isEqualTo(info.helperId).and(
                f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery).and(
                    f.distributionCenter.isAllowedForUser()).and(f.filterDistCenter(info.distCenter)))
        });
        let locationReferenceFamilies = [...existingFamilies];
        if (locationReferenceFamilies.length == 0) {
            let from = new Date();
            from.setDate(from.getDate() - 1);
            locationReferenceFamilies = await context.for(Families).find({
                where: f => f.courier.isEqualTo(info.helperId).and(f.deliverStatus.isAResultStatus()).and(f.deliveryStatusDate.isGreaterOrEqualTo(from)),
                orderBy: f => [{ column: f.deliveryStatusDate, descending: true }],
                limit: 1
            });
        }
        function buildWhere(f: Families) {
            let where = f.readyFilter(info.city, info.group).and(
                f.special.isDifferentFrom(YesNo.Yes).and(f.filterDistCenter(info.distCenter))
            );
            if (info.basketType != undefined)
                where = where.and(
                    f.basketType.isEqualTo(info.basketType));
            return where;
        }
        for (let i = 0; i < info.numOfBaskets; i++) {

            let getFamilies = async () => {

                let f = context.for(Families).create();
                let sql = new SqlBuilder();
                sql.addEntity(f, 'Families');
                let r = (await db.execute(sql.query({
                    select: () => [f.id, f.addressLatitude, f.addressLongitude],
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
                        id: x[r.getColumnKeyInResultForIndexInSelect(0)],
                        addressLatitude: +x[r.getColumnKeyInResultForIndexInSelect(1)],
                        addressLongitude: +x[r.getColumnKeyInResultForIndexInSelect(2)]
                    } as familyQueryResult;

                }) as familyQueryResult[];


            }

            let waitingFamilies = await getFamilies();
            if (info.preferRepeatFamilies && waitingFamilies.length == 0 && !info.allRepeat) {
                info.preferRepeatFamilies = false;
                waitingFamilies = await getFamilies();
            }

            let addFamilyToResult = async (id: string) => {
                let family = await context.for(Families).findFirst(f => f.id.isEqualTo(id));
                family.courier.value = info.helperId;
                await family.save();
                if (family.addressOk.value) {
                    let sameLocationFamilies = await context.for(Families).find({
                        where: f => buildWhere(f).and(f.addressLongitude.isEqualTo(family.addressLongitude).and(f.addressLatitude.isEqualTo(family.addressLatitude)))
                            .and(f.distributionCenter.isAllowedForUser()).and(f.filterDistCenter(info.distCenter))
                    });
                    if (sameLocationFamilies.length > 0) {
                        result.familiesInSameAddress.push(...(sameLocationFamilies).map(x => x.id.value));
                    }
                }
                result.addedBoxes++;
                existingFamilies.push(family);
                locationReferenceFamilies.push(family);
            }

            if (waitingFamilies.length > 0) {

                if (locationReferenceFamilies.length == 0) {
                    let position = Math.trunc(Math.random() * waitingFamilies.length);
                    await addFamilyToResult(waitingFamilies[position].id);
                }
                else {

                    let getDistance = (x: Location) => {
                        let r = 1000000;
                        if (!x)
                            return r;
                        locationReferenceFamilies.forEach(ef => {
                            let loc = ef.getGeocodeInformation().location();
                            if (loc) {
                                let dis = GeocodeInformation.GetDistanceBetweenPoints(x, loc);
                                if (dis < r)
                                    r = dis;
                            }
                        });
                        return r;

                    }

                    let smallFamily = waitingFamilies[0];
                    let dist = getDistance({
                        lat: smallFamily.addressLatitude,
                        lng: smallFamily.addressLongitude
                    });
                    for (let i = 1; i < waitingFamilies.length; i++) {
                        let f = waitingFamilies[i];
                        let myDist = getDistance({ lng: f.addressLongitude, lat: f.addressLatitude });
                        if (myDist < dist) {
                            dist = myDist;
                            smallFamily = waitingFamilies[i]
                        }
                    }
                    await addFamilyToResult(smallFamily.id);


                }

            }

        }



        existingFamilies.sort((a, b) => a.routeOrder.value - b.routeOrder.value);
        result.families = await context.for(Families).toPojoArray(existingFamilies);

        result.familiesInSameAddress = result.familiesInSameAddress.filter((x, i) => !existingFamilies.find(f => f.id.value == x) && result.familiesInSameAddress.indexOf(x) == i);

        return result;
    }

    static async optimizeRoute(helper: Helpers, families: Families[], context: Context, useGoogle: boolean) {

        if (families.length < 1)
            return;
        let result = {
            stats: {
                totalKm: 0,
                totalTime: 0
            },
            families: [],
            ok: false
        } as optimizeRouteResult;

        var fams: familiesInRoute[] = [];
        {
            var map = new Map<string, familiesInRoute>();
            for (const f of families) {
                let geo = f.getGeocodeInformation();
                let longlat = geo.getlonglat();
                let loc: familiesInRoute = map.get(longlat);
                if (!loc) {
                    loc = {
                        families: [],
                        geo: geo,
                        longlat: longlat,
                        address: f.address.value
                    };
                    map.set(longlat, loc);
                    fams.push(loc);
                }
                loc.families.push(f);
            }
        }

        //manual sorting of the list from closest to farthest
        {
            let temp = fams;
            let sorted = [];
            let lastLoc = await (await helper.distributionCenter.getRouteStartGeo()).location();


            let total = temp.length;
            for (let i = 0; i < total; i++) {
                let closest = temp[0];
                let closestIndex = 0;
                let closestDist = GeocodeInformation.GetDistanceBetweenPoints(lastLoc, closest.geo.location());
                for (let j = 0; j < temp.length; j++) {
                    let dist = GeocodeInformation.GetDistanceBetweenPoints(lastLoc, temp[j].geo.location());
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestIndex = j;
                        closest = temp[j];
                    }

                }
                lastLoc = closest.geo.location();
                sorted.push(temp.splice(closestIndex, 1)[0]);

            }
            fams = sorted;
        }
        for (const f of fams) {
            if (f.families.length > 0)
                f.families.sort((a, b) => { return (+a.appartment.value) - (+b.appartment.value) });
        }


        let r = await getRouteInfo(fams, useGoogle,await helper.distributionCenter.getRouteStartGeo(), context);
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
            families.sort((a, b) => a.routeOrder.value - b.routeOrder.value);
            for (let i = 0; i < r.routes[0].legs.length - 1; i++) {
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
            await foreachSync(families, async (f) => {
                f.routeOrder.value = i++;
                if (f.routeOrder.value != f.routeOrder.originalValue)
                    await f.save();
            });
        }
        result.families = await context.for(Families).toPojoArray(families);

        helper.save();


        return result;

    }
    addSpecial() {
        this.addFamily(f => f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery).and(
            f.courier.isEqualTo('').and(f.special.isEqualTo(YesNo.Yes))), 'special');
    }
    addFamily(filter: (f: Families) => FilterBase, analyticsName: string, selectStreet?: boolean) {
        this.context.openDialog(SelectFamilyComponent, x => x.args = {
            where: f => {
                if (this.filterCity)
                    return f.city.isEqualTo(this.filterCity).and(filter(f));
                return filter(f);
            },
            selectStreet,
            distCenter:this.distCenter.value,
            onSelect: async f => {


                let ok = async () => {
                    await this.performSepcificFamilyAssignment(f, analyticsName);
                };

                if (f.courier.value) {
                    if (selectStreet)
                        return;
                    let c = await f.courier.getTheName();
                    this.dialog.YesNoQuestion(translate('משפחת ') +
                        f.name.value + ' כבר משוייכת ל' + c + ' בסטטוס ' +
                        f.deliverStatus.displayValue + '. האם לשייך אותו למשנע ' + this.helper.name.value + '?', () => {
                            ok();
                        });

                }
                else
                    ok();



            }
        })
    }
    private async performSepcificFamilyAssignment(f: Families, analyticsName: string) {
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
            await this.helper.save();
        }
        Helpers.addToRecent(this.helper);
    }

    addSpecific() {
        this.addFamily(f => f.deliverStatus.isDifferentFrom(DeliveryStatus.NotInEvent).and(f.deliverStatus.isDifferentFrom(DeliveryStatus.RemovedFromList).and(f.blockedBasket.isEqualTo(false))), 'specific');
    }
    addStreet() {
        this.addFamily(f => f.readyFilter(this.filterCity, this.filterGroup), 'street', true);
    }
}

export interface AddBoxInfo {
    basketType: string;
    group: string;
    helperId: string;
    city: string;
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
    id: string;
    addressLatitude: number;
    addressLongitude: number;
}
export interface routeStats {
    totalKm: number;
    totalTime: number;
}
export interface optimizeRouteResult {
    stats: routeStats;
    families: any[];
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
async function getRouteInfo(families: familiesInRoute[], optimize: boolean,start:GeocodeInformation, context: Context) {
    let u = new UrlBuilder('https://maps.googleapis.com/maps/api/directions/json');

    let startAndEnd = start;
    let waypoints = 'optimize:' + (optimize ? 'true' : 'false');
    let addresses = [];
    families.forEach(f => {
        if (f.geo.location())
            waypoints += '|' + f.geo.getlonglat();
        addresses.push(f.address);
    });
    let args = {
        origin: startAndEnd,
        destination: families[families.length - 1].geo.getlonglat(),
        waypoints: waypoints,
        language: 'he',
        key: process.env.GOOGLE_GECODE_API_KEY
    };
    u.addObject(args);

    let r = await (await fetch.default(u.url)).json();

    return r;
}
export interface GetBasketStatusActionInfo {
    filterGroup: string;
    filterCity: string;
    helperId: string;
    distCenter: string;
}
export interface GetBasketStatusActionResponse {
    baskets: BasketInfo[];
    cities: CityInfo[];
    special: number;
    repeatFamilies: number;
}
export interface BasketInfo {
    name: string;
    id: string;
    unassignedFamilies: number;

}
function filterRepeatFamilies(sql: SqlBuilder, f: Families, fd: FamilyDeliveries, helperId: string) {
    return sql.build(f.id, ' in (select ', fd.family, ' from ', fd, ' where ', fd.courier.isEqualTo(helperId), ')');

}
export interface CityInfo {
    name: string;
    unassignedFamilies: number;
}
interface familiesInRoute {
    geo: GeocodeInformation;
    longlat: string;
    families: Families[];
    address: string;
}