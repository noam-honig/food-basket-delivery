import { Entity, EntityBase, Fields, IdEntity } from "remult";
import { Roles } from "../auth/roles";

export class messageMerger {
    constructor(public tokens: {
        token: string;
        caption?: string;
        value: string;
    }[]) {
        for (const t of this.tokens) {
            if (!t.caption)
                t.caption = t.token;
            t.token = "!" + t.token + "!";
        }
    }
    merge(message: string) {
        for (const t of this.tokens) {
            message = message.split(t.token).join(t.value);
        }
        return message;
    }

}


@Entity("messageTemplates", { allowApiCrud: Roles.admin })
export class MessageTemplate extends EntityBase {
    @Fields.string()
    id = '';
    @Fields.string()
    template = '';
}