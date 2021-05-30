import { IdEntity, Context, Entity, Column } from "@remult/core";
import { Roles } from "../auth/roles";
import { use } from "../translate";

@Entity({
  key: "groups",
  allowApiRead: Roles.admin,
  allowApiCrud: Roles.admin,
})
export class Groups extends IdEntity {

  @Column({ caption: use.language.group })
  name: string;
}
