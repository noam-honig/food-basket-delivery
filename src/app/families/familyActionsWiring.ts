import {
  Allowed,
  IdEntity,
  Filter,
  EntityFilter,
  EntityOrderBy,
  BackendMethod,
  ProgressListener,
  EntityBase,
  getFields,
  Repository,
  QueryOptions,
  remult,
  FieldsRefForEntityBase
} from 'remult'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { use } from '../translate'
import { getLang } from '../sites/sites'
import { PromiseThrottle } from '../shared/utils'

import { Families } from './families'
import {
  DataAreaFieldsSetting,
  GridButton
} from '../common-ui-elements/interfaces'

import { Roles } from '../auth/roles'
import { UITools } from '../helpers/init-context'

export interface packetServerUpdateInfo {
  packedWhere: any
  count: number
}
export interface DoWorkOnServerHelper<T extends IdEntity> {
  actionWhere: EntityFilter<T>
  forEach: (f: T) => Promise<void>
  orderBy?: EntityOrderBy<T>
}

export abstract class ActionOnRows<T extends IdEntity> {
  constructor(
    private entity: {
      new (...args: any[]): T
    },
    public args: ActionOnRowsArgs<T>,
    public serialHelper?: {
      serializeOnClient: () => Promise<void>
      deserializeOnServer: () => Promise<void>
    }
  ) {
    if (!args.confirmQuestion) args.confirmQuestion = () => args.title
    if (args.allowed === undefined) args.allowed = Roles.familyAdmin

    if (!args.onEnd) {
      args.onEnd = async () => {}
    }
    if (!args.dialogColumns)
      args.dialogColumns = async (x) => [...getFields(this, remult)]
    if (!args.validateInComponent) args.validateInComponent = async (x) => {}
    if (!args.additionalWhere) {
      args.additionalWhere = {}
    }
  }
  get $() {
    return getFields<this>(this) as unknown as FieldsRefForEntityBase<this>
  }

  gridButton(component: actionDialogNeeds<T>) {
    return {
      name: this.args.title,
      visible: () => {
        let r = remult.isAllowed(this.args.allowed)
        if (!r) return false
        if (this.args.visible) {
          r = this.args.visible(component)
        }
        return r
      },
      icon: this.args.icon,
      click: async () => {
        await component.ui.inputAreaDialog({
          fields: await this.args.dialogColumns(component),

          title: this.args.title,
          helpText: this.args.help ? this.args.help() : undefined,
          validate: async () => {
            if (this.args.validate) await this.args.validate()

            await this.args.validateInComponent(component)
          },
          ok: async () => {
            await this.runAction(component)
          },
          cancel: () => {}
        })
      }
    } as GridButton
  }
  async runAction(component: actionDialogNeeds<T>) {
    let groupName = remult.repo(this.entity).metadata.caption
    let where = await this.composeWhere(component.userWhere)
    let count = await remult.repo(this.entity).count(where)
    if (
      await component.ui.YesNoPromise(
        this.args.confirmQuestion() +
          ' ' +
          use.language.for +
          ' ' +
          count +
          ' ' +
          groupName +
          '?'
      )
    ) {
      let r = await this.internalForTestingCallTheServer({
        count,
        where
      })

      component.afterAction()
    }
  }

  async internalForTestingCallTheServer(info: {
    where: EntityFilter<T>
    count: number
  }) {
    if (this.serialHelper) await this.serialHelper.serializeOnClient()
    let p = new ProgressListener(undefined)
    p.progress = () => {}

    let r = await this.execute(
      {
        count: info.count,
        packedWhere: Filter.entityFilterToJson(
          remult.repo(this.entity).metadata,
          info.where
        )
      },
      p
    )

    return r
  }

  async composeWhere(
    where: EntityFilter<T> | (() => EntityFilter<T> | Promise<EntityFilter<T>>)
  ): Promise<EntityFilter<T>> {
    return {
      $and: [
        await Filter.resolve(this.args.additionalWhere),
        await Filter.resolve(where)
      ]
    } as EntityFilter<T>
  }

  @BackendMethod<ActionOnRows<any>>({
    allowed: (self) => remult.isAllowed(self.args.allowed),
    queue: true,
    paramTypes: [Object, ProgressListener]
  })
  async execute(info: packetServerUpdateInfo, progress?: ProgressListener) {
    await this.serialHelper?.deserializeOnServer()
    let where: EntityFilter<T> = await this.composeWhere(
      Filter.entityFilterFromJson(
        remult.repo(this.entity).metadata,
        info.packedWhere
      )
    )

    let count = await remult.repo(this.entity).count(where)
    if (count != info.count) {
      console.log({
        count,
        packCount: info.count,
        name: remult.repo(this.entity).metadata.caption
      })
      throw Error('ארעה שגיאה אנא נסה שוב')
    }
    let i = 0
    let r = await pagedRowsIterator<T>(remult.repo(this.entity), {
      where,
      orderBy: this.args.orderBy,
      forEachRow: async (f) => {
        await this.args.forEach(f)
        if (!f._.wasDeleted()) await f.save()
        progress.progress(++i / count)
      }
    })
    let message =
      this.args.title +
      ': ' +
      r +
      ' ' +
      remult.repo(this.entity).metadata.caption +
      ' ' +
      getLang().updated

    await Families.SendMessageToBrowsers(message, '')
    return r
  }
}

export interface actionDialogNeeds<T extends IdEntity> {
  ui: UITools
  settings: ApplicationSettings
  afterAction: () => {}
  userWhere:
    | EntityFilter<T>
    | (() => EntityFilter<T> | Promise<EntityFilter<T>>)
}

export interface ActionOnRowsArgs<T extends IdEntity> {
  allowed?: Allowed
  dialogColumns?: (
    component: actionDialogNeeds<T>
  ) => Promise<DataAreaFieldsSetting<any>[]>
  visible?: (component: actionDialogNeeds<T>) => boolean
  forEach: (f: T) => Promise<void>
  onEnd?: () => Promise<void>
  validateInComponent?: (component: actionDialogNeeds<T>) => Promise<void>
  validate?: () => Promise<void>
  title: string
  icon?: string
  help?: () => string
  confirmQuestion?: () => string
  additionalWhere?:
    | EntityFilter<T>
    | (() => EntityFilter<T> | Promise<EntityFilter<T>>)
  orderBy?: EntityOrderBy<T>
}

export async function pagedRowsIterator<T extends EntityBase>(
  remult: Repository<T>,
  args: {
    forEachRow: (f: T) => Promise<void>
  } & QueryOptions<T>
) {
  let updated = 0
  let pt = new PromiseThrottle(10)
  for await (const f of remult.query({
    where: args.where,
    orderBy: args.orderBy
  })) {
    await pt.push(args.forEachRow(f))
    updated++
  }
  await pt.done()
  return updated
}
