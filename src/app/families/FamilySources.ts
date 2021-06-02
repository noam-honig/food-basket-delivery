import { Phone } from "../model-shared/Phone";
import { LookupValue } from "../model-shared/LookupValue";

import { Context, IdEntity, Entity, Storable, Column, StoreAsStringValueConverter } from '@remult/core';
import { Roles } from "../auth/roles";
import { getLang } from '../sites/sites';
import { DataControl, getValueList } from "@remult/angular";
import { use } from "../translate";

@Entity<FamilySources>({
  key: "FamilySources",
  allowApiRead: context => context.isSignedIn(),
  allowApiCrud: Roles.admin,
  defaultOrderBy: self => self.name
})
export class FamilySources extends IdEntity {
  @Column({ caption: use.language.familySourceName })
  name: string;
  @Column({ caption: use.language.contactPersonName })
  contactPerson: string;
  @Column({ caption: use.language.phone })
  phone: Phone;

}

@DataControl({
  valueList: context => getValueList(context.for(FamilySources))
})
@Storable<FamilySourceId>({
  valueConverter: c => new StoreAsStringValueConverter<FamilySourceId>(x => x.id, x => new FamilySourceId(x, c)),
  displayValue: (e, val) =>val.item? val.item.name:''
})
export class FamilySourceId extends LookupValue<FamilySources>  {
  constructor(id: string, private context: Context) {
    super(id, context.for(FamilySources));
  }
}
