import { Phone } from "../model-shared/Phone";


import { Context, IdEntity, Entity, Storable, Column, StoreAsStringValueConverter } from '@remult/core';
import { Roles } from "../auth/roles";

import { DataControl, getValueList } from "@remult/angular";
import { use } from "../translate";

@DataControl({
  valueList: context => getValueList(context.for(FamilySources))
})
@Storable<FamilySources>({
  valueConverter: () => new StoreAsStringValueConverter<any>(x => x ? x : '', x => x ? x : null),
  displayValue: (e, val) => val ? val.name : ''
})
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

