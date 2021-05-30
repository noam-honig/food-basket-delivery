
import { Context, IdEntity, UserInfo, Filter, Entity, Column, ServerMethod, ColumnSettings, DateOnlyValueConverter, StoreAsStringValueConverter, filterOf, Validators, InputTypes, EntityColumn, Storable, ColumnDefinitions, ColumnDefinitionsOf } from '@remult/core';
import { BusyService, DataControl, DataControlInfo, DataControlSettings, GridSettings, openDialog } from '@remult/angular';
import { DateTimeColumn, SqlBuilder, logChanges, ChangeDateColumn, Email, SqlFor } from '../model-shared/types';
import { isPhoneValidForIsrael, Phone } from "../model-shared/Phone";
import { LookupValue } from "../model-shared/LookupValue";



import { helpers } from 'chart.js';
import { Roles, distCenterAdminGuard } from "../auth/roles";




import { getLang } from '../sites/sites';
import { AddressHelper, GeocodeInformation, GetGeoInformation, Location } from '../shared/googleApiHelpers';
import { routeStats } from '../asign-family/route-strategy';
import { Sites } from '../sites/sites';
import { ApplicationSettings, getSettings } from '../manage/ApplicationSettings';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';

import { DialogService } from '../select-popup/dialog';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { FamilyStatus } from '../families/FamilyStatus';
import { InputAreaComponent } from '../select-popup/input-area/input-area.component';
import { SendSmsAction } from '../asign-family/send-sms-action';
import { EmailSvc } from '../shared/utils';
import { use } from '../translate';
import { DistributionCenterId, DistributionCenters } from '../manage/distribution-centers';



export function CompanyColumn<T = any>(settings?: ColumnSettings<string, T>) {
    return (target, key) => {
        DataControl<any, string>({
            width: '300',
            click: async (e, col) => openDialog((await import("../select-company/select-company.component")).SelectCompanyComponent, s => s.argOnSelect = x => col.value = x)
        })(target, key);

        return Column<T, string>({

            caption: use.language.company,
            ...settings
        })(target, key);
    }
}
@Storable<HelperId>({
    valueConverter: c => new StoreAsStringValueConverter<HelperId>(x => x.id, x => new HelperId(x, c)),
    displayValue: (e, x) => x.getValue(),
    caption: use.language.volunteer
})
@DataControl<any, HelperId>({
    getValue: (e, val) => val.value.getValue(),
    hideDataOnInput: true,
    width: '200',
    click: async (e, col) => HelperIdUtils.showSelectDialog(col, {}, undefined)
})
export class HelperId extends LookupValue<Helpers>  {
    isEmpty() {
        return this.id == '';
    }
    static empty(context: Context): HelperId {
        return new HelperId('', context);
    }
    evilGetId(): string {
        return this.id;
    }
    static currentUser(context: Context): HelperId {
        return new HelperId(context.user.id, context);
    }
    isNotEmpty() {
        return this.id != '';
    }
    isCurrentUser(): boolean {
        return this.id == this.context.user.id;
    }
    constructor(id: string, private context: Context) {
        super(id, context.for(Helpers));
    }
    getValue() {
        return this.item.name;
    }
    getPhone() {
        return this.item.$.phone.displayValue;
    }
    async getTheName() {
        let r = await this.waitLoad();
        if (r && r.name && r.name)
            return r.name;
        return '';
    }
    async getTheValue() {
        let r = await this.waitLoad();
        if (r && r.name && r.name && r.phone)
            return r.name + ' ' + r.phone;
        return '';
    }
}

export abstract class HelpersBase extends IdEntity {
    helperId() {
        return new HelperId(this.id, this.context);
    }

    constructor(protected context: Context) {

        super();
    }
    @Column<HelpersBase>({
        caption: use.language.volunteerName,
        validate: (h) => {
            if (!h.name)
                h.$.name.error = getLang(h.context).nameIsTooShort;
        }
    })
    name: string;

    @Column({ caption: use.language.phone })
    phone: Phone;
    @DateTimeColumn({ caption: use.language.smsDate })
    smsDate: Date;


    @CompanyColumn()
    company: string;
    @Column({ allowApiUpdate: Roles.distCenterAdmin })
    totalKm: number;
    @Column({ allowApiUpdate: Roles.distCenterAdmin })
    totalTime: number;
    @Column({ includeInApi: Roles.distCenterAdmin })
    shortUrlKey: string;

    @Column({ allowApiUpdate: Roles.admin })
    distributionCenter: DistributionCenterId;

    @Column({
        caption: use.language.helperComment,
        allowApiUpdate: Roles.admin
    })
    eventComment: string;

    @Column({
        caption: use.language.needEscort,
        allowApiUpdate: Roles.admin
    })
    needEscort: boolean;


    @Column({
        caption: use.language.assignedDriver,
        allowApiUpdate: Roles.admin
    })
    theHelperIAmEscorting: HelperId;



    @Column({
        caption: use.language.escort
        , allowApiUpdate: Roles.admin
    })
    escort: HelperId;

    @Column({
        caption: use.language.leadHelper
        , allowApiUpdate: Roles.admin
    })
    leadHelper: HelperId;
    @Column({
        allowApiUpdate: Roles.admin,
        includeInApi: Roles.admin,
        caption: use.language.myGiftsURL
    })
    myGiftsURL: string;
    @Column({
        allowApiUpdate: Roles.admin,
        includeInApi: Roles.admin,
    })
    archive: boolean;

    @Column({
        allowApiUpdate: context => context.isSignedIn(),
        includeInApi: context => context.isSignedIn(),
        caption: use.language.frozenTill,
        valueConverter: () => DateOnlyValueConverter
    })
    frozenTill: Date;
    @Column({
        allowApiUpdate: Roles.admin,
        includeInApi: Roles.admin,
        caption: use.language.helperInternalComment
    })
    internalComment: string;
    @Column<Helpers>({
        sqlExpression: (selfDefs) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            return sql.case([{ when: [sql.or(sql.build(self.frozenTill, ' is null'), self.frozenTill.isLessOrEqualTo(new Date()))], then: false }], true);
        }
    })
    isFrozen: boolean;



    static active(e: filterOf<HelpersBase>) {
        return e.archive.isEqualTo(false).and(e.isFrozen.isEqualTo(false));
    }
    async deactivate() {
        this.archive = true;
        this.save();
    }

    async reactivate() {
        this.archive = false;
        this.save();
    }

    getRouteStats(): routeStats {
        return {
            totalKm: this.totalKm,
            totalTime: this.totalTime
        }
    }
}

@Entity<Helpers>({
    key: "Helpers",
    allowApiRead: true,
    allowApiDelete: context => context.isSignedIn(),
    allowApiUpdate: context => context.isSignedIn(),
    allowApiInsert: true,
    saving: async (self) => {
        if (self._disableOnSavingRow) return;
        if (self.escort == self.helperId()) {
            self.escort = HelperId.empty(self.context);
        }

        if (self.context.onServer) {

            let canUpdate = false;
            if (self.isNew())
                canUpdate = true;
            else {
                let updatingMyOwnHelperInfo = self.$.id.originalValue == self.context.user.id;
                if (updatingMyOwnHelperInfo) {
                    if (!self.$.admin.originalValue && !self.$.distCenterAdmin.originalValue)
                        canUpdate = true;
                    if (self.$.admin.originalValue && self.context.isAllowed([Roles.admin, Roles.overview]))
                        canUpdate = true;
                    if (self.$.distCenterAdmin.originalValue && self.context.isAllowed(Roles.distCenterAdmin))
                        canUpdate = true;
                    if (!self.realStoredPassword && self.realStoredPassword.length == 0) //it's the first time I'm setting the password
                        canUpdate = true;
                    if (([self.$.admin, self.$.distCenterAdmin, self.$.password].filter(x => x.wasChanged()).length == 0))
                        canUpdate = true;
                }
                else {
                    if (self.context.isAllowed(Roles.admin))
                        canUpdate = true;

                    if (self.context.isAllowed(Roles.distCenterAdmin)) {
                        if (!self.$.admin.originalValue && !self.$.distCenterAdmin.originalValue) {
                            canUpdate = true;
                            if (self.distCenterAdmin) {
                                self.distributionCenter = DistributionCenterId.forCurrentUser(self.context);
                            }
                        }
                        if (self.$.distCenterAdmin.originalValue && self.$.distributionCenter.originalValue.matchesCurrentUser())
                            canUpdate = true;
                        if (self.$.distCenterAdmin.originalValue || self.admin) {
                            if (!canUpdate)
                                canUpdate = [self.$.name, self.$.phone, self.$.password, self.$.distCenterAdmin, self.$.distributionCenter, self.$.admin]
                                    .filter(x => x.wasChanged()).length == 0;
                        }
                    }

                }
            }

            if (!canUpdate)
                throw "Not Allowed";
            if (self.password && self.$.password.wasChanged() && self.password != Helpers.emptyPassword) {
                let context = self.context;
                let password = self.$.password;
                validatePasswordColumn(context, password);
                if (self.$.password.error)
                    return;
                //throw self.password.defs.caption + " - " + self.password.validationError;
                self.realStoredPassword = (await import('password-hash')).generate(self.password);
                self.passwordChangeDate = new Date();
            }
            if ((await self.context.for(Helpers).count()) == 0) {

                self.admin = true;
            }
            self.phone = new Phone(Phone.fixPhoneInput(self.phone.thePhone, self.context));
            if (!self._disableDuplicateCheck)
                await Validators.unique(self, self.$.phone, use.language.alreadyExist);
            if (self.isNew())
                self.createDate = new Date();
            self.veryUrlKeyAndReturnTrueIfSaveRequired();
            if (!self.needEscort)
                self.escort = HelperId.currentUser(self.context);
            if (self.$.escort.wasChanged()) {
                if (self.$.escort.originalValue) {
                    let h = await self.context.for(Helpers).lookupIdAsync(self.$.escort.originalValue);
                    h.theHelperIAmEscorting = HelperId.currentUser(self.context);
                    await h.save();
                }
                if (self.escort) {
                    let h = await self.escort.waitLoad();
                    h.theHelperIAmEscorting = self.helperId();
                    await h.save();
                }
            }
            await self.preferredDistributionAreaAddressHelper.updateApiResultIfChanged();
            await self.preferredFinishAddressHelper.updateApiResultIfChanged();

            logChanges(self._, self.context, {
                excludeColumns: [
                    self.$.smsDate,
                    self.$.createDate,
                    self.$.lastSignInDate,
                    self.$.reminderSmsDate,
                    self.$.totalKm,
                    self.$.totalTime,
                    self.$.allowedIds,
                    self.$.addressApiResult,
                    self.$.addressApiResult2,
                    self.$.password,
                    self.$.shortUrlKey,
                    self.$.passwordChangeDate
                ],
                excludeValues: [self.$.realStoredPassword]
            })
        }


    },
    apiDataFilter: (self, context) => {
        if (!context.isSignedIn())
            return self.id.isEqualTo("No User");
        else if (!context.isAllowed([Roles.admin, Roles.distCenterAdmin, Roles.lab]))
            return self.allowedIds.contains(context.user.id);
    }
})
export class Helpers extends HelpersBase {
    async displayEditDialog(dialog: DialogService, busy: BusyService) {
        let settings = getSettings(this.context);
        await openDialog(InputAreaComponent, x => x.args = {
            title: this.isNew() ? settings.lang.newVolunteers : this.name,
            ok: async () => {
                await this.save();
            },
            cancel: () => {
                this._.undoChanges();
            },
            settings: {
                columnSettings: () => Helpers.selectColumns(this._.repository.defs.columns, this.context).map(map => {

                    return ({
                        ...map,
                        column: this.$.find(map.column as any)
                    })
                })
            },
            buttons: [{
                text: settings.lang.deliveries,
                click: () => this.showDeliveryHistory(dialog, busy)
            }]

        });
    }
    static selectColumns(self: ColumnDefinitionsOf<Helpers>, context: Context) {
        let settings = getSettings(context);
        let r: DataControlSettings<Helpers>[] = [
            {
                column: self.name,
                width: '150'
            },
            {
                column: self.phone,
                width: '150'
            },
        ];
        r.push({
            column: self.eventComment,
            width: '120'
        });

        if (context.isAllowed(Roles.admin) && settings.isSytemForMlt()) {
            r.push({
                column: self.isIndependent,
                width: '120'
            });
        };

        if (context.isAllowed(Roles.admin)) {
            r.push({
                column: self.admin,
                width: '160'
            });

        }
        if (context.isAllowed(Roles.distCenterAdmin)) {
            r.push({
                column: self.distCenterAdmin, width: '160'
            });
        }
        let hadCenter = false;
        if (context.isAllowed(Roles.lab) && settings.isSytemForMlt()) {
            r.push({
                column: self.labAdmin, width: '120'
            });
            hadCenter = true;
            r.push({
                column: self.distributionCenter, width: '150',
            });
        }

        r.push({
            column: self.preferredDistributionAreaAddress, width: '120',
        });
        r.push({
            column: self.preferredFinishAddress, width: '120',
        });
        r.push(self.createDate);

        if (context.isAllowed(Roles.admin) && settings.isSytemForMlt()) {
            r.push({
                column: self.frozenTill, width: '120'
            });
            r.push({
                column: self.internalComment, width: '120'
            });
        }

        if (context.isAllowed(Roles.admin) && settings.isSytemForMlt()) {
            r.push({
                column: self.referredBy, width: '120'
            });
        }

        r.push({
            column: self.company, width: '120'
        });



        if (context.isAllowed(Roles.admin) && !hadCenter) {
            r.push(self.distributionCenter);
        }
        r.push(self.email);
        if (settings.manageEscorts) {
            r.push(self.escort, self.theHelperIAmEscorting, self.needEscort);
        }

        r.push({
            column: self.socialSecurityNumber, width: '80'
        });
        r.push(self.leadHelper);

        return r;
    }

    userRequiresPassword() {
        return this.admin || this.distCenterAdmin || this.labAdmin || this.isIndependent;
    }
    async showDeliveryHistory(dialog: DialogService, busy: BusyService) {
        let ctx = this.context.for((await import('../families/FamilyDeliveries')).FamilyDeliveries);
        openDialog(GridDialogComponent, x => x.args = {
            title: use.language.deliveriesFor + ' ' + this.name,
            stateName: 'deliveries-for-volunteer',
            settings: new GridSettings(ctx, {
                numOfColumnsInGrid: 7,
                knowTotalRows: true,
                allowSelection: true,
                rowButtons: [{

                    name: '',
                    icon: 'edit',
                    showInLine: true,
                    click: async fd => {
                        fd.showDetailsDialog({

                            dialog: dialog
                        });
                    }
                    , textInMenu: () => use.language.deliveryDetails
                }
                ],
                gridButtons: [{

                    name: use.language.updateDefaultVolunteer,
                    visible: () => x.args.settings.selectedRows.length > 0,
                    click: async () => {
                        let deliveries: import('../families/FamilyDeliveries').FamilyDeliveries[] = x.args.settings.selectedRows;
                        await this.setAsDefaultVolunteerToDeliveries(busy, deliveries, dialog);
                    }
                }],
                rowCssClass: fd => fd.deliverStatus.getCss(),
                columnSettings: fd => {
                    let r: ColumnDefinitions[] = [
                        fd.deliverStatus,
                        fd.deliveryStatusDate,
                        fd.basketType,
                        fd.quantity,
                        fd.name,
                        fd.address,
                        fd.courierComments,
                        fd.distributionCenter
                    ]
                    r.push(...[...fd].filter(c => !r.includes(c) && c != fd.id && c != fd.familySource).sort((a, b) => a.caption.localeCompare(b.caption)));
                    return r;
                },

                where: fd => fd.courier.isEqualTo(new HelperId(this.id, this.context)),
                orderBy: fd => fd.deliveryStatusDate.descending(),
                rowsInPage: 25

            })
        });
    }


    static usingCompanyModule: boolean;

    constructor(context: Context) {

        super(context);
    }
    @Column<Helpers>({
        sqlExpression: (selfDefs) => {
            let self = SqlFor(selfDefs);
            let sql = new SqlBuilder();
            return sql.build(self.id, ' || ', self.escort, ' || ', self.theHelperIAmEscorting);
        }
    })
    allowedIds: string;


    _disableOnSavingRow = false;
    _disableDuplicateCheck = false;
    public static emptyPassword = 'password';

    @Column({ caption: use.language.phone })
    phone: Phone;
    @ChangeDateColumn()
    lastSignInDate: Date;
    @Column({
        dbName: 'password',
        includeInApi: false
    })
    realStoredPassword: string;
    @Column({ caption: use.language.socialSecurityNumber })
    socialSecurityNumber: string;
    @Column()
    email: Email;
    @Column()
    addressApiResult: string;
    @Column({ caption: use.language.preferredDistributionArea })
    preferredDistributionAreaAddress: string;
    preferredDistributionAreaAddressHelper = new AddressHelper(this.context,
        () => this.$.preferredDistributionAreaAddress,
        () => this.$.addressApiResult);


    async setAsDefaultVolunteerToDeliveries(busy: BusyService, deliveries: import("../families/FamilyDeliveries").FamilyDeliveries[], dialog: DialogService) {
        let ids: string[] = [];
        let i = 0;

        await busy.doWhileShowingBusy(async () => {
            for (const fd of deliveries) {

                if (ids.includes(fd.family))
                    continue;
                ids.push(fd.family);
                i++;
                let f = await this.context.for((await import('../families/families')).Families).findId(fd.family);
                f.fixedCourier = fd.courier;
                await f.save();
            }
        });

        let otherFamilies = await this.context.for((await import('../families/families')).Families).find({
            where: f => f.fixedCourier.isEqualTo(new HelperId(this.id, this.context))
                .and(f.status.isEqualTo(FamilyStatus.Active)).and(f.id.isNotIn(ids))
        });
        if (otherFamilies.length > 0) {
            if (await dialog.YesNoPromise(use.language.thisVolunteerIsSetAsTheDefaultFor + " " + otherFamilies.length + " " + use.language.familiesDotCancelTheseAssignments)) {
                for (const f of otherFamilies) {
                    f.fixedCourier = HelperId.empty(this.context);
                    await f.save();
                    i++;
                }
            }
        }

        dialog.Info(i + " " + use.language.familiesUpdated);
    }
    @ServerMethod({ allowed: true })
    async mltRegister() {
        if (!this.isNew())
            throw "מתנדב קיים";
        let error = false;
        for (const col of [this.$.name, this.$.preferredDistributionAreaAddress, this.$.phone, this.$.socialSecurityNumber]) {
            col.error = '';
            if (!col.value) {
                col.error = 'שדה חובה';
                error = true;
            }
        }
        if (error)
            throw "יש למלא שדות חובה" +
            "(שם, כתובת, טלפון ות.ז.)";
        if (!isPhoneValidForIsrael(this.phone.thePhone)) {
            this.$.phone.error = "טלפון לא תקין";
            throw this.$.phone.error;
        }
        let settings = await ApplicationSettings.getAsync(this.context);
        if (!settings.isSytemForMlt())
            throw "Not Allowed";
        this.context.setUser({
            id: 'WIX',
            name: 'WIX',
            roles: []
        });
        await this.save();


        if (settings.registerHelperReplyEmailText && settings.registerHelperReplyEmailText != '') {
            let message = SendSmsAction.getMessage(settings.registerHelperReplyEmailText,
                settings.organisationName, '', this.name, this.context.user.name, '');

            try {
                await this.email.Send(settings.lang.thankYouForHelp, message, this.context);
            } catch (err) {
                console.error('send mail', err);
            }
        }
    }

    @Column()
    addressApiResult2: string;
    @Column({

        caption: use.language.preferredFinishAddress,
        dbName: 'preferredDistributionAreaAddress2'
    })
    preferredFinishAddress: string;
    preferredFinishAddressHelper = new AddressHelper(this.context, () => this.$.preferredFinishAddress, () => this.$.addressApiResult2);






    @Column<Helpers>({
        caption: use.language.password, inputType: InputTypes.password,
        serverExpression: (self) => self.realStoredPassword ? Helpers.emptyPassword : ''
    })
    password: string;
    @ChangeDateColumn({ caption: use.language.createDate })
    createDate: Date;
    @ChangeDateColumn()
    passwordChangeDate: Date;
    @ChangeDateColumn()
    EULASignDate: Date;
    //    confidentialityConfirmDate = new changeDate();

    @DateTimeColumn({
        caption: use.language.remiderSmsDate
    })
    reminderSmsDate: Date;
    @Column({ includeInApi: Roles.admin })
    referredBy: string;
    @Column({
        caption: use.language.admin,
        allowApiUpdate: Roles.admin,
        includeInApi: Roles.admin,
        dbName: 'isAdmin'
    })
    admin: boolean;
    @Column({
        caption: use.language.lab,
        allowApiUpdate: Roles.lab,
        includeInApi: Roles.lab
    })
    labAdmin: boolean;
    @Column({
        caption: use.language.indie,
        allowApiUpdate: Roles.admin,
        includeInApi: Roles.admin
    })
    isIndependent: boolean;

    @Column<Helpers>({
        caption: use.language.responsibleForAssign,
        allowApiUpdate: Roles.distCenterAdmin,
        includeInApi: Roles.distCenterAdmin,

        validate: (self) => {
            if (self.context.isAllowed(Roles.admin)) {
                return;
            }
            if (self.$.distCenterAdmin)
                if (self.$.admin.originalValue) {
                    self.$.distCenterAdmin.error = use.language.notAllowedToUpdateVolunteer;
                }
                else if (!self.distributionCenter.matchesCurrentUser()) {
                    self.$.distributionCenter.error = use.language.notAllowedToUpdateVolunteer;
                }

        }
    })
    distCenterAdmin: boolean;








    veryUrlKeyAndReturnTrueIfSaveRequired() {
        if (!this.shortUrlKey || this.shortUrlKey.length < 10) {
            this.shortUrlKey = this.makeid();
            return true;
        }
        return false;
    }
    makeid() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 10; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }
    static recentHelpers: HelpersBase[] = [];
    static addToRecent(h: HelpersBase) {
        if (!h)
            return;
        if (h.isNew())
            return;
        let index = Helpers.recentHelpers.findIndex(x => x.id == h.id);
        if (index >= 0)
            Helpers.recentHelpers.splice(index, 1);
        Helpers.recentHelpers.splice(0, 0, h);
    }

}


export class HelperIdUtils {

    constructor(protected context: Context, private args: {
        getId: () => string,
        getIdColumn: () => EntityColumn<string>,
        filter?: (helper: import('../delivery-follow-up/HelpersAndStats').HelpersAndStats) => Filter,
        location?: () => Location,
        familyId?: () => string,
        includeFrozen?: boolean,
        searchClosestDefaultFamily?: boolean
    }) {

    }
    static async showSelectDialog(col: EntityColumn<HelperId>, args: {
        filter?: (helper: filterOf<import('../delivery-follow-up/HelpersAndStats').HelpersAndStats>) => Filter,
        location?: () => Location,
        familyId?: () => string,
        includeFrozen?: boolean,
        searchClosestDefaultFamily?: boolean
    }, onSelect?: () => void) {
        openDialog((await import('../select-helper/select-helper.component')).SelectHelperComponent,
            x => x.args = {
                filter: args.filter, location: args.location ? args.location() : undefined,
                familyId: args.familyId ? args.familyId() : undefined,
                includeFrozen: args.includeFrozen,
                searchClosestDefaultFamily: args.searchClosestDefaultFamily
                , onSelect: s => {
                    col.value = s ? new HelperId(s.id, x.context) : HelperId.empty(x.context);
                    if (onSelect)
                        onSelect();
                }
            })
    }



}




export interface HelperUserInfo extends UserInfo {
    theHelperIAmEscortingId: string;
    escortedHelperName: string;
    distributionCenter: string;
}
export function validatePasswordColumn(context: Context, password: EntityColumn<string>) {
    if (getSettings(context).requireComplexPassword) {
        var l = getLang(context);
        if (password.value.length < 8)
            password.error = l.passwordTooShort;
        if (!password.value.match(/^(?=.*[0-9])(?=.*[a-zA-Z])([a-zA-Z0-9]+)$/))
            password.error = l.passwordCharsRequirement;
    }
}

