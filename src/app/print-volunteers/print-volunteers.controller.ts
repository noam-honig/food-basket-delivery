import {  BackendMethod, remult } from 'remult';
import { Roles } from '../auth/roles';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';


export class PrintVolunteersController{
    @BackendMethod({ allowed: Roles.admin })
    static async volunteersForPrint() {
      let total = 0;
      let volunteers: volunteer[] = [];
      for await (const d of  remult.repo(ActiveFamilyDeliveries).query()) {
        
        let v = volunteers.find(v => v.id == d.courier?.id);
        if (!v) {
          v = {
            id: d.courier?.id,
            name: d.courier?.name,
            quantity: 0
          }
          volunteers.push(v);
        }
        v.quantity += d.quantity;
        total++;
      }
      volunteers.sort((a, b) => a.name?.localeCompare(b.name));
  
      return { total, volunteers };
    }
}

export interface volunteer {
    id: string,
    name: string,
    quantity: number
  }