import { BackendMethod, SqlDatabase, EntityFilter, FieldRef, remult } from 'remult';

import { Remult } from 'remult';

import { Families, duplicateFamilyInfo } from '../families/families';

import { BasketType } from '../families/BasketType';
import { DeliveryStatus } from '../families/DeliveryStatus';

import { Roles } from '../auth/roles';

import { ApplicationSettings, RemovedFromListExcelImportStrategy, getSettings } from '../manage/ApplicationSettings';
import { use } from '../translate';
import { getLang } from '../sites/sites';
import { DistributionCenters } from '../manage/distribution-centers';
import { FamilyStatus } from '../families/FamilyStatus';
import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { PromiseThrottle } from '../shared/utils';



export class ImportFromExcelController {
    @BackendMethod({ allowed: Roles.familyAdmin })
    static async insertRows(rowsToInsert: excelRowInfo[], createDelivery: boolean) {
        let t = new PromiseThrottle(10);
        for (const r of rowsToInsert) {
            let f = remult.repo(Families).create();
            let fd = remult.repo(ActiveFamilyDeliveries).create();
            for (const val in r.values) {
                let col = columnFromKey(f, fd, val);
                if (col != f.$.id && col != fd.$.id) {
                    col.inputValue = r.values[val].newValue;
                    await col.load();
                }

            }
            if (!f.name)
                f.name = 'ללא שם';
            let save = async () => {

                await f.save();
                if (createDelivery) {
                    fd._disableMessageToUsers = true;
                    f.updateDelivery(fd);
                    if (getSettings().isSytemForMlt) {
                        fd.distributionCenter = await remult.context.findClosestDistCenter(f.addressHelper.location);
                    }
                    await fd.save();
                }
            };
            await t.push(save());
        }
        await t.done();


    }
    @BackendMethod({ allowed: Roles.familyAdmin })
    static async updateColsOnServer(rowsToUpdate: excelRowInfo[], columnMemberName: string, addDelivery: boolean, compareBasketType: boolean) {
        for (const r of rowsToUpdate) {
            await ImportFromExcelController.actualUpdateCol(r, columnMemberName, addDelivery, compareBasketType, remult, (await remult.context.getSettings()));
        }
        return rowsToUpdate;
    }
    static async actualUpdateCol(i: excelRowInfo, entityAndColumnName: string, addDelivery: boolean, compareBasketType: boolean, remult: Remult, settings: ApplicationSettings) {
        let c = ImportFromExcelController.actualGetColInfo(i, entityAndColumnName);
        if (c.existingDisplayValue == c.newDisplayValue)
            return;
        let basket = await remult.repo(BasketType).findId(i.basketType);
        let distCenter = await remult.repo(DistributionCenters).findId(i.distCenter);
        let f = await remult.repo(Families).findId(i.duplicateFamilyInfo[0].id);
        let fd = await remult.repo(ActiveFamilyDeliveries).findFirst({
            family: i.duplicateFamilyInfo[0].id,
            distributionCenter: distCenter,
            deliverStatus: DeliveryStatus.isNotAResultStatus(),
            basketType: compareBasketType ? basket : undefined
        });
        if (!fd) {
            fd = f.createDelivery(distCenter);
            fd.basketType = basket;
        }
        let val = c.newValue;
        if (val === null)
            val = '';
        let col = columnFromKey(f, fd, entityAndColumnName);
        col.inputValue = val;

        await f.save();
        f.updateDelivery(fd);
        if (addDelivery) {
            for (const c of fd.$) {
                if (c == col) {
                    fd._disableMessageToUsers = true;
                    if (settings.isSytemForMlt) {
                        fd.distributionCenter = await remult.context.findClosestDistCenter(f.addressHelper.location);
                    }
                    await fd.save();
                    break;
                }
            }
        }

        c.existingDisplayValue = await getColumnDisplayValue(columnFromKey(f, fd, entityAndColumnName));
        c.existingValue = columnFromKey(f, fd, entityAndColumnName).inputValue;
    }
    static actualGetColInfo(i: excelRowInfo, colMemberName: string) {
        let r = i.values[colMemberName];
        if (!r) {
            r = {
                newDisplayValue: '',
                existingDisplayValue: '',
                newValue: '',
                existingValue: ''
            };
        }
        return r;
    }
    @BackendMethod({ allowed: Roles.familyAdmin })
    static async checkExcelInput(excelRowInfo: excelRowInfo[], columnsInCompareMemeberName: string[], compareBasketType: boolean) {
        let result: serverCheckResults = {
            errorRows: [],
            identicalRows: [],
            newRows: [],
            updateRows: []

        } as serverCheckResults;
        let settings = await ApplicationSettings.getAsync();
        for (const info of excelRowInfo) {
            info.duplicateFamilyInfo = [];
            let findDuplicate = async (w: EntityFilter<Families>) => {
                if (info.duplicateFamilyInfo.length == 0)
                    info.duplicateFamilyInfo = (await remult.repo(Families).find({
                        where: {
                            status: { "!=": FamilyStatus.ToDelete },
                            $and: [w]
                        }
                    }))
                        .map(f => (<duplicateFamilyInfo>{
                            id: f.id,
                            address: f.address,
                            name: f.name,
                            tz: true,
                            removedFromList: f.status == FamilyStatus.RemovedFromList,
                            rank: 9
                        }));
            }
            if (info.idInHagai)
                await findDuplicate({ id: info.idInHagai });
            else {
                if (info.iDinExcel && info.duplicateFamilyInfo.length == 0)
                    await findDuplicate({ iDinExcel: info.iDinExcel });
                if (info.tz && info.duplicateFamilyInfo.length == 0)
                    await findDuplicate({ tz: info.tz });

                if (info.duplicateFamilyInfo.length == 0) {
                    info.duplicateFamilyInfo = await Families.checkDuplicateFamilies(info.name, info.tz, info.tz2, info.phone1ForDuplicateCheck, info.phone2ForDuplicateCheck, info.phone3ForDuplicateCheck, info.phone4ForDuplicateCheck, undefined, true, info.address);
                    if (info.duplicateFamilyInfo.length > 1) {
                        if (info.duplicateFamilyInfo.find(f => f.nameDup && f.sameAddress)) {
                            info.duplicateFamilyInfo = info.duplicateFamilyInfo.filter(f => !onlyNameMatch(f)
                            )
                        }
                    }
                }
            }

            if (settings.removedFromListStrategy == RemovedFromListExcelImportStrategy.ignore) {
                info.duplicateFamilyInfo = info.duplicateFamilyInfo.filter(x => !x.removedFromList);
            }
            if (!info.duplicateFamilyInfo || info.duplicateFamilyInfo.length == 0) {
                result.newRows.push(info);
            } else if (info.duplicateFamilyInfo.length > 1) {
                info.error = getLang().moreThanOneRowInDbMatchesExcel;
                result.errorRows.push(info);
            } else {
                let hasDifference = false;
                let existingFamily;
                ({ ef: existingFamily, hasDifference } = await compareValuesWithRow(remult, info, info.duplicateFamilyInfo[0].id, compareBasketType, columnsInCompareMemeberName));
                if (existingFamily.status == FamilyStatus.RemovedFromList) {
                    switch (settings.removedFromListStrategy) {
                        case RemovedFromListExcelImportStrategy.displayAsError:
                            info.error = use.language.familyAlreadyRemovedFromList;
                            result.errorRows.push(info);
                            break;
                        case RemovedFromListExcelImportStrategy.showInUpdate:
                            result.updateRows.push(info);
                            break;
                        case RemovedFromListExcelImportStrategy.ignore:
                            result.newRows.push(info);
                            break;
                    }
                }
                else if (hasDifference) {
                    result.updateRows.push(info);
                }
                else
                    result.identicalRows.push(info);
            }
        }
        return result;
    }
}
export async function compareValuesWithRow(remult: Remult, info: excelRowInfo, withFamily: string, compareBasketType: boolean, columnsInCompareMemeberName: string[]) {
    let hasDifference = false;
    let basketType = await remult.repo(BasketType).findId(info.basketType);
    let distCenter = await remult.repo(DistributionCenters).findId(info.distCenter);
    let ef = await remult.repo(Families).findId(withFamily);
    let fd = await remult.repo(ActiveFamilyDeliveries).findFirst({
        family: ef.id,
        distributionCenter: distCenter,
        deliverStatus: DeliveryStatus.isNotAResultStatus(),
        basketType: compareBasketType ? basketType : undefined
    });
    if (!fd) {
        fd = ef.createDelivery(distCenter);
        if (compareBasketType)
            basketType = basketType;
        fd.deliverStatus = undefined;
    }
    for (const columnMemberName of columnsInCompareMemeberName) {
        let upd = info.values[columnMemberName];
        if (!upd) {
            upd = { newDisplayValue: '', newValue: '', existingDisplayValue: '', existingValue: '' };
            info.values[columnMemberName] = upd;
        }
        let col = columnFromKey(ef, fd, columnMemberName);
        upd.existingValue = col.inputValue;
        upd.existingDisplayValue = await getColumnDisplayValue(col);
        if (upd.existingValue == upd.newValue && upd.existingValue == "")
            upd.newDisplayValue = upd.existingDisplayValue;
        if (upd.existingDisplayValue != upd.newDisplayValue) {
            if (col == ef.$.groups) {
                let existingString = ef.groups.evilGet();
                let newVal = upd.newValue;
                if (!newVal || newVal.toString() == '') {
                    upd.newValue = upd.existingValue;
                    upd.newDisplayValue = upd.existingDisplayValue;
                }
                else if (existingString && existingString.trim().length > 0) {
                    let existingArray = existingString.toString().split(',').map(x => x.trim());
                    for (const val of newVal.split(',').map(x => x.trim())) {
                        if (existingArray.indexOf(val) < 0)
                            existingArray.push(val);
                    }
                    upd.newValue = existingArray.join(', ');
                    upd.newDisplayValue = upd.newValue;
                }
            }
            if (upd.existingDisplayValue != upd.newDisplayValue) {
                hasDifference = true;
            }
        }
    }
    return { ef, hasDifference };
}
function columnFromKey(f: Families, fd: ActiveFamilyDeliveries, key: string): FieldRef<any> {
    let split = key.split('.');
    if (split[0] == f._.repository.metadata.key)
        return f.$[split[1]];
    else
        return fd.$[split[1]];
}
export interface excelRowInfo {
    rowInExcel: number;
    name: string;
    tz: string;
    tz2: string;
    iDinExcel: string;
    idInHagai: string;
    address: string;
    phone1ForDuplicateCheck: string;
    phone2ForDuplicateCheck: string;
    phone3ForDuplicateCheck: string;
    phone4ForDuplicateCheck: string;
    valid: boolean;
    error?: string;
    otherExcelRow?: excelRowInfo;
    created?: boolean;
    distCenter: string;
    basketType: string;
    duplicateFamilyInfo?: duplicateFamilyInfo[];
    values: { [key: string]: updateColumns };
    userIgnoreError?: boolean;
}
interface updateColumns {

    existingValue?: any;
    existingDisplayValue?: string;
    newValue: any;
    newDisplayValue: any;
}
interface serverCheckResults {
    newRows: excelRowInfo[],
    identicalRows: excelRowInfo[],
    updateRows: excelRowInfo[],
    errorRows: excelRowInfo[]
}
function onlyNameMatch(f: duplicateFamilyInfo) {
    return (f.nameDup
        && !f.sameAddress
        && !f.phone1
        && !f.phone2
        && !f.phone3
        && !f.phone4
        && !f.tz
        && !f.tz2);
}
export async function getColumnDisplayValue(c: FieldRef<any>) {

    let v = c.displayValue;

    return v?.trim();
}