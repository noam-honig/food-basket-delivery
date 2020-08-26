
import { NumberColumn, IdColumn, Context, EntityClass, ColumnOptions, IdEntity, StringColumn, BoolColumn, EntityOptions, UserInfo, FilterBase, Entity, Column, EntityProvider, checkForDuplicateValue, BusyService, DateColumn } from '@remult/core';
import { changeDate, HasAsyncGetTheValue, PhoneColumn, DateTimeColumn, EmailColumn, SqlBuilder, wasChanged, logChanges } from '../model-shared/types';



import { helpers } from 'chart.js';
import { Roles, distCenterAdminGuard } from "../auth/roles";
import { JWTCookieAuthorizationHelper } from '@remult/server';

import { DistributionCenterId } from '../manage/distribution-centers';
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats';
import { getLang } from '../sites/sites';
import { GeocodeInformation, GetGeoInformation, Location, AddressApiResultColumn } from '../shared/googleApiHelpers';
import { routeStats } from '../asign-family/route-strategy';
import { Sites } from '../sites/sites';
import { getSettings } from '../manage/ApplicationSettings';
import { GridDialogComponent } from '../grid-dialog/grid-dialog.component';

import { DialogService } from '../select-popup/dialog';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { FamilyStatus } from '../families/FamilyStatus';






export abstract class HelpersBase extends IdEntity {

    constructor(protected context: Context, options?: EntityOptions | string) {

        super(options);
    }

    name = new StringColumn({
        caption: getLang(this.context).volunteerName,
        validate: () => {
            if (!this.name.value)
                this.name.validationError = getLang(this.context).nameIsTooShort;
        }
    });

    phone = new PhoneColumn(getLang(this.context).phone);
    smsDate = new DateTimeColumn(getLang(this.context).smsDate);

    company = new CompanyColumn(this.context);
    totalKm = new NumberColumn({ allowApiUpdate: Roles.distCenterAdmin });
    totalTime = new NumberColumn({ allowApiUpdate: Roles.distCenterAdmin });
    shortUrlKey = new StringColumn({ includeInApi: Roles.distCenterAdmin });
    distributionCenter = new DistributionCenterId(this.context, {
        allowApiUpdate: Roles.admin
    });
    eventComment = new StringColumn({
        caption: getLang(this.context).helperComment,
        allowApiUpdate: Roles.admin
    });
    needEscort = new BoolColumn({
        caption: getLang(this.context).needEscort,
        allowApiUpdate: Roles.admin
    });
    theHelperIAmEscorting = new HelperIdReadonly(this.context, {
        caption: getLang(this.context).assignedDriver,
        allowApiUpdate: Roles.admin
    });
    escort = new HelperId(this.context, {
        caption: getLang(this.context).escort
        , allowApiUpdate: Roles.admin
    });
    leadHelper = new HelperId(this.context, {
        caption: getLang(this.context).leadHelper
        , allowApiUpdate: Roles.admin
    });


    archive = new BoolColumn({
        allowApiUpdate: Roles.admin,
        includeInApi: Roles.admin,
    });

    frozenTill = new DateColumn({
        allowApiUpdate: Roles.admin,
        includeInApi: Roles.admin,
        caption: getLang(this.context).frozenTill
    });

    internalComment = new StringColumn({
        allowApiUpdate: Roles.admin,
        includeInApi: Roles.admin,
        caption: getLang(this.context).helperInternalComment
    });
    isFrozen = new BoolColumn({
        sqlExpression: () => {
            let sql = new SqlBuilder();
            return sql.case([{ when: [sql.or(sql.build(this.frozenTill, ' is null'), this.frozenTill.isLessOrEqualTo(new Date()))], then: false }], true);
        }
    });



    active() {
        return this.archive.isEqualTo(false).and(this.isFrozen.isEqualTo(false));
    }
    async deactivate() {
        this.archive.value = true;
        this.save();
    }

    async reactivate() {
        this.archive.value = false;
        this.save();
    }

    getRouteStats(): routeStats {
        return {
            totalKm: this.totalKm.value,
            totalTime: this.totalTime.value
        }
    }
}

@EntityClass
export class Helpers extends HelpersBase {
    userRequiresPassword() {
        return this.admin.value || this.distCenterAdmin.value || this.labAdmin.value || this.isIndependent.value;
    }
    async showDeliveryHistory(dialog: DialogService, busy: BusyService) {
        let ctx = this.context.for((await import('../families/FamilyDeliveries')).FamilyDeliveries);
        this.context.openDialog(GridDialogComponent, x => x.args = {
            title: getLang(this.context).deliveriesFor + ' ' + this.name.value,
            settings: ctx.gridSettings({
                numOfColumnsInGrid: 6,
                knowTotalRows: true,
                allowSelection: true,
                rowButtons: [{

                    name: '',
                    icon: 'edit',
                    showInLine: true,
                    click: async fd => {
                        fd.showDetailsDialog({

                            dialog: dialog,
                            focusOnDelivery: true
                        });
                    }
                    , textInMenu: () => getLang(this.context).deliveryDetails
                }
                ],
                gridButtons: [{

                    name: getLang(this.context).updateDefaultVolunteer,
                    visible: () => x.args.settings.selectedRows.length > 0,
                    click: async () => {
                        let deliveries: import('../families/FamilyDeliveries').FamilyDeliveries[] = x.args.settings.selectedRows;
                        await this.setAsDefaultVolunteerToDeliveries(busy, deliveries, dialog);
                    }
                }],
                rowCssClass: fd => fd.deliverStatus.getCss(),
                columnSettings: fd => {
                    let r: Column[] = [
                        fd.deliverStatus,
                        fd.deliveryStatusDate,
                        fd.basketType,
                        fd.quantity,
                        fd.name,
                        fd.address,
                        fd.distributionCenter,
                        fd.courierComments
                    ]
                    r.push(...fd.columns.toArray().filter(c => !r.includes(c) && c != fd.id && c != fd.familySource).sort((a, b) => a.defs.caption.localeCompare(b.defs.caption)));
                    return r;
                },
                get: {
                    where: fd => fd.courier.isEqualTo(this.id),
                    orderBy: fd => [{ column: fd.deliveryStatusDate, descending: true }],
                    limit: 25
                }
            })
        });
    }


    static usingCompanyModule: boolean;

    constructor(context: Context) {

        super(context, {
            name: "Helpers",
            allowApiRead: true,
            allowApiDelete: context.isSignedIn(),
            allowApiUpdate: context.isSignedIn(),
            allowApiInsert: true,
            saving: async () => {
                if (this._disableOnSavingRow) return;
                if (this.escort.value == this.id.value) {
                    this.escort.value = '';
                }

                if (context.onServer) {

                    let canUpdate = false;
                    if (this.isNew())
                        canUpdate = true;
                    else {
                        let updatingMyOwnHelperInfo = this.id.originalValue == context.user.id;
                        if (updatingMyOwnHelperInfo) {
                            if (!this.admin.originalValue && !this.distCenterAdmin.originalValue)
                                canUpdate = true;
                            if (this.admin.originalValue && context.isAllowed(Roles.admin))
                                canUpdate = true;
                            if (this.distCenterAdmin.originalValue && context.isAllowed(Roles.distCenterAdmin))
                                canUpdate = true;
                            if (!this.realStoredPassword.value && this.realStoredPassword.value.length == 0) //it's the first time I'm setting the password
                                canUpdate = true;
                            if (!wasChanged(this.admin, this.distCenterAdmin, this.password))
                                canUpdate = true;
                        }
                        else {
                            if (this.context.isAllowed(Roles.admin))
                                canUpdate = true;

                            if (this.context.isAllowed(Roles.distCenterAdmin)) {
                                if (!this.admin.originalValue && !this.distCenterAdmin.originalValue) {
                                    canUpdate = true;
                                    if (this.distCenterAdmin.value) {
                                        this.distributionCenter.value = (<HelperUserInfo>context.user).distributionCenter;
                                    }
                                }
                                if (this.distCenterAdmin.originalValue && this.distributionCenter.originalValue == (<HelperUserInfo>context.user).distributionCenter)
                                    canUpdate = true;
                                if (this.distCenterAdmin.originalValue || this.admin.value) {
                                    if (!canUpdate)
                                        canUpdate = !wasChanged(this.name, this.phone, this.password, this.distCenterAdmin, this.distributionCenter, this.admin);
                                }
                            }

                        }
                    }

                    if (!canUpdate)
                        throw "Not Allowed";
                    if (this.password.value && this.password.value != this.password.originalValue && this.password.value != Helpers.emptyPassword) {
                        let context = this.context;
                        let password = this.password;
                        validatePasswordColumn(context, password);
                        if (this.password.validationError)
                            return;
                        //throw this.password.defs.caption + " - " + this.password.validationError;
                        this.realStoredPassword.value = Helpers.passwordHelper.generateHash(this.password.value);
                        this.passwordChangeDate.value = new Date();
                    }
                    if ((await context.for(Helpers).count()) == 0) {

                        this.admin.value = true;
                    }
                    this.phone.value = PhoneColumn.fixPhoneInput(this.phone.value);
                    if (!this._disableDuplicateCheck)
                        await checkForDuplicateValue(this, this.phone, context.for(Helpers), getLang(this.context).alreadyExist);
                    if (this.isNew())
                        this.createDate.value = new Date();
                    this.veryUrlKeyAndReturnTrueIfSaveRequired();
                    if (!this.needEscort.value)
                        this.escort.value = '';
                    if (this.escort.value != this.escort.originalValue) {
                        if (this.escort.originalValue) {
                            let h = await context.for(Helpers).lookupAsync(x => x.id.isEqualTo(this.escort.originalValue));
                            h.theHelperIAmEscorting.value = '';
                            await h.save();
                        }
                        if (this.escort.value) {
                            let h = await context.for(Helpers).lookupAsync(this.escort);
                            h.theHelperIAmEscorting.value = this.id.value;
                            await h.save();
                        }
                    }
                    if (wasChanged(this.preferredDistributionAreaAddress) || !this.addressApiResult.ok()) {
                        let geo = await GetGeoInformation(this.preferredDistributionAreaAddress.value, context);
                        this.addressApiResult.value = geo.saveToString();
                    }
                    if (wasChanged(this.preferredDistributionAreaAddress2) || !this.addressApiResult2.ok()) {
                        let geo = await GetGeoInformation(this.preferredDistributionAreaAddress2.value, context);
                        this.addressApiResult2.value = geo.saveToString();
                    }
                    logChanges(this, this.context, {
                        excludeColumns: [
                            this.smsDate,
                            this.createDate,
                            this.lastSignInDate,
                            this.reminderSmsDate,
                            this.totalKm,
                            this.totalTime,
                            this.allowedIds,
                            this.addressApiResult,
                            this.addressApiResult2,
                            this.password,
                            this.shortUrlKey,
                            this.passwordChangeDate
                        ],
                        excludeValues: [this.realStoredPassword]
                    })
                }


            },
            apiDataFilter: () => {
                if (!context.isSignedIn())
                    return this.id.isEqualTo("No User");
                else if (!context.isAllowed([Roles.admin, Roles.distCenterAdmin, Roles.lab]))
                    return this.allowedIds.isContains(this.context.user.id);
            }
        });
    }
    allowedIds = new StringColumn({
        sqlExpression: () => {
            let sql = new SqlBuilder();
            return sql.build(this.id, ' || ', this.escort, ' || ', this.theHelperIAmEscorting);
        }
    });

    _disableOnSavingRow = false;
    _disableDuplicateCheck = false;
    public static emptyPassword = 'password';

    phone = new PhoneColumn(getLang(this.context).phone);
    lastSignInDate = new changeDate();
    realStoredPassword = new StringColumn({
        dbName: 'password',
        includeInApi: false
    });
    socialSecurityNumber = new StringColumn(getLang(this.context).socialSecurityNumber);
    email = new EmailColumn();
    preferredDistributionAreaAddress = new StringColumn(getLang(this.context).preferredDistributionArea);
    addressApiResult = new AddressApiResultColumn();
    
    async setAsDefaultVolunteerToDeliveries(busy: BusyService, deliveries: import("../families/FamilyDeliveries").FamilyDeliveries[], dialog: DialogService) {
        let ids: string[] = [];
        let i = 0;

        await busy.doWhileShowingBusy(async () => {
            for (const fd of deliveries) {

                if (ids.includes(fd.family.value))
                    continue;
                ids.push(fd.family.value);
                i++;
                let f = await this.context.for((await import('../families/families')).Families).findId(fd.family);
                f.fixedCourier.value = fd.courier.value;
                await f.save();
            }
        });

        let otherFamilies = await this.context.for((await import('../families/families')).Families).find({
            where: f => f.fixedCourier.isEqualTo(this.id)
                .and(f.status.isEqualTo(FamilyStatus.Active)).and(f.id.isNotIn(ids))
        });
        if (otherFamilies.length > 0) {
            if (await dialog.YesNoPromise(getLang(this.context).thisVolunteerIsSetAsTheDefaultFor + " " + otherFamilies.length + " " + getLang(this.context).familiesDotCancelTheseAssignments)) {
                for (const f of otherFamilies) {
                    f.fixedCourier.value = '';
                    await f.save();
                    i++;
                }
            }
        }

        dialog.Info(i + " " + getLang(this.context).familiesUpdated);
    }

   
    preferredDistributionAreaAddress2 = new StringColumn(getLang(this.context).preferredDistributionArea2);
    addressApiResult2 = new AddressApiResultColumn();
   

    password = new StringColumn({ caption: getLang(this.context).password, dataControlSettings: () => ({ inputType: 'password' }), serverExpression: () => this.realStoredPassword.value ? Helpers.emptyPassword : '' });

    createDate = new changeDate({ caption: getLang(this.context).createDate });
    passwordChangeDate = new changeDate();
    EULASignDate = new changeDate();
    //    confidentialityConfirmDate = new changeDate();

    reminderSmsDate = new DateTimeColumn({
        caption: getLang(this.context).remiderSmsDate
    });
    referredBy = new StringColumn({ includeInApi: Roles.admin });
    admin = new BoolColumn({
        caption: getLang(this.context).admin,
        allowApiUpdate: Roles.admin,
        includeInApi: Roles.admin,
        dbName: 'isAdmin'
    });
    labAdmin = new BoolColumn({
        caption: getLang(this.context).lab,
        allowApiUpdate: Roles.lab,
        includeInApi: Roles.lab
    });
    isIndependent = new BoolColumn({
        caption: getLang(this.context).indie,
        allowApiUpdate: Roles.admin,
        includeInApi: Roles.admin
    });
    distCenterAdmin = new BoolColumn({
        caption: getLang(this.context).responsibleForAssign,
        allowApiUpdate: Roles.distCenterAdmin,
        includeInApi: Roles.distCenterAdmin,

        validate: () => {
            if (this.context.isAllowed(Roles.admin)) {
                return;
            }
            if (wasChanged(this.distCenterAdmin))
                if (this.admin.originalValue) {
                    this.distCenterAdmin.validationError = getLang(this.context).notAllowedToUpdateVolunteer;
                }
                else if (this.distributionCenter.value != (<HelperUserInfo>this.context.user).distributionCenter) {
                    this.distributionCenter.validationError = getLang(this.context).notAllowedToUpdateVolunteer;
                }

        }
    });

    getRouteStats(): routeStats {
        return {
            totalKm: this.totalKm.value,
            totalTime: this.totalTime.value
        }
    }





    veryUrlKeyAndReturnTrueIfSaveRequired() {
        if (!this.shortUrlKey.value || this.shortUrlKey.value.length < 10) {
            this.shortUrlKey.value = this.makeid();
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
        let index = Helpers.recentHelpers.findIndex(x => x.id.value == h.id.value);
        if (index >= 0)
            Helpers.recentHelpers.splice(index, 1);
        Helpers.recentHelpers.splice(0, 0, h);
    }
    static passwordHelper: PasswordHelper = {
        generateHash: x => { throw ""; },
        verify: (x, y) => { throw ""; }
    };
    static helper: JWTCookieAuthorizationHelper;

}



export class HelperId extends IdColumn implements HasAsyncGetTheValue {

    constructor(protected context: Context, settingsOrCaption?: ColumnOptions<string>, private args: {
        filter?: (helper: HelpersAndStats) => FilterBase,
        location?: () => Location,
        familyId?: () => string
        searchClosestDefaultFamily?: boolean
    } = {}) {
        super({
            dataControlSettings: () =>
                ({
                    getValue: () => this.getValue(),
                    hideDataOnInput: true,
                    width: '200',
                    click: async () => this.showSelectDialog()
                })
        }, settingsOrCaption);
    }
    async showSelectDialog(onSelect?: () => void) {
        this.context.openDialog((await import('../select-helper/select-helper.component')).SelectHelperComponent,
            x => x.args = {
                filter: this.args.filter, location: this.args.location ? this.args.location() : undefined,
                familyId: this.args.familyId ? this.args.familyId() : undefined,
                searchClosestDefaultFamily: this.args.searchClosestDefaultFamily
                , onSelect: s => {
                    this.value = (s ? s.id.value : '');
                    if (onSelect)
                        onSelect();
                }
            })
    }


    getValue() {
        return this.context.for(Helpers).lookup(this).name.value;
    }
    getPhone() {
        return this.context.for(Helpers).lookup(this).phone.displayValue;
    }
    async getTheName() {
        let r = await this.context.for(Helpers).lookupAsync(this);
        if (r && r.name && r.name.value)
            return r.name.value;
        return '';
    }
    async getTheValue() {
        let r = await this.context.for(Helpers).lookupAsync(this);
        if (r && r.name && r.name.value && r.phone)
            return r.name.value + ' ' + r.phone.value;
        return '';
    }
}
export class CompanyColumn extends StringColumn {

    constructor(context: Context) {
        super({
            caption: getLang(context).company,
            dataControlSettings: () =>
                ({
                    width: '300',
                    click: async () => context.openDialog((await import("../select-company/select-company.component")).SelectCompanyComponent, s => s.argOnSelect = x => this.value = x)
                })
        });
    }
}
export class HelperIdReadonly extends HelperId {
    constructor(protected context: Context, settingsOrCaption?: ColumnOptions<string>, filter?: (helper: HelpersAndStats) => FilterBase) {
        super(context, settingsOrCaption, { filter });
        this.defs.allowApiUpdate = false;
    }
    get displayValue() {
        return this.context.for(Helpers).lookup(this).name.value;
    }
}
export interface PasswordHelper {
    generateHash(password: string): string;
    verify(password: string, realPasswordHash: string): boolean;
}

export interface HelperUserInfo extends UserInfo {
    theHelperIAmEscortingId: string;
    escortedHelperName: string;
    distributionCenter: string;
}
export function validatePasswordColumn(context: Context, password: StringColumn) {
    if (getSettings(context).requireComplexPassword.value) {
        var l = getLang(context);
        if (password.value.length < 8)
            password.validationError = l.passwordTooShort;
        if (!password.value.match(/^(?=.*[0-9])(?=.*[a-zA-Z])([a-zA-Z0-9]+)$/))
            password.validationError = l.passwordCharsRequirement;
    }
}

