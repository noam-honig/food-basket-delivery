import { Component, OnInit, ViewChild, Input, ElementRef } from '@angular/core';
import { AndFilter, Filter, filterOf, ServerFunction, SqlDatabase } from '@remult/core';

import { Families, AreaColumn, sendWhatsappToFamily, canSendWhatsapp, GroupsValue } from './families';

import { YesNo } from "./YesNo";



import { DialogService, DestroyHelper } from '../select-popup/dialog';


import { DomSanitizer } from '@angular/platform-browser';



import { BusyService, DataControlInfo, DataControlSettings, GridSettings, openDialog } from '@remult/angular';
import * as chart from 'chart.js';
import { Stats, FaimilyStatistics, colors } from './stats-action';

import { reuseComponentOnNavigationAndCallMeWhenNavigatingToIt, leaveComponent } from '../custom-reuse-controller-router-strategy';
import { SqlBuilder, SqlFor } from '../model-shared/types';
import { Phone } from "../model-shared/Phone";
import { Route } from '@angular/router';

import { Context } from '@remult/core';



import { saveToExcel } from '../shared/saveToExcel';
import { Roles, AdminGuard } from '../auth/roles';
import { MatTabGroup } from '@angular/material/tabs';

import { ApplicationSettings, getCustomColumnVisible, getSettings } from '../manage/ApplicationSettings';

import { FamilyStatus } from './FamilyStatus';
import { NewDelivery, UpdateArea, UpdateBasketType, UpdateDefaultVolunteer, UpdateFamilySource, updateGroup, UpdateQuantity, UpdateSelfPickup, UpdateStatus } from './familyActions';

import { MergeFamiliesComponent } from '../merge-families/merge-families.component';
import { sortColumns } from '../shared/utils';
import { columnOrderAndWidthSaver } from './columnOrderAndWidthSaver';
import { BasketType, defaultBasketType } from './BasketType';
import { use } from '../translate';




@Component({
    selector: 'app-families',
    templateUrl: './families.component.html',
    styleUrls: ['./families.component.scss']
})
export class FamiliesComponent implements OnInit {
    @ServerFunction({ allowed: Roles.admin })
    static async getCities(context?: Context, db?: SqlDatabase): Promise<{ city: string, count: number }[]> {
        var sql = new SqlBuilder();
        let f = SqlFor(context.for(Families));
        let r = await db.execute(sql.query({
            from: f,
            select: () => [f.city, 'count (*) as count'],
            where: () => [f.status.isEqualTo(FamilyStatus.Active)],
            groupBy: () => [f.city],
            orderBy: [{ column: f.city }]

        }));
        return r.rows.map(x => ({
            city: x.city,
            count: x.count
        }));
    }

    test = new NewDelivery(this.context);
    limit = 25;


    showHoverButton: boolean = false;

    constructor(public dialog: DialogService, private san: DomSanitizer, public busy: BusyService, public context: Context, public settings: ApplicationSettings) {

    }

    filterBy(s: FaimilyStatistics) {
        this.families.get({
            where: s.rule,
            limit: this.limit,
            orderBy: f => [f.name]


        });
    }
    isAdmin = this.context.isAllowed(Roles.admin);

    resetRow() {
        var focus: Families;
        if (this.families.currentRow.isNew()) {
            let i = this.families.items.indexOf(this.families.currentRow);
            if (i > 0)
                focus = this.families.items[i - 1];
        }
        this.families.currentRow.undoChanges();
        if (focus)
            this.families.setCurrentRow(focus);
    }
    quickAdd() {
        this.families.addNewRow();
        this.families.currentRow.name.value = this.searchString;
        this.families.currentRow.showFamilyDialog({
            focusOnAddress: true,
            onSave: async () => {
                await this.families.currentRow.showNewDeliveryDialog(this.dialog, this.settings, this.busy);
                this.refreshStats();
            }
        });


    }
    changedRowsCount() {
        let r = 0;
        this.families.items.forEach(f => {
            if (f.wasChanged())

                r++;
        });
        return r;
    }
    async saveAll() {
        let wait = [];
        this.families.items.forEach(f => {
            if (f.wasChanged())
                wait.push(f.save());
        });
        await Promise.all(wait);
        this.refreshStats();
    }
    public pieChartLabels: string[] = [];
    public pieChartData: number[] = [];
    pieChartStatObjects: FaimilyStatistics[] = [];
    public colors: Array<any> = [
        {
            backgroundColor: []

        }];

    public pieChartType: string = 'pie';
    currentStatFilter: FaimilyStatistics = undefined;

    options: chart.ChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        legend: {
            position: 'right',
            onClick: (event: MouseEvent, legendItem: any) => {
                this.setCurrentStat(this.pieChartStatObjects[legendItem.index]);
                return false;
            }
        },
    };
    public chartClicked(e: any): void {
        if (e.active && e.active.length > 0) {
            this.setCurrentStat(this.pieChartStatObjects[e.active[0]._index]);

        }
    }
    setCurrentStat(s: FaimilyStatistics) {
        this.currentStatFilter = s;
        this.searchString = '';
        this.refreshFamilyGrid();
    }
    searchString = '';
    async doSearch() {
        if (this.families.currentRow && this.families.currentRow.wasChanged())
            return;
        this.busy.donotWait(async () =>
            await this.refreshFamilyGrid());
    }
    async refreshFamilyGrid() {
        this.families.page = 1;
        await this.families.reloadData();
    }

    clearSearch() {
        this.searchString = '';
        this.doSearch();
    }
    stats = new Stats(this.context);
    async saveToExcel() {
        await saveFamiliesToExcel(this.context, this.families, this.busy, this.settings.lang.families);
    }





    normalColumns: DataControlInfo<Families>[];
    addressProblemColumns: DataControlInfo<Families>[];
    addressByGoogle: DataControlInfo<Families>;

    families = new GridSettings(this.context.for(Families), {
        showFilter: true,
        allowUpdate: true,
        allowInsert: this.isAdmin,

        rowCssClass: f => f.status.getCss(),
        numOfColumnsInGrid: 5,
        enterRow: async f => {
            if (f.isNew()) {
                f.basketType = this.context.get(defaultBasketType);
                f.quantity = 1;
                f.special = YesNo.No;
            } else {

            }
        },




        rowsInPage: this.limit,
        where: f => {
            let index = 0;
            let result: Filter = undefined;
            let addFilter = (filter: Filter) => {
                if (result)
                    result = new AndFilter(result, filter);
                else result = filter;
            }

            if (this.currentStatFilter) {
                addFilter(this.currentStatFilter.rule(f));
            } else {
                if (this.myTab)
                    index = this.myTab.selectedIndex;
                if (index < 0 || index == undefined)
                    index = 0;

                addFilter(this.statTabs[index].rule(f));
            }
            if (this.searchString) {
                addFilter(f.name.contains(this.searchString));
            }

            return result;
        }
        , orderBy: f => f.name
        ,

        knowTotalRows: true,



        columnSettings: families => {
            let r: DataControlInfo<Families>[] = [

                {
                    column: families.name,
                    width: '200'
                },
                {
                    column: families.address,
                    width: '250',
                    clickIcon: 'edit',
                    click: (f) => {
                        f.showFamilyDialog({ focusOnAddress: true });
                    },
                    cssClass: f => {
                        if (!f.addressOk)
                            return 'addressProblem';
                        return '';
                    }
                },
                families.phone1,
                families.groups,

                families.email,

                families.familyMembers,
                families.familySource,
                {
                    column: families.internalComment,
                    width: '300'
                },
                families.tz,
                families.tz2,
                families.iDinExcel,

                families.special,
                families.createUser,
                families.createDate,
                families.lastUpdateDate,

                { column: families.addressOk, width: '70' },
                { column: families.floor, width: '50' },
                { column: families.appartment, width: '50' },
                { column: families.entrance, width: '50' },
                { column: families.buildingCode, width: '50' },
                { column: families.addressComment },
                families.city,
                families.area,
                families.postalCode,
                families.addressByGoogle,
                {
                    caption: this.settings.lang.googleApiProblem,
                    getValue: f => f.addressHelper.getGeocodeInformation().whyProblem()
                },
                families.phone1Description,
                families.phone2,
                families.phone2Description,
                families.phone3,
                families.phone3Description,
                families.phone4,
                families.phone4Description,



                families.defaultSelfPickup,
                families.status,
                families.statusUser,
                families.statusDate,
                Families.getPreviousDeliveryColumn(families),
                families.previousDeliveryComment,
                families.previousDeliveryDate,
                families.socialWorker,
                families.socialWorkerPhone1,
                families.socialWorkerPhone2,
                families.birthDate,
                families.nextBirthday,
                families.basketType,
                families.quantity,
                families.deliveryComments,
                families.fixedCourier,
                families.special,
                families.numOfActiveReadyDeliveries


            ];
            for (const c of [families.custom1, families.custom2, families.custom3, families.custom4]) {
                if (getCustomColumnVisible(c)) {
                    r.push(c);
                }
            }
            this.normalColumns = [
                families.name,
                families.address,
                families.phone1
            ];
            if (this.settings.isSytemForMlt()) {
                this.normalColumns.push(
                    families.email,
                    families.createDate
                );
            } else {
                this.normalColumns.push(
                    families.groups
                );
            }
            this.addressProblemColumns = [
                families.name,
                families.addressByGoogle,
                families.addressOk,
                families.address,
                families.appartment,
                families.floor,
                families.entrance,
                families.addressComment
            ]
            return r;
        },
        gridButtons: ([
            ...[
                new NewDelivery(this.context),
                new updateGroup(this.context),
                new UpdateArea(this.context),
                new UpdateStatus(this.context),
                new UpdateSelfPickup(this.context),
                new UpdateDefaultVolunteer(this.context),
                new UpdateBasketType(this.context),
                new UpdateQuantity(this.context),
                new UpdateFamilySource(this.context)
            ].map(x => x.gridButton(
                {
                    afterAction: async () => await this.refresh(),
                    dialog: this.dialog,
                    userWhere: f => this.families.getFilterWithSelectedRows().where(f),
                    settings: this.settings
                }))
            , {
                name: this.settings.lang.exportToExcel,
                click: () => this.saveToExcel(),
                visible: () => this.isAdmin
            }, {
                name: this.settings.lang.mergeFamilies,
                click: async () => {
                    await openDialog(MergeFamiliesComponent, x => x.families = [...this.families.selectedRows], y => {
                        if (y.merged)
                            this.refresh();
                    });

                },
                visible: () => this.isAdmin && this.families.selectedRows.length > 1
            }]),
        allowSelection: true,
        rowButtons: [
            {
                name: '',
                icon: 'edit',
                showInLine: true,
                click: async f => {
                    await f.showFamilyDialog();
                }
                , textInMenu: () => this.settings.lang.familyDetails
            },

            {
                name: this.settings.lang.newDelivery,
                icon: 'add_shopping_cart',
                click: async f => {
                    await f.showNewDeliveryDialog(this.dialog, this.settings, this.busy);
                }
                , visible: f => !f.isNew()

            }
            ,
            {
                name: this.settings.lang.sendWhatsAppToFamily,
                click: f => sendWhatsappToFamily(f, this.context),
                visible: f => canSendWhatsapp(f),
                icon: 'textsms'
            }
            ,
            {
                name: this.settings.lang.familyDeliveries,
                click: async f => {
                    f.showDeliveryHistoryDialog({ settings: this.settings, dialog: this.dialog, busy: this.busy });
                }
                , visible: f => !f.isNew()
            }

        ]
    });



    destroyHelper = new DestroyHelper();
    ngOnDestroy(): void {
        this.destroyHelper.destroy();
    }

    groupsTotals: statsOnTab = {
        name: this.settings.lang.byGroups,
        rule: f => f.status.isEqualTo(FamilyStatus.Active),
        stats: [
        ],
        moreStats: []
    };
    addressProblem: statsOnTab = {
        rule: f => f.addressOk.isEqualTo(false).and(f.status.isEqualTo(FamilyStatus.Active)).and(f.defaultSelfPickup.isEqualTo(false)),
        moreStats: [],
        name: this.settings.lang.adderssProblems,
        stats: [
            this.stats.problem
        ],
        showTotal: true

    };
    statTabs: statsOnTab[] = [

        {
            rule: f => f.status.isEqualTo(FamilyStatus.Active),
            showTotal: true,
            name: this.settings.lang.activeFamilies,
            stats: [
                this.stats.active,

            ],
            moreStats: []

        },
        this.groupsTotals,
        this.addressProblem,
        {
            rule: f => f.status.isEqualTo(FamilyStatus.Active),
            showTotal: false,
            name: this.settings.lang.defaultVolunteer,
            stats: [],
            moreStats: [],
            refreshStats: async x => {
                let familiesByVolunteer = await Families.getDefaultVolunteers();
                this.prepComplexStats(familiesByVolunteer.map(g => ({ name: g.name, count: g.count, id: g.id })),
                    x,
                    (f, g) => f.status.isEqualTo(FamilyStatus.Active).and(f.fixedCourier.isEqualTo(g.id)),
                    (f, g) => f.status.isEqualTo(FamilyStatus.Active).and(f.fixedCourier.isDifferentFrom(g.id)));
            }
        },
        {
            rule: f => f.status.isEqualTo(FamilyStatus.Active),
            showTotal: false,
            name: this.settings.lang.city,
            stats: [],
            moreStats: [],
            refreshStats: async x => {
                let areas = await FamiliesComponent.getCities();
                this.prepComplexStats(areas.map(g => ({ name: g.city, count: g.count })),
                    x,
                    (f, g) => f.status.isEqualTo(FamilyStatus.Active).and(f.city.isEqualTo(g.name)),
                    (f, g) => f.status.isEqualTo(FamilyStatus.Active).and(f.city.isDifferentFrom(g.name)));
            }
        },

        {
            rule: f => f.status.isEqualTo(FamilyStatus.Active),
            showTotal: false,
            name: this.settings.lang.region,
            stats: [],
            moreStats: [],
            refreshStats: async x => {
                let areas = await Families.getAreas();
                this.prepComplexStats(areas.map(g => ({ name: g.area, count: g.count })),
                    x,
                    (f, g) => f.status.isEqualTo(FamilyStatus.Active).and(f.area.isEqualTo(g.name)),
                    (f, g) => f.status.isEqualTo(FamilyStatus.Active).and(f.area.isDifferentFrom(g.name)));
            }
        },

        {
            rule: f => undefined,
            showTotal: true,
            name: this.settings.lang.allFamilies,
            stats: [
                this.stats.active,
                this.stats.frozen,
                this.stats.outOfList,
                this.stats.toDelete

            ],
            moreStats: []

        }
    ]

    async tabChanged() {
        this.currentStatFilter = undefined;
        this.searchString = '';
        await this.refreshFamilyGrid();
        this.updateChart();
        this.columnSaver.suspend = true;
        if (this.cols) {
            sortColumns(this.families, this.cols);
            this.cols = undefined;
        }
        if (this.currentTabStats == this.addressProblem) {
            this.cols = [...this.families.columns.items];
            this.cols.splice(this.families.columns.numOfColumnsInGrid);
            this.prevNumOfCols = this.families.columns.numOfColumnsInGrid;

            sortColumns(this.families, this.addressProblemColumns);

        }
        this.columnSaver.suspend = false;

    }
    clearStat() {
        this.currentStatFilter = undefined;
        this.searchString = '';
        this.refreshFamilyGrid();

    }
    cols: DataControlSettings<Families>[];
    prevNumOfCols = 5;
    currentTabStats: statsOnTab = { name: '', stats: [], moreStats: [], rule: undefined };
    previousTabStats: statsOnTab = this.currentTabStats;
    showChart = true;
    async updateChart() {

        this.currentTabStats = this.statTabs[this.myTab.selectedIndex];
        if (this.currentTabStats.refreshStats)
            await this.currentTabStats.refreshStats(this.currentTabStats);
        this.pieChartData = [];
        this.pieChartStatObjects = [];
        this.pieChartLabels.splice(0);
        this.colors[0].backgroundColor.splice(0);
        let stats = this.currentTabStats.stats;

        stats.forEach(s => {
            if (s.value > 0) {
                this.pieChartLabels.push(s.name + ' ' + s.value);
                this.pieChartData.push(s.value);
                if (s.color != undefined)
                    this.colors[0].backgroundColor.push(s.color);
                this.pieChartStatObjects.push(s);

            }
        });
        if (this.pieChartData.length == 0) {
            this.pieChartData.push(0);
            this.pieChartLabels.push(use.language.empty);
        }
        if (this.colors[0].backgroundColor.length == 0) {
            this.colors[0].backgroundColor.push(colors.green, colors.blue, colors.yellow, colors.red, colors.orange, colors.gray);
        }
    }


    refreshStats() {
        if (this.suspend)
            return;

        this.busy.donotWait(async () => this.stats.getData(this.dialog.distCenter.evilGetId()).then(st => {

            this.groupsTotals.stats.splice(0);
            this.prepComplexStats(st.groups.map(g => ({ name: g.name, count: g.total })),
                this.groupsTotals,
                (f, g) => f.status.isEqualTo(FamilyStatus.Active).and(f.groups.contains(g.name)),
                (f, g) => f.status.isEqualTo(FamilyStatus.Active).and(f.groups.isDifferentFrom(new GroupsValue(g.name))));



            this.updateChart();
        }));
    }


    private prepComplexStats<type extends { name: string, count: number }>(
        cities: type[],
        stats: statsOnTab,
        equalToFilter: (f: filterOf<Families>, item: type) => Filter,
        differentFromFilter: (f: filterOf<Families>, item: type) => AndFilter
    ) {
        stats.stats.splice(0);
        stats.moreStats.splice(0);
        let i = 0;
        let lastFs: FaimilyStatistics;
        let firstCities = [];
        cities.sort((a, b) => b.count - a.count);
        cities.forEach(b => {
            if (b.count == 0)
                return;
            let fs = new FaimilyStatistics(b.name, f => equalToFilter(f, b), undefined);
            fs.value = +b.count;
            i++;
            if (i <= 8) {
                stats.stats.push(fs);
                firstCities.push(b);
            }
            if (i > 8) {
                if (!lastFs) {
                    let x = stats.stats.pop();
                    firstCities.pop();
                    lastFs = new FaimilyStatistics(this.settings.lang.allOthers, f => {
                        let r = differentFromFilter(f, firstCities[0]);
                        for (let index = 1; index < firstCities.length; index++) {
                            r = r.and(differentFromFilter(f, firstCities[index]));
                        }
                        return r;
                    }, undefined);
                    stats.moreStats.push(x);
                    lastFs.value = x.value;
                    stats.stats.push(lastFs);
                }
            }
            if (i > 8) {
                lastFs.value += fs.value;
                stats.moreStats.push(fs);
            }
        });
        stats.moreStats.sort((a, b) => a.name.localeCompare(b.name));
    }

    columnSaver = new columnOrderAndWidthSaver(this.families);
    @ViewChild('myTab', { static: false }) myTab: MatTabGroup;

    ngOnInit() {

        this.refreshStats();
        sortColumns(this.families, this.normalColumns);
        this.columnSaver.load('families');
    }

    statTotal(t: statsOnTab) {
        if (!t.showTotal)
            return;
        let r = 0;
        t.stats.forEach(x => r += +x.value);
        return " - " + r;
    }

    [reuseComponentOnNavigationAndCallMeWhenNavigatingToIt]() {
        this.suspend = false;

        this.refresh();
    }
    suspend = false;
    [leaveComponent]() {

        this.suspend = true;
    }
    refresh() {
        this.refreshFamilyGrid();
        this.refreshStats();
    }

    static route: Route = {
        path: 'families',
        component: FamiliesComponent,
        canActivate: [AdminGuard]
    }

}

interface statsOnTab {
    name: string,
    stats: FaimilyStatistics[],
    moreStats: FaimilyStatistics[],
    showTotal?: boolean,
    rule: (f: filterOf<Families>) => Filter,
    refreshStats?: (stats: statsOnTab) => Promise<void>

}
export async function saveFamiliesToExcel(context: Context, gs: GridSettings<Families>, busy: BusyService, name) {
    await saveToExcel<Families, GridSettings<Families>>(getSettings(context), context.for(Families), gs, name, busy, (f, c) => c == f.$.id || c == f.$.addressApiResult, (f, c) => false, async (f, addColumn) => {
        let x = f.addressHelper.getGeocodeInformation();
        let street = f.address;
        let house = '';
        let lastName = '';
        let firstName = '';
        if (f.name != undefined)
            lastName = f.name.trim();
        let i = lastName.lastIndexOf(' ');
        if (i >= 0) {
            firstName = lastName.substring(i, lastName.length).trim();
            lastName = lastName.substring(0, i).trim();
        }
        {
            try {
                for (const addressComponent of x.info.results[0].address_components) {
                    switch (addressComponent.types[0]) {
                        case "route":
                            street = addressComponent.short_name;
                            break;
                        case "street_number":
                            house = addressComponent.short_name;
                            break;
                    }
                }
            }
            catch { }
        }
        addColumn("X" + use.language.lastName, lastName, 's');
        addColumn("X" + use.language.firstName, firstName, 's');
        addColumn("X" + use.language.streetName, street, 's');
        addColumn("X" + use.language.houseNumber, house, 's');
        function fixPhone(p: Phone) {
            if (!p || !p.thePhone)
                return '';
            else
                return p.thePhone.replace(/\D/g, '');
        }
        addColumn("X" + use.language.phone1, fixPhone(f.phone1), 's');
        addColumn("X" + use.language.phone2, fixPhone(f.phone2), 's');
        addColumn("X" + use.language.phone3, fixPhone(f.phone3), 's');
        addColumn("X" + use.language.phone4, fixPhone(f.phone4), 's');
        addColumn("X" + use.language.phone1 + 'orig', f.phone1.thePhone, 's');
        addColumn("X" + use.language.phone2 + 'orig', f.phone2.thePhone, 's');
        addColumn("X" + use.language.phone3 + 'orig', f.phone3.thePhone, 's');
        addColumn("X" + use.language.phone4 + 'orig', f.phone4.thePhone, 's');
        await f.basketType.addBasketTypes(f.quantity, addColumn);
    });
}

function test(arr: any) {
    console.log(arr);
    return arr;
}