import { changeDate, PhoneColumn, SqlBuilder, DateTimeColumn, wasChanged } from "../model-shared/types";

import { EntityClass, Context, IdColumn, IdEntity, StringColumn, NumberColumn, BoolColumn, FilterBase, AndFilter, Column, DataAreaSettings, IDataAreaSettings, ValueListColumn, ColumnOptions } from '@remult/core';
import { BasketId, QuantityColumn } from "./BasketType";
import { FamilyId, Families, GroupsColumn, iniFamilyDeliveriesInFamiliesCode } from "./families";
import { DeliveryStatusColumn, DeliveryStatus } from "./DeliveryStatus";
import { HelperId, HelperIdReadonly, Helpers, HelperUserInfo } from "../helpers/helpers";
import { FamilySourceId } from "./FamilySources";
import { Roles } from "../auth/roles";
import { DistributionCenterId as DistributionCenterId, allCentersToken } from "../manage/distribution-centers";
import { YesNoColumn } from "./YesNo";

import { Location, toLongLat, isGpsAddress } from '../shared/googleApiHelpers';

import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { DialogService } from "../select-popup/dialog";
import { use } from "../translate";
import { includePhoneInApi, getSettings } from "../manage/ApplicationSettings";
import { getLang } from "../sites/sites";
import { FamilyDeliveresStatistics } from "../family-deliveries/family-deliveries-stats";


@EntityClass
export class FamilyDeliveries extends IdEntity {
    addStatusExcelColumn(addColumn: (caption: string, v: string, t: import("xlsx/types").ExcelDataType) => void) {
        addColumn(getLang(this.context).statusSummary, this.statusSammary(), "s");
    }
    statusSammary() {
        var status = this.deliverStatus.displayValue;
        switch (this.deliverStatus.value) {
            case DeliveryStatus.ReadyForDelivery:
                if (this.courier.value)
                    status = getLang(this.context).onTheWay;
                else
                    status = getLang(this.context).unAsigned;
                break;
            case DeliveryStatus.SelfPickup:
            case DeliveryStatus.Frozen:
                break;
            case DeliveryStatus.Success:
            case DeliveryStatus.SuccessPickedUp:
            case DeliveryStatus.SuccessLeftThere:
                status = getLang(this.context).delivered;
                break;
            case DeliveryStatus.FailedBadAddress:
            case DeliveryStatus.FailedNotHome:
            case DeliveryStatus.FailedOther:
                status = getLang(this.context).problem;
                break;
        }
        return status;
    }

    changeRequireStatsRefresh() {
        return wasChanged(this.deliverStatus, this.courier, this.basketType, this.quantity);
    }
    copyFrom(originalDelivery: FamilyDeliveries) {
        this.distributionCenter.value = originalDelivery.distributionCenter.value;
        this.special.value = originalDelivery.special.value;
        this.basketType.value = originalDelivery.basketType.value;
        this.quantity.value = originalDelivery.quantity.value;
        this.deliveryComments.value = originalDelivery.deliveryComments.value;
    }
    async duplicateCount() {
        return await this.context.for(ActiveFamilyDeliveries).count(
            fd => fd.family.isEqualTo(this.family).and(
                fd.deliverStatus.isNotAResultStatus()).and(
                    fd.basketType.isEqualTo(this.basketType).and(
                        fd.distributionCenter.isEqualTo(this.distributionCenter)
                    )
                ));
    }

    family = new FamilyId(this.context, {
        allowApiUpdate: false
    });

    name = new StringColumn({
        allowApiUpdate: false,
        caption: getLang(this.context).familyName,
        sqlExpression: this.context.isAllowed(Roles.admin) || !getSettings(this.context).showOnlyLastNamePartToVolunteer.value ? undefined : "regexp_replace(name, '^.* ', '')"
    });
    basketType = new BasketId(this.context, {
        caption: getLang(this.context).basketType,
        allowApiUpdate: Roles.admin
    });
    quantity = new QuantityColumn(this.context, { caption: getLang(this.context).quantity, allowApiUpdate: Roles.admin, dataControlSettings: () => ({ width: '100', inputType: 'number' }) });

    distributionCenter = new DistributionCenterId(this.context, {
        allowApiUpdate: Roles.admin
    });
    deliverStatus = new DeliveryStatusColumn(this.context);
    courier = new HelperId(this.context, {
        caption: getLang(this.context).volunteer,
        allowApiUpdate: Roles.distCenterAdmin
    }, {
        location: () => this.getDrivingLocation(),
        familyId: () => this.family.value
    });
    courierComments = new StringColumn(getLang(this.context).commentsWritteByVolunteer);
    internalDeliveryComment = new StringColumn({ caption: getLang(this.context).internalDeliveryComment, includeInApi: Roles.admin });
    routeOrder = new NumberColumn({
        allowApiUpdate: Roles.distCenterAdmin
    });
    special = new YesNoColumn({ includeInApi: Roles.admin, caption: getLang(this.context).specialAsignment });
    deliveryStatusDate = new changeDate(getLang(this.context).deliveryStatusDate);
    courierAssignUser = new HelperIdReadonly(this.context, getLang(this.context).courierAsignUser);
    courierAssingTime = new changeDate(getLang(this.context).courierAsignDate);
    deliveryStatusUser = new HelperIdReadonly(this.context, getLang(this.context).statusChangeUser);

    createDate = new changeDate({ includeInApi: Roles.admin, caption: getLang(this.context).deliveryCreateDate });
    createUser = new HelperIdReadonly(this.context, { includeInApi: Roles.admin, caption: getLang(this.context).deliveryCreateUser });
    needsWork = new BoolColumn({
        caption: getLang(this.context).requireFollowUp
    });
    needsWorkUser = new HelperIdReadonly(this.context, getLang(this.context).requireFollowUpUpdateUser);
    needsWorkDate = new changeDate(getLang(this.context).requireFollowUpUpdateDate);
    deliveryComments = new StringColumn({
        caption: getLang(this.context).commentForVolunteer,
        allowApiUpdate: Roles.admin
    });

    receptionComments = new StringColumn({
        caption: getLang(this.context).commentForReception,
        allowApiUpdate: Roles.lab 
    })

    familySource = new FamilySourceId(this.context, {
        includeInApi: Roles.admin,
        allowApiUpdate: false,
        caption: getLang(this.context).familySource
    });
    groups = new GroupsColumn(this.context, {
        includeInApi: Roles.distCenterAdmin,
        allowApiUpdate: false
    });


    address = new StringColumn({
        caption: getLang(this.context).address,
        allowApiUpdate: false
    });
    floor = new StringColumn({
        caption: getLang(this.context).floor,
        allowApiUpdate: false
    });
    appartment = new StringColumn({
        caption: getLang(this.context).appartment,
        allowApiUpdate: false
    });
    entrance = new StringColumn({
        caption: getLang(this.context).entrance,
        allowApiUpdate: false
    });
    city = new StringColumn({
        caption: getLang(this.context).cityAutomaticallyUpdatedByGoogle
        , allowApiUpdate: false
    });
    area = new StringColumn({ caption: getLang(this.context).region, allowApiUpdate: false });
    addressComment = new StringColumn({
        caption: getLang(this.context).addressComment,
        allowApiUpdate: false
    });
    //שים לב - אם המשתמש הקליד כתובת GPS בכתובת - אז הנקודה הזו תהיה הנקודה שהמשתמש הקליד ולא מה שגוגל מצא
    addressLongitude = new NumberColumn({
        decimalDigits: 8,
        allowApiUpdate: false
    });
    addressLatitude = new NumberColumn({
        decimalDigits: 8,
        allowApiUpdate: false
    });
    //זו התוצאה שחזרה מהGEOCODING כך שהיא מכוונת לכביש הקרוב
    drivingLongitude = new NumberColumn({
        decimalDigits: 8,
        allowApiUpdate: false
    });
    drivingLatitude = new NumberColumn({
        decimalDigits: 8,
        allowApiUpdate: false
    });
    addressByGoogle = new StringColumn({ caption: getLang(this.context).addressByGoogle, allowApiUpdate: false });
    addressOk = new BoolColumn({
        caption: getLang(this.context).addressOk,
        allowApiUpdate: false
    });
    fixedCourier = new HelperId(this.context, { caption: getLang(this.context).defaultVolunteer, allowApiUpdate: false });
    familyMembers = new NumberColumn({ caption: getLang(this.context).familyMembers, allowApiUpdate: false });


    phone1 = new PhoneColumn({
        caption: getLang(this.context).phone1, dbName: 'phone',
        includeInApi: includePhoneInApi(this.context),
        allowApiUpdate: false
    });
    phone1Description = new StringColumn({
        caption: getLang(this.context).phone1Description,
        includeInApi: includePhoneInApi(this.context),
        allowApiUpdate: false
    });
    phone2 = new PhoneColumn({
        caption: getLang(this.context).phone2,
        includeInApi: includePhoneInApi(this.context),
        allowApiUpdate: false
    });
    phone2Description = new StringColumn({
        caption: getLang(this.context).phone2Description,
        includeInApi: includePhoneInApi(this.context),
        allowApiUpdate: false
    });
    phone3 = new PhoneColumn({
        caption: getLang(this.context).phone3,
        includeInApi: includePhoneInApi(this.context),
        allowApiUpdate: false
    });
    phone3Description = new StringColumn({
        caption: getLang(this.context).phone3Description,
        includeInApi: includePhoneInApi(this.context),
        allowApiUpdate: false
    });
    phone4 = new PhoneColumn({
        caption: getLang(this.context).phone4,
        includeInApi: includePhoneInApi(this.context),
        allowApiUpdate: false
    });
    phone4Description = new StringColumn({
        caption: getLang(this.context).phone4Description,
        includeInApi: includePhoneInApi(this.context),
        allowApiUpdate: false
    });
    courierBeenHereBefore = new BoolColumn({
        sqlExpression: () => {
            var sql = new SqlBuilder();

            var fd = this.context.for(FamilyDeliveries).create();
            let f = this;
            sql.addEntity(f, "FamilyDeliveries");
            sql.addEntity(fd, 'fd');
            return sql.columnWithAlias(sql.case([{ when: [sql.ne(f.courier, "''")], then: sql.build('exists (select 1 from ', fd, ' as ', 'fd', ' where ', sql.and(sql.not(sql.eq(fd.id, f.id)), sql.eq(fd.family, f.family), sql.eq(fd.courier, f.courier), fd.deliverStatus.isAResultStatus()), ")") }], false), 'courierBeenHereBefore');
        }
    });

    archive = new BoolColumn({ allowApiUpdate: [Roles.admin,Roles.lab] });

    visibleToCourier = new BoolColumn({
        sqlExpression: () => {
            var sql = new SqlBuilder();
            return sql.case([{ when: [sql.or(sql.gtAny(this.deliveryStatusDate, 'current_date -1'), this.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery))], then: true }], false);

        }
    });
    messageStatus = new MessageStatusColumn({
        sqlExpression: () => {
            var sql = new SqlBuilder();

            var helper = this.context.for(Helpers).create();
            let f = this;
            sql.addEntity(f, "FamilyDeliveries");
            sql.addEntity(helper, 'h');
            return sql.case([{
                when: [sql.ne(f.courier, "''")],
                then: sql.build("COALESCE ((select ",
                    sql.case([{
                        when: [sql.gt(helper.lastSignInDate, f.courierAssingTime)],
                        then: MessageStatus.opened.id
                    }, {
                        when: [sql.gt(helper.smsDate, f.courierAssingTime)],
                        then: MessageStatus.notOpened.id
                    }
                    ], MessageStatus.notSent.id)
                    , " from ", helper.defs.dbName, " as h where ", sql.eq(helper.id, f.courier), "), " + MessageStatus.noVolunteer.id + ")")
            }], MessageStatus.noVolunteer.id);
        }
    });



    active() {
        return this.archive.isEqualTo(false);
    }
    disableChangeLogging = false;
    _disableMessageToUsers = false;
    constructor(protected context: Context, private onlyActive = false, apiEndPoing = 'FamilyDeliveries') {
        super({
            name: apiEndPoing,
            dbName: 'FamilyDeliveries',
            allowApiRead: context.isSignedIn(),
            allowApiInsert: false,
            allowApiUpdate: context.isSignedIn(),
            allowApiDelete: Roles.admin,
            apiDataFilter: () => {
                return this.isAllowedForUser();

            },
            fixedWhereFilter: () => {
                if (onlyActive)
                    return this.active();

            },

            saving: () => {

                if (this.isNew()) {
                    this.createDate.value = new Date();
                    this.createUser.value = context.user.id;
                    this.deliveryStatusDate.value = new Date();
                    this.deliveryStatusUser.value = context.user.id;
                }
                if (this.quantity.value < 1)
                    this.quantity.value = 1;
                if (this.distributionCenter.value == allCentersToken)
                    this.distributionCenter.value = '';
                if (wasChanged(this.courier))
                    this.routeOrder.value = 0;


                if (!this.disableChangeLogging) {
                    if (!this.isNew() || this.courier.value)
                        logChanged(context, this.courier, this.courierAssingTime, this.courierAssignUser, async () => {
                            if (!this._disableMessageToUsers) {
                                Families.SendMessageToBrowsers(Families.GetUpdateMessage(this, 2, await this.courier.getTheName(), this.context), this.context, this.distributionCenter.value)
                            }
                        }
                        );
                    logChanged(context, this.deliverStatus, this.deliveryStatusDate, this.deliveryStatusUser, async () => {
                        if (!this._disableMessageToUsers) {
                            Families.SendMessageToBrowsers(Families.GetUpdateMessage(this, 1, await this.courier.getTheName(), this.context), this.context, this.distributionCenter.value);
                        }
                    });
                    logChanged(context, this.needsWork, this.needsWorkDate, this.needsWorkUser, async () => { });
                }
                if (context.onServer && this.isNew() && !this._disableMessageToUsers) {
                    Families.SendMessageToBrowsers(getLang(this.context).newDelivery, this.context, this.distributionCenter.value)

                }
            }
        });
    }

    isAllowedForUser() {
        if (!this.context.isSignedIn())
            return this.id.isEqualTo('no rows');
        let user = <HelperUserInfo>this.context.user;
        let result: FilterBase;
        let add = (f: FilterBase) => result = new AndFilter(f, result);
        if (this.onlyActive)
            add(this.active());
        if (!this.context.isAllowed([Roles.admin,Roles.lab])) {
            add(this.active());
            if (this.context.isAllowed(Roles.distCenterAdmin))
                add(this.distributionCenter.isAllowedForUser());
            else {
                if (user.theHelperIAmEscortingId)
                    add(this.courier.isEqualTo(user.theHelperIAmEscortingId).and(this.visibleToCourier.isEqualTo(true)));
                else
                    add(this.courier.isEqualTo(user.id).and(this.visibleToCourier.isEqualTo(true)));
            }
        }
        return result;
    }

    getShortDeliveryDescription() {
        return this.staticGetShortDescription(this.deliverStatus, this.deliveryStatusDate, this.courier, this.courierComments);
    }
    staticGetShortDescription(deliverStatus: DeliveryStatusColumn, deliveryStatusDate: changeDate, courier: HelperId, courierComments: StringColumn) {
        let r = deliverStatus.displayValue + " ";
        if (DeliveryStatus.IsAResultStatus(deliverStatus.value)) {
            if (deliveryStatusDate.value.valueOf() < new Date().valueOf() - 7 * 86400 * 1000)
                r += getLang(this.context).on + " " + deliveryStatusDate.value.toLocaleDateString("he-il");
            else
                r += deliveryStatusDate.relativeDateName(this.context);
            if (courierComments.value) {
                r += ": " + courierComments.value;
            }
            if (courier.value && deliverStatus.value != DeliveryStatus.SelfPickup && deliverStatus.value != DeliveryStatus.SuccessPickedUp)
                r += ' ' + getLang(this.context).by + ' ' + courier.getValue();
        }
        return r;
    }
    readyAndSelfPickup() {
        return this.deliverStatus.readyAndSelfPickup(this.courier);
    }
    filterDistCenterAndAllowed(distCenter: string): FilterBase {
        return this.distributionCenter.filter(distCenter);
    }
    getDeliveryDescription() {
        switch (this.deliverStatus.value) {
            case DeliveryStatus.ReadyForDelivery:
                if (this.courier.value) {
                    let c = this.context.for(Helpers).lookup(this.courier);

                    let r = ((this.messageStatus.value == MessageStatus.opened ? use.language.onTheWay : use.language.assigned) + ': ' + c.name.value + (c.eventComment.value ? ' (' + c.eventComment.value + ')' : '') + ', ' + use.language.assigned + ' ' + this.courierAssingTime.relativeDateName(this.context)) + " ";
                    switch (this.messageStatus.value) {
                        case MessageStatus.notSent:
                            r += use.language.smsNotSent;
                            break;
                        case MessageStatus.notOpened:
                            r += use.language.smsNotOpened;
                            break;

                    }
                    return r;
                }
                break;
            case DeliveryStatus.Success:
            case DeliveryStatus.SuccessLeftThere:
            case DeliveryStatus.FailedBadAddress:
            case DeliveryStatus.FailedNotHome:
            case DeliveryStatus.FailedOther:
                let duration = '';
                if (this.courierAssingTime.value && this.deliveryStatusDate.value)
                    duration = ' ' + getLang(this.context).within + ' ' + Math.round((this.deliveryStatusDate.value.valueOf() - this.courierAssingTime.value.valueOf()) / 60000) + " " + getLang(this.context).minutes;
                return this.deliverStatus.displayValue + (this.courierComments.value ? ", " + this.courierComments.value + " - " : '') + (this.courier.value ? ' ' + getLang(this.context).by + ' ' + this.courier.getValue() : '') + ' ' + this.deliveryStatusDate.relativeDateName(this.context) + duration;

        }
        return this.deliverStatus.displayValue;
    }
    describe() {
        return Families.GetUpdateMessage(this, 1, this.courier.getValue(), this.context);
    }


    readyFilter(city?: string, group?: string, area?: string) {
        let where = this.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery).and(
            this.courier.isEqualTo('')).and(this.distributionCenter.isAllowedForUser());
        if (group)
            where = where.and(this.groups.isContains(group));
        if (city) {
            where = where.and(this.city.isEqualTo(city));
        }
        if (area)
            where = where.and(this.area.isEqualTo(area));

        return where;
    }
    onTheWayFilter() {
        return this.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery).and(this.courier.isDifferentFrom(''));
    }


    getDrivingLocation(): Location {
        if (this.drivingLatitude.value != 0)
            return {
                lat: this.drivingLatitude.value,
                lng: this.drivingLongitude.value
            }
        else
            return {
                lat: this.addressLatitude.value,
                lng: this.addressLongitude.value
            }
    }
    openWaze() {
        //window.open('https://waze.com/ul?ll=' + this.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address.value) + 'export &navigate=yes', '_blank');
        window.open('waze://?ll=' + toLongLat(this.getDrivingLocation()) + "&q=" + encodeURI(this.address.value) + '&navigate=yes');
    }
    openGoogleMaps() {
        window.open('https://www.google.com/maps/search/?api=1&hl=' + getLang(this.context).languageCode + '&query=' + this.addressByGoogle.value, '_blank');
    }
    showOnGoogleMaps() {
        window.open('https://maps.google.com/maps?q=' + toLongLat(this.getDrivingLocation()) + '&hl=' + getLang(this.context).languageCode, '_blank');
    }
    showOnGovMap() {
        window.open('https://www.govmap.gov.il/?q=' + this.address.value + '&z=10', '_blank');
    }
    isGpsAddress() {
        return isGpsAddress(this.address.value);
    }
    getAddressDescription() {
        if (this.isGpsAddress()) {
            return getLang(this.context).gpsLocationNear + ' ' + this.addressByGoogle.value;
        }
        return this.address.value;
    }

    checkAllowedForUser(): boolean {
        return this.distributionCenter.checkAllowedForUser();
    }
    checkNeedsWork() {
        if (this.courierComments.value)
            this.needsWork.value = true;
        switch (this.deliverStatus.value) {
            case DeliveryStatus.FailedBadAddress:
            case DeliveryStatus.FailedNotHome:
            case DeliveryStatus.FailedOther:
                this.needsWork.value = true;
                break;
        }
    }
    async showDetailsDialog(callerHelper: {
        refreshDeliveryStats?: () => void,
        onSave?: () => Promise<void>,
        focusOnDelivery?: boolean,
        dialog: DialogService
    }) {


        let showFamilyDetails = this.context.isAllowed(Roles.admin);
        if (showFamilyDetails) {
            let f = await this.context.for(Families).findId(this.family);
            if (f) {

                this.context.openDialog((await import("../update-family-dialog/update-family-dialog.component")).UpdateFamilyDialogComponent, x => x.args = {
                    familyDelivery: this,
                    focusOnDelivery: callerHelper.focusOnDelivery,
                    onSave: async () => {
                        if (callerHelper && callerHelper.onSave)
                            await callerHelper.onSave();
                    }
                }, y => {
                    if (y.refreshDeliveryStatistics)
                        if (callerHelper && callerHelper.refreshDeliveryStats)
                            callerHelper.refreshDeliveryStats();

                });
            }
            else {
                await callerHelper.dialog.Error(getLang(this.context).familyWasNotFound);
                showFamilyDetails = false;
            }
        }
        if (!showFamilyDetails) {
            await this.showDeliveryOnlyDetail(callerHelper);
        }



    }
    async showDeliveryOnlyDetail(callerHelper: { refreshDeliveryStats?: () => void; onSave?: () => Promise<void>; focusOnDelivery?: boolean; dialog: DialogService; }) {
        await this.context.openDialog(InputAreaComponent, x => {
            x.args = {
                title: getLang(this.context).deliveryDetailsFor + ' ' + this.name.value,
                ok:
                    async () => {

                        this.save();

                        if (callerHelper) {
                            if (this.changeRequireStatsRefresh() && callerHelper.refreshDeliveryStats)
                                callerHelper.refreshDeliveryStats();
                            if (callerHelper.onSave)
                                callerHelper.onSave();
                        }
                    },
                cancel: () => {
                    this.undoChanges();
                },
                settings: this.deilveryDetailsAreaSettings(callerHelper.dialog)
            };
        });
    }

    deilveryDetailsAreaSettings(dialog: DialogService): IDataAreaSettings {
        return {
            columnSettings: () =>
                [
                    [this.basketType, this.quantity],
                    [this.deliverStatus, this.deliveryStatusDate],
                    this.deliveryComments,
                    this.courier,
                    { column: this.distributionCenter, visible: () => dialog.hasManyCenters },
                    this.needsWork,
                    this.courierComments,
                    this.internalDeliveryComment,
                    this.special
                ]
        };
    }


}

@EntityClass
export class ActiveFamilyDeliveries extends FamilyDeliveries {




    constructor(context: Context) {
        super(context, true, 'ActiveFamilyDeliveries');
    }

}

iniFamilyDeliveriesInFamiliesCode(FamilyDeliveries,ActiveFamilyDeliveries);

function logChanged(context: Context, col: Column, dateCol: DateTimeColumn, user: HelperId, wasChanged: (() => void)) {
    if (col.value != col.originalValue) {
        dateCol.value = new Date();
        user.value = context.user.id;
        wasChanged();
    }
}


export class MessageStatus {
    static noVolunteer = new MessageStatus(0, use.language.noAssignedVolunteer);
    static notSent = new MessageStatus(1, use.language.smsNotSent);
    static notOpened = new MessageStatus(2, use.language.smsNotOpened);
    static opened = new MessageStatus(3, use.language.smsOpened);
    constructor(public id: number, public caption: string) {

    }
}
export class MessageStatusColumn extends ValueListColumn<MessageStatus>{
    constructor(settingsOrCaption?: ColumnOptions<MessageStatus>) {
        super(MessageStatus, settingsOrCaption);
        if (!this.defs.caption)
            this.defs.caption = use.language.messageStatus;
    }

}