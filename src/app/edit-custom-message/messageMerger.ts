import {
  Entity,
  EntityBase,
  Fields,
  IdEntity,
  remult,
  Remult,
  repo
} from 'remult'
import { Roles } from '../auth/roles'

export class messageMerger {
  async mergeFromTemplate() {
    return this.merge((await this.fetchTemplateRow()).template)
  }
  mergeFromTemplateSync() {
    let template = messageMerger.templates.find((x) => x.id == this.key)
    return this.merge(template?.template || this.defaultTemplate)
  }
  static templates: MessageTemplate[]
  static load(force = false) {
    if (remult.isAllowed(Roles.admin)) {
      if (!force && messageMerger.templates) return
      repo(MessageTemplate)
        .find()
        .then((x) => (messageMerger.templates = x))
    }
  }
  constructor(
    public tokens: {
      token: string
      caption?: string
      value: string
      enabled?: boolean
    }[],
    public key?: string,
    public defaultTemplate?: string
  ) {
    for (const t of this.tokens) {
      if (!t.caption) t.caption = t.token
      t.token = '!' + t.token + '!'
    }
    this.tokens = this.tokens.filter(
      (t) => t.enabled === undefined || t.enabled === true
    )
  }
  merge(message: string) {
    if (!message) message = ''
    for (const t of this.tokens) {
      message = message.split(t.token).join(t.value)
    }
    return message
  }
  async fetchTemplateRow() {
    if (!this.key) throw 'missing key'
    const r = await remult
      .repo(MessageTemplate)
      .findId(this.key, { createIfNotFound: true })
    if (r.isNew()) r.template = this.defaultTemplate
    return r
  }
}

@Entity('messageTemplates', { allowApiCrud: Roles.admin })
export class MessageTemplate extends EntityBase {
  @Fields.string()
  id = ''
  @Fields.string()
  template = ''
}
