
import { Context, IdEntity, UserInfo, Filter, Entity, BackendMethod, FieldOptions, FilterFactories, Validators, FieldRef, FieldMetadata, FieldsMetadata, Allow } from 'remult';
import { BusyService, DataControl, DataControlInfo, DataControlSettings, GridSettings, openDialog } from '@remult/angular';
import { DateTimeColumn, logChanges, ChangeDateColumn, Email } from '../model-shared/types';
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { isPhoneValidForIsrael, Phone } from "../model-shared/phone";






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

import { EmailSvc } from '../shared/utils';
import { use, Field, FieldType, IntegerField } from '../translate';
import { DistributionCenters } from '../manage/distribution-centers';
import { DateOnlyField } from 'remult/src/remult3';
import { InputTypes } from 'remult/inputTypes';



export function CompanyColumn<entityType = any>(settings?: FieldOptions<entityType, string>) {
    return (target, key) => {
        DataControl<any, string>({
            width: '300',
            click: async (e, col) => openDialog((await import("../select-company/select-company.component")).SelectCompanyComponent, s => s.argOnSelect = x => col.value = x)
        })(target, key);

        return Field<entityType, string>({

            translation: l => l.company,
            ...settings
        })(target, key);
    }
}


@FieldType<HelpersBase>({

    displayValue: (e, x) => x ? x.name : '',
    translation: l => l.volunteer,
    valueConverter: {
        toJson: x => x != undefined ? x : '',
        fromJson: x => x ? x : null
    },
})
@DataControl<any, Helpers>({
    getValue: (e, val) => val.value ? val.value.name : '',
    hideDataOnInput: true,
    width: '200',
    click: async (e, col) => HelpersBase.showSelectDialog(col, {})
})
@Entity<HelpersBase>({
    key: "HelpersBase",
    dbName: "Helpers",
    allowApiCrud: false,
    allowApiRead: Allow.authenticated
},
    (options, context) => options.apiDataFilter = (self) => {
        if (!context.authenticated())
            return self.id.isEqualTo("No User");
        else if (!context.isAllowed([Roles.admin, Roles.distCenterAdmin, Roles.lab])) {

            return self.id.isIn([context.currentUser, context.currentUser.theHelperIAmEscorting, context.currentUser.escort].
                filter(x => !!x).map(x => x.id));
        }

    }
)
export abstract class HelpersBase extends IdEntity {

    static async showSelectDialog(col: FieldRef<any, HelpersBase>, args: {
        filter?: (helper: FilterFactories<import('../delivery-follow-up/HelpersAndStats').HelpersAndStats>) => Filter,
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
                , onSelect: async s => {
                    col.value = s ? s : null;
                    if (onSelect)
                        onSelect();
                }
            })
    }
    getHelper(): Promise<Helpers> {
        return this.context.for(Helpers).findId(this.id);
    }
    isCurrentUser(): boolean {
        return this.id == this.context.user.id;
    }

    constructor(protected context: Context) {

        super();
    }
    @Field<HelpersBase>({
        translation: l => l.volunteerName,
        validate: (h) => {
            if (!h.name)
                h.$.name.error = getLang(h.context).nameIsTooShort;
        }
    })
    name: string;

    @Field({ translation: l => l.phone })
    phone: Phone;
    @DateTimeColumn({ translation: l => l.smsDate })
    smsDate: Date;


    @CompanyColumn()
    company: string;
    @IntegerField({ allowApiUpdate: Roles.distCenterAdmin })
    totalKm: number;
    @IntegerField({ allowApiUpdate: Roles.distCenterAdmin })
    totalTime: number;
    @Field({ includeInApi: Roles.distCenterAdmin })
    shortUrlKey: string;

    @Field({ allowApiUpdate: Roles.admin })
    distributionCenter: DistributionCenters;

    @Field({
        translation: l => l.helperComment,
        allowApiUpdate: Roles.admin
    })
    eventComment: string;

    @Field({
        allowApiUpdate: Roles.admin
    })
    needEscort: boolean;


    @Field({
        translation: l => l.assignedDriver,
        allowApiUpdate: Roles.admin,
        lazy: true
    })
    theHelperIAmEscorting: HelpersBase;



    @Field({
        translation: l => l.escort
        , allowApiUpdate: Roles.admin
        , lazy: true
    })
    escort: HelpersBase;

    @Field({
        translation: l => l.leadHelper
        , allowApiUpdate: Roles.admin
    })
    leadHelper: HelpersBase;
    @Field({
        allowApiUpdate: Roles.admin,
        includeInApi: Roles.admin,
        translation: l => l.myGiftsURL
    })
    myGiftsURL: string;
    @Field({
        allowApiUpdate: Roles.admin,
        includeInApi: Roles.admin,
    })
    archive: boolean;

    @Field({
        allowApiUpdate: Allow.authenticated,
        includeInApi: Allow.authenticated,
    })
    @DateOnlyField()
    frozenTill: Date;
    @Field({
        allowApiUpdate: Roles.admin,
        includeInApi: Roles.admin,
        translation: l => l.helperInternalComment
    })
    internalComment: string;
    @Field<Helpers>({}, (options, context) => options.
        sqlExpression = async (selfDefs) => {
            let sql = new SqlBuilder(context);
            let self = SqlFor(selfDefs);
            return sql.case([{ when: [sql.or(sql.build(self.frozenTill, ' is null'), self.frozenTill.isLessOrEqualTo(new Date()))], then: false }], true);
        }
    )
    isFrozen: boolean;



    static active(e: FilterFactories<HelpersBase>) {
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
    allowApiRead: Allow.authenticated,
    allowApiDelete: Allow.authenticated,
    allowApiUpdate: Allow.authenticated,
    allowApiInsert: true,
    saving: async (self) => {
        if (self._disableOnSavingRow) return;
        if (self.escort) {
            if (self.escort.id == self.id)
                self.escort = null;
        }

        if (self.context.backend) {

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
                                self.distributionCenter = self.context.currentUser.distributionCenter;
                            }
                        }
                        if (self.$.distCenterAdmin.originalValue && self.$.distributionCenter.originalValue && self.$.distributionCenter.originalValue.matchesCurrentUser())
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
                //throw self.password.metadata.caption + " - " + self.password.validationError;
                self.realStoredPassword = await Helpers.generateHash(self.password);
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
                self.escort = null;
            if (self.$.escort.wasChanged()) {
                let h = self.escort;
                if (self.$.escort.originalValue) {
                    self.$.escort.originalValue.theHelperIAmEscorting = self.context.currentUser;
                    await self.$.escort.originalValue.save();
                }
                if (self.escort) {
                    h.theHelperIAmEscorting = self;
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


    }
}, (options, context) =>
    options.apiDataFilter = (self) => {
        if (!context.authenticated())
            return self.id.isEqualTo("No User");
        else if (!context.isAllowed([Roles.admin, Roles.distCenterAdmin, Roles.lab]))
            return self.allowedIds.contains(context.user.id);
    }
)

export class Helpers extends HelpersBase {

    static async generateHash(password: string) {
        return await (await import('password-hash')).generate(password)
    }
    static async verifyHash(password: string, hash: string) {
        return (await import('password-hash')).verify(password, hash);
    }


    async getHelper(): Promise<Helpers> {
        return this;
    }
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
                fields: () => {
                    let r = Helpers.selectColumns(this._.repository.metadata.fields, this.context).map(map => {

                        return ({
                            ...map,
                            field: this.$.find(map.field ? map.field as any : map)
                        })
                    });
                    console.log(r);
                    return r;
                }
            },
            buttons: [{
                text: settings.lang.deliveries,
                click: () => this.showDeliveryHistory(dialog, busy)
            }]

        });
    }
    static selectColumns(self: FieldsMetadata<Helpers>, context: Context) {
        let settings = getSettings(context);
        let r: DataControlSettings<Helpers>[] = [
            {
                field: self.name,
                width: '150'
            },
            {
                field: self.phone,
                width: '150'
            },
        ];
        r.push({
            field: self.eventComment,
            width: '120'
        });

        if (context.isAllowed(Roles.admin) && settings.isSytemForMlt()) {
            r.push({
                field: self.isIndependent,
                width: '120'
            });
        };

        if (context.isAllowed(Roles.admin)) {
            r.push({
                field: self.admin,
                width: '160'
            });

        }
        if (context.isAllowed(Roles.distCenterAdmin)) {
            r.push({
                field: self.distCenterAdmin, width: '160'
            });
        }
        let hadCenter = false;
        if (context.isAllowed(Roles.lab) && settings.isSytemForMlt()) {
            r.push({
                field: self.labAdmin, width: '120'
            });
            hadCenter = true;
            r.push({
                field: self.distributionCenter, width: '150',
            });
        }

        r.push({
            field: self.preferredDistributionAreaAddress, width: '120',
        });
        r.push({
            field: self.preferredFinishAddress, width: '120',
        });
        r.push(self.createDate);

        if (context.isAllowed(Roles.admin) && settings.isSytemForMlt()) {
            r.push({
                field: self.frozenTill, width: '120'
            });
            r.push({
                field: self.internalComment, width: '120'
            });
        }

        if (context.isAllowed(Roles.admin) && settings.isSytemForMlt()) {
            r.push({
                field: self.referredBy, width: '120'
            });
        }

        r.push({
            field: self.company, width: '120'
        });



        if (context.isAllowed(Roles.admin) && !hadCenter) {
            r.push(self.distributionCenter);
        }
        r.push(self.email);
        if (settings.manageEscorts) {
            r.push(self.escort, self.theHelperIAmEscorting, self.needEscort);
        }

        r.push({
            field: self.socialSecurityNumber, width: '80'
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
                    let r: FieldMetadata[] = [
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

                where: fd => fd.courier.isEqualTo(this),
                orderBy: fd => fd.deliveryStatusDate.descending(),
                rowsInPage: 25

            })
        });
    }


    static usingCompanyModule: boolean;

    constructor(context: Context) {

        super(context);
    }
    @Field<Helpers>({},
        (options, context) => options.sqlExpression = async (selfDefs) => {
            let self = SqlFor(selfDefs);
            let sql = new SqlBuilder(context);
            return sql.build(self.id, ' || ', self.escort, ' || ', self.theHelperIAmEscorting);
        }
    )
    allowedIds: string;


    _disableOnSavingRow = false;
    _disableDuplicateCheck = false;
    public static emptyPassword = 'password';

    @Field({ translation: l => l.phone })
    phone: Phone;
    @ChangeDateColumn()
    lastSignInDate: Date;
    @Field({
        dbName: 'password',
        includeInApi: false
    })
    realStoredPassword: string;
    @Field({ translation: l => l.socialSecurityNumber })
    socialSecurityNumber: string;
    @Field()
    email: Email;
    @Field()
    addressApiResult: string;
    @Field({ translation: l => l.preferredDistributionArea })
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
            where: f => f.fixedCourier.isEqualTo(this)
                .and(f.status.isEqualTo(FamilyStatus.Active)).and(f.id.isNotIn(ids))
        });
        if (otherFamilies.length > 0) {
            if (await dialog.YesNoPromise(use.language.thisVolunteerIsSetAsTheDefaultFor + " " + otherFamilies.length + " " + use.language.familiesDotCancelTheseAssignments)) {
                for (const f of otherFamilies) {
                    f.fixedCourier = null;
                    await f.save();
                    i++;
                }
            }
        }

        dialog.Info(i + " " + use.language.familiesUpdated);
    }
    @BackendMethod({ allowed: true })
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
            let message = (await import('../asign-family/send-sms-action')).SendSmsAction.getMessage(settings.registerHelperReplyEmailText,
                settings.organisationName, '', this.name, this.context.user.name, '');

            try {
                await this.email.Send(settings.lang.thankYouForHelp, message, this.context);
            } catch (err) {
                console.error('send mail', err);
            }
        }
    }

    @Field()
    addressApiResult2: string;
    @Field({

        dbName: 'preferredDistributionAreaAddress2'
    })
    preferredFinishAddress: string;
    preferredFinishAddressHelper = new AddressHelper(this.context, () => this.$.preferredFinishAddress, () => this.$.addressApiResult2);






    @Field<Helpers>({
        inputType: InputTypes.password,
        serverExpression: (self) => self.realStoredPassword ? Helpers.emptyPassword : ''
    })
    password: string;
    @ChangeDateColumn()
    createDate: Date;
    @ChangeDateColumn()
    passwordChangeDate: Date;
    @ChangeDateColumn()
    EULASignDate: Date;
    //    confidentialityConfirmDate = new changeDate();

    @DateTimeColumn({
        translation: l => l.remiderSmsDate
    })
    reminderSmsDate: Date;
    @Field({ includeInApi: Roles.admin })
    referredBy: string;
    @Field({
        allowApiUpdate: Roles.admin,
        includeInApi: Roles.admin,
        dbName: 'isAdmin'
    })
    admin: boolean;
    @Field({
        translation: l => l.lab,
        allowApiUpdate: Roles.lab,
        includeInApi: Roles.lab
    })
    labAdmin: boolean;
    @Field({
        translation: l => l.indie,
        allowApiUpdate: Roles.admin,
        includeInApi: Roles.admin
    })
    isIndependent: boolean;

    @Field<Helpers>({
        translation: l => l.responsibleForAssign,
        allowApiUpdate: Roles.distCenterAdmin,
        includeInApi: Roles.distCenterAdmin,

        validate: (self) => {
            if (self.context.isAllowed(Roles.admin) || !self._disableOnSavingRow) {
                return;
            }
            if (self.$.distCenterAdmin)
                if (self.$.admin.originalValue) {
                    self.$.distCenterAdmin.error = use.language.notAllowedToUpdateVolunteer;
                }
                else if (self.distributionCenter && !self.distributionCenter.matchesCurrentUser()) {
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





export interface HelperUserInfo extends UserInfo {
    theHelperIAmEscortingId: string;
    escortedHelperName: string;
    distributionCenter: string;
}
export function validatePasswordColumn(context: Context, password: FieldRef<any, string>) {
    if (getSettings(context).requireComplexPassword) {
        var l = getLang(context);
        if (password.value.length < 8)
            password.error = l.passwordTooShort;
        if (!password.value.match(/^(?=.*[0-9])(?=.*[a-zA-Z])([a-zA-Z0-9]+)$/))
            password.error = l.passwordCharsRequirement;
    }
}




