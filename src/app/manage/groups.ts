import { IdEntity, EntityClass, Context, StringColumn } from "@remult/core";
import { getLang } from "../sites/sites";
import { Roles } from "../auth/roles";

@EntityClass
export class Groups extends IdEntity {

  name = new StringColumn(getLang(this.context).group);

  constructor(private context: Context) {
    super({
      name: "groups",
      allowApiRead: Roles.admin,
      allowApiCRUD: Roles.admin,
    });
  }
}
