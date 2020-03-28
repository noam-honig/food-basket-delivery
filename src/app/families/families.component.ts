import { Component, OnInit, ViewChild, Input, ElementRef } from '@angular/core';
import { AndFilter, GridSettings, DataControlSettings, DataControlInfo, DataAreaSettings, StringColumn, BoolColumn, Filter, ServerFunction, unpackWhere, packWhere } from '@remult/core';

import { Families, GroupsColumn } from './families';
import { DeliveryStatus, DeliveryStatusColumn } from "./DeliveryStatus";

import { YesNo } from "./YesNo";


import { BasketType, BasketId } from "./BasketType";

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

import { FamilyDeliveries } from './FamilyDeliveries';
import { UpdateFamilyComponent } from '../update-family/update-family.component';

import { saveToExcel } from '../shared/saveToExcel';
import { PreviewFamilyComponent } from '../preview-family/preview-family.component';
import { Roles, AdminGuard } from '../auth/roles';
import { MatTabGroup } from '@angular/material/tabs';
import { QuickAddFamilyComponent } from '../quick-add-family/quick-add-family.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { ScrollDispatcher, CdkScrollable } from '@angular/cdk/scrolling';
import { Subscription } from 'rxjs';
import { translate } from '../translate';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { UpdateGroupDialogComponent } from '../update-group-dialog/update-group-dialog.component';
import { Groups } from '../manage/manage.component';
import { FamilySourceId } from './FamilySources';
const addGroupAction = ' להוסיף ';
const replaceGroupAction = ' להחליף ';
@Component({
    selector: 'app-families',
    templateUrl: './families.component.html',
    styleUrls: ['./families.component.scss']
})
export class FamiliesComponent implements OnInit {
    @Input() problemOnly = false;
    limit = 50;
    addressByGoogleColumn: DataControlSettings<Families>;
    familyNameColumn: DataControlSettings<Families>;
    familyAddressColumn: DataControlSettings<Families>;
    addressCommentColumn: DataControlSettings<Families>;
    groupsColumn: DataControlSettings<Families>;
    statusColumn: DataControlSettings<Families>;
    deliverySummary: DataControlSettings<Families>;
    scrollingSubscription: Subscription;
    showHoverButton: boolean = false;
    constructor(private dialog: DialogService, private san: DomSanitizer, public busy: BusyService, private context: Context,
        public scroll: ScrollDispatcher) {
        for (const item of this.families.columns.items) {
            if (item.column == this.statusColumn && !item.readOnly) {
                this.statusColumn = item;
            }
            if (this.groupsColumn == item.column)
                this.groupsColumn = item;
            if (this.addressByGoogleColumn == item.column)
                this.addressByGoogleColumn = item;
            if (this.familyNameColumn == item.column)
                this.familyNameColumn = item;
            if (this.addressCommentColumn == item.column)
                this.addressCommentColumn = item;
            if (this.groupsColumn == item.column)
                this.groupsColumn = item;
        }
        this.doTest();
        this.scrollingSubscription = this.scroll
            .scrolled()
            .subscribe((data: CdkScrollable) => {
                let val = this.testing.nativeElement.getBoundingClientRect().y < 0;
                if (val != this.showHoverButton)
                    this.dialog.zone.run(() => this.showHoverButton = val);

            });
        let y = dialog.refreshStatusStats.subscribe(() => {
            this.refreshStats();
        });
        this.onDestroy = () => {
            y.unsubscribe();
        };
        if (dialog.isScreenSmall())
            this.gridView = false;
    }
    @ViewChild("myRef", { static: true }) testing: ElementRef;
    filterBy(s: FaimilyStatistics) {
        this.families.get({
            where: s.rule,
            limit: this.limit,
            orderBy: f => [f.name]


        });
    }

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
        this.context.openDialog(QuickAddFamilyComponent, s => {
            s.f.name.value = this.searchString;
            s.argOnAdd = f => {
                this.families.items.push(f);
                this.families.setCurrentRow(f);
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
            (f, c) => c == f.correntAnErrorInStatus || c == f.visibleToCourier,
            (f, addColumn) => {
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

            });
    }



    currentFamilyDeliveries: FamilyDeliveries[] = [];
    async saveCurrentFamilies() {
        await this.families.currentRow.save();
        this.currentFamilyDeliveries = await this.families.currentRow.getDeliveries();
    }
    families = this.context.for(Families).gridSettings({

        allowUpdate: true,
        allowInsert: true,

        rowCssClass: f => f.deliverStatus.getCss(),
        numOfColumnsInGrid: 4,
        onEnterRow: async f => {
            if (f.isNew()) {
                f.basketType.value = '';
                f.deliverStatus.value = ApplicationSettings.get(this.context).defaultStatusType.value;
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

                this.familyNameColumn = {
                    column: families.name,
                    width: '200'
                },
                this.familyAddressColumn = {
                    column: families.address,
                    width: '250',
                    cssClass: f => {
                        if (!f.addressOk.value)
                            return 'addressProblem';
                        return '';
                    }
                },
                families.basketType
                ,
                this.deliverySummary = {
                    caption: 'סיכום משלוח',
                    column: families.deliverStatus,
                    readOnly: true,
                    valueList: families.deliverStatus.getOptions()
                    ,
                    getValue: f => f.getDeliveryDescription(),
                    width: '300'
                },

                this.statusColumn = { column: families.deliverStatus },

                families.familyMembers,
                families.familySource,

                this.groupsColumn = { column: families.groups },
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

                families.addressOk,
                families.floor,
                families.appartment,
                families.entrance,
                this.addressCommentColumn = { column: families.addressComment },
                families.city,
                families.postalCode,
                this.addressByGoogleColumn = families.addressByGoogle(),
                {
                    caption: 'מה הבעיה של גוגל',
                    getValue: f => f.getGeocodeInformation().whyProblem()
                },
                families.phone1,
                families.phone1Description,
                families.phone2,
                families.phone2Description,
                families.courier,
                families.fixedCourier,
                {
                    caption: 'טלפון משנע',
                    getValue: f => this.context.for(Helpers).lookup(f.courier).phone.value
                },
                families.courierAssignUser,
                families.courierAssingTime,

                families.defaultSelfPickup,
                families.deliveryStatusUser,
                families.deliveryStatusDate,
                families.courierComments,
                families.getPreviousDeliveryColumn(),
                families.previousDeliveryComment,
                families.previousDeliveryDate,
                families.socialWorker,
                families.socialWorkerPhone1,
                families.socialWorkerPhone2,
                families.birthDate,
                families.nextBirthday,
                families.needsWork,
                families.needsWorkDate,
                families.needsWorkUser
            ];
            if (!DeliveryStatus.usingSelfPickupModule) {
                r = r.filter(x => x != families.defaultSelfPickup);
            }
            return r;
        },
        rowButtons: [
            {
                name: '',
                icon: 'edit',
                click: async f => {
                    this.gridView = !this.gridView;
                    if (!this.gridView) {
                        this.currentFamilyDeliveries = await f.getDeliveries()
                    }
                }
            },
            {
                name: 'חפש כתובת בגוגל',
                cssClass: 'btn btn-success',
                click: f => f.openGoogleMaps(),
                visible: f => this.problemOnly
            },
            {
                cssClass: 'btn btn-success',
                name: 'משלוח חדש',
                visible: f => f.deliverStatus.value != DeliveryStatus.ReadyForDelivery &&
                    f.deliverStatus.value != DeliveryStatus.SelfPickup &&
                    f.deliverStatus.value != DeliveryStatus.Frozen &&
                    f.deliverStatus.value != DeliveryStatus.RemovedFromList
                ,
                click: async f => {
                    await this.busy.donotWait(async () => {
                        f.setNewBasket();
                        await f.save();
                    });
                }
            }
        ]
    });
    async updateGroup() {
        let group = new StringColumn({
            caption: 'שיוך לקבוצת חלוקה',
            dataControlSettings: () => ({
                valueList: this.context.for(Groups).getValueList({ idColumn: x => x.name, captionColumn: x => x.name })
            })
        });

        let action = new StringColumn({
            caption: 'פעולה',
            defaultValue: addGroupAction,
            dataControlSettings: () => ({
                valueList: [{ id: addGroupAction, caption: 'הוסף שיוך לקבוצת חלוקה' }, { id: 'להסיר', caption: 'הסר שיוך לקבוצת חלוקה' }, { id: replaceGroupAction, caption: 'החלף שיוך לקבוצת חלוקה' }]
            })
        });
        let ok = false;
        await this.context.openDialog(InputAreaComponent, x => {
            x.args = {
                settings: {
                    columnSettings: () => [group, action]
                },
                title: 'עדכון שיוך לקבוצת חלוקה ל-' + this.families.totalRows + ' המשפחות המסומנות',
                ok: () => ok = true
                , cancel: () => { }

            }
        });

        if (ok && group.value) {
            if (await this.dialog.YesNoPromise('האם ' + action.value + ' את השיוך לקבוצה "' + group.value + '" ל-' + this.families.totalRows + translate(' משפחות?'))) {
                this.dialog.Info(await FamiliesComponent.updateGroupOnServer(this.packWhere(), group.value, action.value));
                this.refresh();
            }
        }


    }
    @ServerFunction({ allowed: Roles.admin })
    static async updateGroupOnServer(info: serverUpdateInfo, group: string, action: string, context?: Context) {
        return await FamiliesComponent.processFamilies(info, context, f => {
            if (action == addGroupAction) {
                if (!f.groups.selected(group))
                    f.groups.addGroup(group);
            } else if (action == replaceGroupAction) {
                f.groups.value = group;
            }
            else {
                if (f.groups.selected(group))
                    f.groups.removeGroup(group);
            }

        });
    }
    async updateStatus() {
        let s = new DeliveryStatusColumn();
        let ok = false;
        await this.context.openDialog(InputAreaComponent, x => {
            x.args = {
                settings: {
                    columnSettings: () => [s]
                },
                title: 'עדכון סטטוס ל-' + this.families.totalRows + ' המשפחות המסומנות',
                ok: () => ok = true
                , cancel: () => { }

            }
        });
        if (ok)
            if (!s.value) {
                this.dialog.Info('לא נבחר סטטוס לעדכון - העדכון בוטל');
            }
            else {
                if (await this.dialog.YesNoPromise('האם לעדכן את הסטטוס "' + s.value.caption + '" ל-' + this.families.totalRows + translate(' משפחות?'))) {
                    this.dialog.Info(await FamiliesComponent.updateStatusOnServer(this.packWhere(), s.rawValue));
                    this.refresh();
                }
            }
    }
    @ServerFunction({ allowed: Roles.admin })
    static async updateStatusOnServer(info: serverUpdateInfo, status: any, context?: Context) {
        return await FamiliesComponent.processFamilies(info, context, f => f.deliverStatus.rawValue = status);
    }
    async updateBasket() {
        let s = new BasketId(this.context);
        let ok = false;
        await this.context.openDialog(InputAreaComponent, x => {
            x.args = {
                settings: {
                    columnSettings: () => [s]
                },
                title: 'עדכון סוג סל ל-' + this.families.totalRows + ' המשפחות המסומנות',
                ok: () => ok = true
                , cancel: () => { }

            }
        });
        if (ok)
            if (!s.value) {
                s.value="";
            }
            {
                if (await this.dialog.YesNoPromise('האם לעדכן את הסוג סל "' + await s.getTheValue() + '" ל-' + this.families.totalRows + translate(' משפחות?'))) {
                    this.dialog.Info(await FamiliesComponent.updateBasketOnServer(this.packWhere(), s.value));
                    this.refresh();
                }
            }
    }
    @ServerFunction({ allowed: Roles.admin })
    static async updateBasketOnServer(info: serverUpdateInfo, basketType: string, context?: Context) {
        return await FamiliesComponent.processFamilies(info, context, f => f.basketType.value = basketType);
    }
    packWhere() {
        return {
            where: packWhere(this.context.for(Families).create(), this.families.buildFindOptions().where),
            count: this.families.totalRows
        };
    }


    static async processFamilies(info: serverUpdateInfo, context: Context, what: (f: Families) => void) {
        let rows = await context.for(Families).find({ where: f => unpackWhere(f, info.where) });
        if (rows.length != info.count) {
            return "ארעה שגיאה אנא נסה שוב";
        }
        for (const f of await rows) {
            what(f);
            await f.save();
        }
        return "עודכנו " + rows.length + " משפחות";
    }


    async updateFamilySource() {
        let s = new FamilySourceId(this.context);
        let ok = false;
        await this.context.openDialog(InputAreaComponent, x => {
            x.args = {
                settings: {
                    columnSettings: () => [s]
                },
                title: 'עדכון גורם מפנה ל-' + this.families.totalRows + ' המשפחות המסומנות',
                ok: () => ok = true
                , cancel: () => { }

            }
        });
        if (ok)
            if (!s.value) {
                this.dialog.Info('לא נבחר גורם מפנה לעדכון - העדכון בוטל');
            }
            else {
                if (await this.dialog.YesNoPromise('האם לעדכן את הגורם מפנה "' + (await s.getTheValue()) + '" ל-' + this.families.totalRows + translate(' משפחות?'))) {
                    this.dialog.Info(await FamiliesComponent.updateFamilySourceOnServer(this.packWhere(), s.value));
                    this.refresh();
                }
            }
    }
    @ServerFunction({ allowed: Roles.admin })
    static async updateFamilySourceOnServer(info: serverUpdateInfo, familySource: string, context?: Context) {
        return await FamiliesComponent.processFamilies(info, context, f => f.familySource.value = familySource);
    }
    gridView = true;




    async doTest() {
    }

    onDestroy = () => { };

    ngOnDestroy(): void {
        this.onDestroy();
        this.scrollingSubscription.unsubscribe();
    }
    basketStats: statsOnTabBasket = {
        name: 'נותרו לפי סלים',
        rule: f => f.readyAndSelfPickup(),
        stats: [
            this.stats.ready,
            this.stats.special
        ],
        moreStats: [],
        fourthColumn: () => this.statusColumn
    };

    basketsInEvent: statsOnTabBasket = {
        name: 'באירוע לפי סלים',
        rule: f => f.deliverStatus.isInEvent(),
        stats: [
            this.stats.ready,
            this.stats.special
        ],
        moreStats: [],
        fourthColumn: () => this.statusColumn
    };
    basketsDelivered: statsOnTabBasket = {
        name: 'נמסרו לפי סלים',
        rule: f => f.deliverStatus.isSuccess(),
        stats: [
            this.stats.ready,
            this.stats.special
        ],
        moreStats: [],
        fourthColumn: () => this.statusColumn
    };

    cityStats: statsOnTab = {
        name: 'נותרו לפי ערים',
        rule: f => f.readyFilter(),
        stats: [
            this.stats.ready,
            this.stats.special
        ],
        moreStats: [],
        fourthColumn: () => this.statusColumn
    };
    groupsReady: statsOnTab = {
        name: 'נותרו לפי קבוצות',
        rule: f => f.readyFilter(),
        stats: [
            this.stats.ready,
            this.stats.special
        ],
        moreStats: [],
        fourthColumn: () => this.groupsColumn
    };
    groupsTotals: statsOnTab = {
        name: translate('כל המשפחות לפי קבוצות'),
        rule: f => f.deliverStatus.isDifferentFrom(DeliveryStatus.RemovedFromList),
        stats: [
            this.stats.ready,
            this.stats.special
        ],
        moreStats: [],
        fourthColumn: () => this.groupsColumn
    };
    statTabs: statsOnTab[] = [
        {
            name: 'באירוע',
            rule: f => f.deliverStatus.isInEvent(),
            stats: [
                this.stats.ready,
                this.stats.special,
                this.stats.selfPickup,
                this.stats.frozen,
                this.stats.blocked,
                this.stats.onTheWay,
                this.stats.delivered,
                this.stats.problem

            ],
            moreStats: [],
            fourthColumn: () => this.deliverySummary
        },
        this.basketsInEvent,
        this.basketStats,
        this.basketsDelivered,
        this.groupsReady,


        {
            rule: f => undefined,
            name: translate('כל המשפחות'),
            stats: [
                this.stats.currentEvent,
                this.stats.notInEvent,
                this.stats.outOfList
            ],
            moreStats: [],
            fourthColumn: () => this.statusColumn
        },
        this.groupsTotals,
        this.cityStats,
        {
            name: 'מצריך טיפול',
            rule: f => f.deliverStatus.isInEvent().and(f.needsWork.isEqualTo(true)),
            stats: [
                this.stats.needWork
            ],
            moreStats: [],
            fourthColumn: () => this.deliverySummary
        }
    ]
    tabChanged() {
        this.currentStatFilter = undefined;
        let prevTabColumn = this.currentTabStats.fourthColumn();
        this.refreshFamilyGrid();
        this.updateChart();

        let cols = this.families.columns;
        let currentTabColumn = this.currentTabStats.fourthColumn();
        if (prevTabColumn != currentTabColumn && prevTabColumn == cols.items[3]) {

            let origIndex = cols.items.indexOf(currentTabColumn);
            cols.moveCol(currentTabColumn, -origIndex + 3);
        }


    }
    clearStat() {
        this.currentStatFilter = undefined;
        this.refreshFamilyGrid();

    }
    currentTabStats: statsOnTab = { name: '', stats: [], moreStats: [], rule: undefined, fourthColumn: () => this.deliverySummary };
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
            this.busy.donotWait(async () => this.stats.getData().then(st => {
                this.basketStats.stats.splice(0);
                this.cityStats.stats.splice(0);
                this.cityStats.moreStats.splice(0);
                this.groupsReady.stats.splice(0);
                this.groupsTotals.stats.splice(0);

                this.basketStatsCalc(st.baskets, this.basketStats, b => b.unassignedFamilies, (f, id) =>
                    f.readyFilter().and(f.basketType.isEqualTo(id)));
                this.basketStatsCalc(st.baskets, this.basketsInEvent, b => b.inEventFamilies, (f, id) =>
                    f.deliverStatus.isInEvent().and(f.basketType.isEqualTo(id)));
                this.basketStatsCalc(st.baskets, this.basketsDelivered, b => b.successFamilies, (f, id) =>
                    f.deliverStatus.isSuccess().and(f.basketType.isEqualTo(id)));
                this.prepComplexStats(st.cities, this.cityStats,
                    (f, c) => f.readyFilter().and(f.city.isEqualTo(c)),
                    (f, c) => f.readyFilter().and(f.city.isDifferentFrom(c)));
                this.prepComplexStats(st.groups.map(g => ({ name: g.name, count: g.totalReady })),
                    this.groupsReady,
                    (f, g) => f.readyFilter(undefined, g),
                    (f, g) => f.readyFilter().and(f.groups.isDifferentFrom(g)).and(f.groups.isDifferentFrom('')));
                this.prepComplexStats(st.groups.map(g => ({ name: g.name, count: g.total })),
                    this.groupsTotals,
                    (f, g) => f.deliverStatus.isDifferentFrom(DeliveryStatus.RemovedFromList).and(f.groups.isContains(g)),
                    (f, g) => f.deliverStatus.isDifferentFrom(DeliveryStatus.RemovedFromList).and(f.groups.isDifferentFrom(g)));



                this.updateChart();
            }));
    }
    private basketStatsCalc(baskets: any[], stats: statsOnTabBasket, getCount: (x: any) => number, equalToFilter: (f: Families, id: string) => FilterBase) {
        stats.stats.splice(0);
        stats.totalBoxes1 = 0;
        stats.blockedBoxes1 = 0;
        stats.totalBoxes2 = 0;
        stats.blockedBoxes2 = 0;
        baskets.forEach(b => {
            let fs = new FaimilyStatistics(b.name, f => equalToFilter(f, b.id),
                undefined);
            fs.value = getCount(b);
            stats.stats.push(fs);
            if (b.blocked) {
                stats.blockedBoxes1 += +b.boxes * +fs.value;
                stats.blockedBoxes2 += +b.boxes2 * +fs.value;
            }
            else {
                stats.totalBoxes1 += +b.boxes * +fs.value;
                stats.totalBoxes2 += +b.boxes2 * +fs.value;
            }
        });
        stats.stats.sort((a, b) => b.value - a.value);
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

    showTotalBoxes() {
        let x: statsOnTabBasket = this.currentTabStats;
        if (x && (x.totalBoxes1 + x.totalBoxes2 + x.blockedBoxes1 + x.blockedBoxes2)) {
            let r = 'סה"כ ' + BasketType.boxes1Name + ': ' + x.totalBoxes1;
            if (x.blockedBoxes1) {
                r += ', סה"כ ' + BasketType.boxes1Name + ' חסומים: ' + x.blockedBoxes1;
            }
            if (x.totalBoxes2)
                r += ', סה"כ ' + BasketType.boxes2Name + ': ' + x.totalBoxes2;
            if (x.blockedBoxes2) {
                r += ', סה"כ ' + BasketType.boxes2Name + ' חסומים: ' + x.blockedBoxes2;
            }
            return r;
        }
        return undefined;
    }
    @ViewChild('myTab', { static: false }) myTab: MatTabGroup;
    @ViewChild('familyInfo', { static: true }) familyInfo: UpdateFamilyComponent;
    ngOnInit() {

        this.refreshStats();
        let cols = this.families.columns;
        let firstColumns = [
            cols.items[0],
            cols.items[1],
            cols.items[2],
            cols.items[3]
        ];
        if (this.problemOnly) {
            firstColumns = [
                this.familyNameColumn,
                this.addressByGoogleColumn,
                this.familyAddressColumn,
                this.addressCommentColumn
            ];
        }
        cols.items.sort((a, b) => a.caption > b.caption ? 1 : a.caption < b.caption ? -1 : 0);

        for (let index = 0; index < firstColumns.length; index++) {
            const item = firstColumns[index];
            let origIndex = cols.items.indexOf(item);
            cols.moveCol(item, -origIndex + index);
        }

        //  debugger;


    }
    statTotal(t: statsOnTab) {
        let r = 0;
        t.stats.forEach(x => r += +x.value);
        return r;
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
        data: { name: 'משפחות' }, canActivate: [AdminGuard]
    }
    previewFamily() {
        this.context.openDialog(PreviewFamilyComponent, s => s.argsFamily = this.families.currentRow)
    }
}

interface statsOnTab {
    name: string,
    stats: FaimilyStatistics[],
    moreStats: FaimilyStatistics[],
    rule: (f: Families) => FilterBase,
    fourthColumn: () => DataControlSettings<any>
}
interface statsOnTabBasket extends statsOnTab {
    totalBoxes1?: number;
    blockedBoxes1?: number;
    totalBoxes2?: number;
    blockedBoxes2?: number;

}
interface serverUpdateInfo {
    where: any;
    count: number;
}