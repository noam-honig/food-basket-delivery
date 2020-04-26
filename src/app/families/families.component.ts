import { Component, OnInit, ViewChild, Input, ElementRef } from '@angular/core';
import { AndFilter, GridSettings, DataControlSettings, DataControlInfo, DataAreaSettings, StringColumn, BoolColumn, Filter, ServerFunction, unpackWhere, packWhere, Column, dataAreaSettings, IDataAreaSettings, DataArealColumnSetting, GridButton, Allowed } from '@remult/core';

import { Families } from './families';

import { YesNo } from "./YesNo";



import { DialogService } from '../select-popup/dialog';


import { DomSanitizer, Title } from '@angular/platform-browser';

import { FilterBase } from '@remult/core';

import { BusyService } from '@remult/core';
import * as chart from 'chart.js';
import { Stats, FaimilyStatistics, colors } from './stats-action';

import { reuseComponentOnNavigationAndCallMeWhenNavigatingToIt, leaveComponent } from '../custom-reuse-controller-router-strategy';
import { PhoneColumn } from '../model-shared/types';
import { Helpers } from '../helpers/helpers';
import { Route } from '@angular/router';

import { Context } from '@remult/core';

import { FamilyDeliveries, ActiveFamilyDeliveries } from './FamilyDeliveries';


import { saveToExcel } from '../shared/saveToExcel';
import { Roles, distCenterAdminGuard } from '../auth/roles';
import { MatTabGroup } from '@angular/material/tabs';

import { ApplicationSettings } from '../manage/ApplicationSettings';
import { translate } from '../translate';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { UpdateFamilyDialogComponent } from '../update-family-dialog/update-family-dialog.component';
import { FamilyStatus, FamilyStatusColumn } from './FamilyStatus';
import { familyActions } from './familyActions';
import { buildGridButtonFromActions } from './familyActionsWiring';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';



@Component({
    selector: 'app-families',
    templateUrl: './families.component.html',
    styleUrls: ['./families.component.scss']
})
export class FamiliesComponent implements OnInit {
    @Input() problemOnly = false;
    limit = 50;


    showHoverButton: boolean = false;

    constructor(public dialog: DialogService, private san: DomSanitizer, public busy: BusyService, public context: Context, private settings: ApplicationSettings) {
        this.doTest();

        {
            let y = dialog.refreshStatusStats.subscribe(() => {
                this.refreshStats();
            });
            this.onDestroy = () => {
                y.unsubscribe();
            };
        }
        {
            dialog.onDistCenterChange(() => this.refresh(), this);

        }
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
        this.context.openDialog(UpdateFamilyDialogComponent, x => {
            x.args = {
                family: this.families.currentRow,
                onSave: async () => {
                    await this.families.currentRow.showNewDeliveryDialog(this.dialog);
                }
            }
        })

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
        await this.families.getRecords();
    }

    clearSearch() {
        this.searchString = '';
        this.doSearch();
    }
    stats = new Stats();
    async saveToExcel() {
        await saveToExcel<Families, GridSettings<Families>>(
            this.context.for(Families),
            this.families,
            translate('משפחות'),
            this.busy,
            (f, c) => c == f.id || c == f.addressApiResult,
            (f, c) => false,
            async (f, addColumn) => {
                let x = f.getGeocodeInformation();
                let street = f.address.value;
                let house = '';

                let lastName = '';
                let firstName = '';
                if (f.name.value != undefined)
                    lastName = f.name.value.trim();
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
                    } catch{ }
                }
                addColumn("Xשם משפחה", lastName, 's');
                addColumn("Xשם פרטי", firstName, 's');
                addColumn("Xרחוב", street, 's');
                addColumn("Xמספר בית", house, 's');
                function fixPhone(p: PhoneColumn) {
                    if (!p.value)
                        return '';
                    else return p.value.replace(/\D/g, '')
                }
                addColumn("טלפון1X", fixPhone(f.phone1), 's');
                addColumn("טלפון2X", fixPhone(f.phone2), 's');
                addColumn("טלפון3X", fixPhone(f.phone3), 's');
                addColumn("טלפון4X", fixPhone(f.phone4), 's');
                await f.basketType.addBasketTypes(f.quantity, addColumn);

            });
    }



    currentFamilyDeliveries: FamilyDeliveries[] = [];
    async saveCurrentFamilies() {
        await this.families.currentRow.save();
        this.currentFamilyDeliveries = await this.families.currentRow.getDeliveries();
    }
    normalColumns: DataControlInfo<Families>[];
    addressProblemColumns: DataControlInfo<Families>[];
    addressByGoogle: DataControlInfo<Families>;

    families = this.context.for(Families).gridSettings({

        allowUpdate: true,
        allowInsert: this.isAdmin,

        rowCssClass: f => f.status.getCss(),
        numOfColumnsInGrid: 5,
        onEnterRow: async f => {
            if (f.isNew()) {
                f.basketType.value = '';
                f.quantity.value = 1;

                f.special.value = YesNo.No;
                this.currentFamilyDeliveries = [];
            } else {
                if (!this.gridView) {
                    this.currentFamilyDeliveries = [];
                    this.busy.donotWait(async () => this.currentFamilyDeliveries = await this.families.currentRow.getDeliveries());
                }
            }
        },



        get: {
            limit: this.limit,
            where: f => {
                let index = 0;
                let result: FilterBase = undefined;
                let addFilter = (filter: FilterBase) => {
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
                    addFilter(f.name.isContains(this.searchString));
                }
                if (this.problemOnly) {
                    addFilter(f.addressOk.isEqualTo(false));
                }
                
                return result;
            }
            , orderBy: f => f.name
        },
        hideDataArea: true,
        knowTotalRows: true,


        confirmDelete: (h, yes) => this.dialog.confirmDelete(translate('משפחת ') + h.name.value, yes),
        columnSettings: families => {
            let r = [

                {
                    column: families.name,
                    width: '200'
                },
                {
                    column: families.address,
                    width: '250',
                    cssClass: f => {
                        if (!f.addressOk.value)
                            return 'addressProblem';
                        return '';
                    }
                },
                families.phone1,

                { column: families.groups },

                families.familyMembers,
                families.familySource,

                {
                    column: families.internalComment,
                    width: '300'
                },
                families.tz,
                families.tz2,
                families.iDinExcel,
                families.deliveryComments,
                families.special,
                families.createUser,
                families.createDate,
                families.lastUpdateDate,

                { column: families.addressOk, width: '70' },
                { column: families.floor, width: '50' },
                { column: families.appartment, width: '50' },
                { column: families.entrance, width: '50' },
                { column: families.addressComment },
                families.city,
                families.postalCode,
                families.addressByGoogle,
                {
                    caption: 'מה הבעיה של גוגל',
                    getValue: f => f.getGeocodeInformation().whyProblem()
                },
                families.phone1Description,
                families.phone2,
                families.phone2Description,
                families.phone3,
                families.phone3Description,
                families.phone4,
                families.phone4Description,
                families.fixedCourier,
                {
                    caption: 'טלפון משנע',
                    getValue: f => this.context.for(Helpers).lookup(f.courier).phone.value
                },



                families.defaultSelfPickup,
                families.status,
                families.statusUser,
                families.statusDate,

                families.getPreviousDeliveryColumn(),
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
                families.special


            ];
            this.normalColumns = [
                families.name,
                families.address,
                families.phone1,
                families.groups
            ];
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
        gridButton: [{
            name: 'יצוא לאקסל',
            click: () => this.saveToExcel(),
            visible: () => this.isAdmin
        },
        ...buildGridButtonFromActions(familyActions(), this.context,
            {
                afterAction: async () => await this.refresh(),
                dialog: this.dialog,
                where: f => this.families.buildFindOptions().where(f)

            }),
        ],

        rowButtons: [
            {
                name: '',
                icon: 'edit',
                showInLine: true,
                click: async f => {
                    await this.context.openDialog(UpdateFamilyDialogComponent, x => x.args = { family: f });
                }
                , textInMenu: () => 'פרטי משפחה'
            },

            {
                name: 'משלוח חדש',
                click: async f => {
                    await f.showNewDeliveryDialog(this.dialog);
                }
                , visible: f => !f.isNew()

            }
            ,
            {
                name: 'משלוחים קודמים',
                click: async f => {
                    f.showDeliveryHistoryDialog();
                }
                , visible: f => !f.isNew()
            },
            {
                name: 'חפש כתובת בגוגל',
                cssClass: 'btn btn-success',
                click: f => f.openGoogleMaps(),
                visible: f => this.problemOnly
            }

        ]
    });






    packWhere() {
        return {
            where: packWhere(this.context.for(Families).create(), this.families.buildFindOptions().where),
            count: this.families.totalRows
        };
    }






    gridView = true;




    async doTest() {
    }

    onDestroy = () => { };

    ngOnDestroy(): void {
        this.onDestroy();

    }

    groupsTotals: statsOnTab = {
        name: translate('לפי קבוצות'),
        rule: f => f.status.isDifferentFrom(FamilyStatus.RemovedFromList),
        stats: [
        ],
        moreStats: []
    };
    addressProblem: statsOnTab = {
        rule: f => f.addressOk.isEqualTo(false).and(f.status.isDifferentFrom(FamilyStatus.RemovedFromList)),
        moreStats: [],
        name: 'כתובות בעיתיות',
        stats: [
            this.stats.problem
        ],
        showTotal: true

    };
    statTabs: statsOnTab[] = [

        {
            rule: f => undefined,
            showTotal: true,
            name: translate('משפחות'),
            stats: [
                this.stats.active,
                this.stats.outOfList
            ],
            moreStats: []

        },
        this.groupsTotals,
        this.addressProblem
    ]

    async tabChanged() {
        this.currentStatFilter = undefined;
        this.searchString = '';
        await this.refreshFamilyGrid();
        this.updateChart();
        if (this.cols) {
            this.sortColumns(this.cols);
            this.cols = undefined;
        }
        if (this.currentTabStats == this.addressProblem) {
            this.cols = [...this.families.columns.items];
            this.cols.splice(this.families.columns.numOfColumnsInGrid);
            this.prevNumOfCols = this.families.columns.numOfColumnsInGrid;

            this.sortColumns(this.addressProblemColumns);

        }

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
    updateChart() {
        this.pieChartData = [];
        this.pieChartStatObjects = [];
        this.pieChartLabels.splice(0);
        this.colors[0].backgroundColor.splice(0);
        this.currentTabStats = this.statTabs[this.myTab.selectedIndex];
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
            this.pieChartLabels.push('ריק');
        }
        if (this.colors[0].backgroundColor.length == 0) {
            this.colors[0].backgroundColor.push(colors.green, colors.blue, colors.yellow, colors.red, colors.orange, colors.gray);
        }
    }


    refreshStats() {
        if (this.suspend)
            return;
        if (!this.problemOnly)
            this.busy.donotWait(async () => this.stats.getData(this.dialog.distCenter.value).then(st => {

                this.groupsTotals.stats.splice(0);
                this.prepComplexStats(st.groups.map(g => ({ name: g.name, count: g.total })),
                    this.groupsTotals,
                    (f, g) => f.status.isDifferentFrom(FamilyStatus.RemovedFromList).and(f.groups.isContains(g)),
                    (f, g) => f.status.isDifferentFrom(FamilyStatus.RemovedFromList).and(f.groups.isDifferentFrom(g)));



                this.updateChart();
            }));
    }


    private prepComplexStats<type extends { name: string, count: number }>(
        cities: type[],
        stats: statsOnTab,
        equalToFilter: (f: Families, item: string) => FilterBase,
        differentFromFilter: (f: Families, item: string) => AndFilter
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
            let fs = new FaimilyStatistics(b.name, f => equalToFilter(f, b.name), undefined);
            fs.value = +b.count;
            i++;
            if (i <= 8) {
                stats.stats.push(fs);
                firstCities.push(b.name);
            }
            if (i > 8) {
                if (!lastFs) {
                    let x = stats.stats.pop();
                    firstCities.pop();
                    lastFs = new FaimilyStatistics('כל השאר', f => {
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


    @ViewChild('myTab', { static: false }) myTab: MatTabGroup;

    ngOnInit() {

        this.refreshStats();
        this.sortColumns(this.normalColumns);

        //  debugger;
    }
    sortColumns(columns: DataControlInfo<Families>[]) {

        this.families.columns.items.sort((a, b) => a.caption > b.caption ? 1 : a.caption < b.caption ? -1 : 0);
        this.families.columns.numOfColumnsInGrid = columns.length;
        for (let index = 0; index < columns.length; index++) {
            const origItem = columns[index];
            let item: DataControlSettings<Families>;
            if (origItem instanceof Column) {
                item = this.families.columns.items.find(x => x.column == origItem);
            }
            else item = origItem;
            let origIndex = this.families.columns.items.indexOf(item);
            this.families.columns.moveCol(item, -origIndex + index);
        }

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
        data: { name: 'משפחות' }, canActivate: [distCenterAdminGuard]
    }

}

interface statsOnTab {
    name: string,
    stats: FaimilyStatistics[],
    moreStats: FaimilyStatistics[],
    showTotal?: boolean,
    rule: (f: Families) => FilterBase

}
