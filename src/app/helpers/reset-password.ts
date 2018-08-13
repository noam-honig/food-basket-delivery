import { ServerAction } from "../auth/server-action";
import { DataApiRequest } from "radweb/utils/dataInterfaces1";
import { myAuthInfo } from "../auth/my-auth-info";
import { foreachEntityItem } from "../shared/utils";
import { Helpers } from './helpers';

export class ResetPasswordAction extends ServerAction<RestPasswordActionInfo, any>{
    protected async execute(info: RestPasswordActionInfo, req: DataApiRequest<myAuthInfo>): Promise<any> {
         await foreachEntityItem(new Helpers(),h=>h.id.isEqualTo(info.helperId),async h=>{
            h.realStoredPassword.value = '';
            await h.save();
        });
        return {};
    }
    constructor() {
        super('resetPassword');
    }
}
export interface RestPasswordActionInfo {
    helperId: string;
}