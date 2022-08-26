import { Entity, EntityBase, Fields, IdEntity, Remult } from "remult";
import { Roles } from "../auth/roles";

export class messageMerger {
    async mergeFromTemplate(remult: Remult) {
        return this.merge((await this.fetchTemplateRow(remult)).template);
    }
    constructor(public tokens: {
        token: string;
        caption?: string;
        value: string;
    }[], public key?: string, public defaultTemplate?: string) {
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
    async fetchTemplateRow(remult: Remult) {
        if (!this.key)
            throw "missing key";
        const r = await remult.repo(MessageTemplate).findId(this.key, { createIfNotFound: true })
        if (r.isNew())
            r.template = this.defaultTemplate;
        return r;
    }

}


@Entity("messageTemplates", { allowApiCrud: Roles.admin })
export class MessageTemplate extends EntityBase {
    @Fields.string()
    id = '';
    @Fields.string()
    template = '';
}