import { Families } from '../families/families';
import { Remult, BackendMethod } from 'remult';
import { Roles } from '../auth/roles';
import { FamilyDeliveries } from '../families/FamilyDeliveries';



export class MergeFamiliesController {
    @BackendMethod({ allowed: Roles.admin })
    static async mergeFamilies(ids: string[], remult?: Remult) {
        let id = ids.splice(0, 1)[0];
        let newFamily = await remult.repo(Families).findId(id);

        for (const oldId of ids) {
            for await (const fd of remult.repo(FamilyDeliveries).query({ where: { family: oldId } })) {
                fd.family = id;
                newFamily.updateDelivery(fd);
                await fd.save();
            }
            await (await remult.repo(Families).findId(oldId)).delete();
        }
    }
}