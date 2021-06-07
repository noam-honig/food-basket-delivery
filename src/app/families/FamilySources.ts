import { Phone } from "../model-shared/Phone";


import { Context, IdEntity, Entity, StoreAsStringValueConverter } from '@remult/core';
import { Roles } from "../auth/roles";

import { DataControl, getValueList } from "@remult/angular";
import { use, Field, FieldType } from "../translate";

@DataControl({
  valueList: context => getValueList(context.for(FamilySources))
})
@FieldType<FamilySources>({
  valueConverter: new StoreAsStringValueConverter<any>(x => x ? x : '', x => x ? x : null),
  displayValue: (e, val) => val ? val.name : ''
})
@Entity<FamilySources>({
  key: "FamilySources",
  allowApiRead: context => context.isSignedIn(),
  allowApiCrud: Roles.admin,
  defaultOrderBy: self => self.name
})
export class FamilySources extends IdEntity {
  @Field({ caption: use.language.familySourceName })
  name: string;
  @Field({ caption: use.language.contactPersonName })
  contactPerson: string;
  @Field({ caption: use.language.phone })
  phone: Phone;

}

