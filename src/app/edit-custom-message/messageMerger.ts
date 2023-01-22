import { Entity, EntityBase, Fields, IdEntity, remult, Remult } from "remult";
import { Roles } from "../auth/roles";

export class messageMerger {
    async mergeFromTemplate() {
        return this.merge((await this.fetchTemplateRow()).template);
    }
    constructor(public tokens: {
        token: string;
        caption?: string;
        value: string;
        enabled?: boolean
    }[], public key?: string, public defaultTemplate?: string) {
        for (const t of this.tokens) {
            if (!t.caption)
                t.caption = t.token;
            t.token = "!" + t.token + "!";
        }
        this.tokens = this.tokens.filter(t => t.enabled === undefined || t.enabled === true)
    }
    merge(message: string) {
        for (const t of this.tokens) {
            message = message.split(t.token).join(t.value);
        }
        return message;
    }
    async fetchTemplateRow() {
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