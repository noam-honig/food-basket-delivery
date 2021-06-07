import { IdEntity, Context, Entity } from "@remult/core";
import { Roles } from "../auth/roles";
import { Field, use } from "../translate";

@Entity({
  key: "groups",
  allowApiRead: Roles.admin,
  allowApiCrud: Roles.admin,
})
export class Groups extends IdEntity {

  @Field({ caption: use.language.group })
  name: string;
}
