import { FieldRef, BackendMethod } from 'remult';
import { Remult } from 'remult';

import { Roles } from '../auth/roles';

import { Helpers } from '../helpers/helpers';
import { Phone } from "../model-shared/phone";

export class ImportHelpersFromExcelController {
    @BackendMethod({ allowed: Roles.admin })
    static async insertHelperRows(rowsToInsert: excelRowInfo[], remult?: Remult) {
        for (const r of rowsToInsert) {
            let f = remult.repo(Helpers).create();
            for (const val in r.values) {
                f[val] = r.values[val].newValue;
            }
            await f.save();
        }

    }
    @BackendMethod({ allowed: Roles.admin })
    static async updateHelperColsOnServer(rowsToUpdate: excelRowInfo[], columnMemberName: string, remult?: Remult) {
        for (const r of rowsToUpdate) {
            await ImportHelpersFromExcelController.actualUpdateCol(r, columnMemberName, remult);
        }
        return rowsToUpdate;
    }
    static async actualUpdateCol(i: excelRowInfo, colMemberName: string, remult: Remult) {
        let c = ImportHelpersFromExcelController.actualGetColInfo(i, colMemberName);
        if (c.existingDisplayValue == c.newDisplayValue)
            return;
        let f = await remult.repo(Helpers).findId(i.duplicateHelperInfo[0].id);
        let val = c.newValue;
        if (val === null)
            val = '';
        f.$[colMemberName].inputValue = val;
        await f.save();
        c.existingDisplayValue = await getColumnDisplayValue(f.$[colMemberName]);
        c.existingValue = f.$[colMemberName].inputValue;
    }
    @BackendMethod({ allowed: Roles.admin })
    static async checkExcelInputHelpers(excelRowInfo: excelRowInfo[], columnsInCompareMemeberName: string[], remult?: Remult) {
        let result: serverCheckResults = {
            errorRows: [],
            identicalRows: [],
            newRows: [],
            updateRows: []
        } as serverCheckResults;
        for (const info of excelRowInfo) {

            info.duplicateHelperInfo = (await remult.repo(Helpers).find({ where: { phone: new Phone(info.phone) } })).map(x => {
                return {
                    id: x.id,
                    name: x.name
                } as duplicateHelperInfo;
            });

            if (!info.duplicateHelperInfo || info.duplicateHelperInfo.length == 0) {
                result.newRows.push(info);
            } else if (info.duplicateHelperInfo.length > 1) {
                info.error = 'מתנדב קיים יותר מפעם אחת בבסיס הנתונים';
                result.errorRows.push(info);
            } else {
                let ef = await remult.repo(Helpers).findId(info.duplicateHelperInfo[0].id);
                let hasDifference = false;
                for (const columnMemberName of columnsInCompareMemeberName) {

                    let upd = info.values[columnMemberName];
                    if (!upd) {
                        upd = { newDisplayValue: '', newValue: '', existingDisplayValue: '', existingValue: '' };
                        info.values[columnMemberName] = upd;
                    }

                    let col = ef.$[columnMemberName];
                    upd.existingValue = col.inputValue;
                    upd.existingDisplayValue = await getColumnDisplayValue(col);
                    if (upd.existingDisplayValue != upd.newDisplayValue) {


                        if (upd.existingDisplayValue != upd.newDisplayValue) {
                            hasDifference = true;
                        }
                    }
                }
                if (hasDifference) {
                    result.updateRows.push(info);
                }
                else
                    result.identicalRows.push(info);
            }
        }
        return result;
    }
    static actualGetColInfo(i: excelRowInfo, colMemberName: string) {
        let r = i.values[colMemberName];
        if (!r) {
            r = {
                newDisplayValue: '',
                existingDisplayValue: '',
                newValue: ''
            };
            //  i.values.push(r);
        }
        return r;
    }
}
export interface excelRowInfo {
    rowInExcel: number;
    name: string;
    phone: string;

    valid: boolean;
    error?: string;
    duplicateHelperInfo?: duplicateHelperInfo[];
    values: { [key: string]: updateColumns };
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
export async function getColumnDisplayValue(c: FieldRef<any>) {
    let v = c.displayValue;
    return v?.trim();
}
export interface duplicateHelperInfo {
    id: string;
    name: string;
}