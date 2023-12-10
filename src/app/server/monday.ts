import { Remult, SqlDatabase, remult, repo } from 'remult'
import { EventRoot, MondayItem, get, getItem, gql, update } from './monday-gql'
import { Families } from '../families/families'
import { Phone } from '../model-shared/phone'
import {
  ActiveFamilyDeliveries,
  FamilyDeliveries
} from '../families/FamilyDeliveries'
import { Roles } from '../auth/roles'
import { Helpers } from '../helpers/helpers'
import { FamilyStatus } from '../families/FamilyStatus'
import { BasketType } from '../families/BasketType'

const boardId = 1298919396
export async function updateReceivedFromMonday(event: EventRoot) {
  try {
    if (
      event?.event?.type == 'update_column_value' ||
      event?.event?.type == 'update_name'
    ) {
      const id = event.event.pulseId
      const column_id = event.event.columnId
      const value = event.event.value
      const board = event.event.boardId
      const item = await getItem(id, boardId)
      const department = get(item, 'status99', true)
      if (department.index === 2) {
        const updatedStatus = get(item, 'color')
        switch (updatedStatus) {
          case 'בטיפול מחלקה':
          case 'מוכן מחלקה':
            await updateBasedOnMondayItem(item)
            break
        }
      }
    }
  } catch (err) {
    console.error(err)
  }
}

export async function testMonday() {
  const fs = await import('fs')
  const items = JSON.parse(fs.readFileSync('tmp/monday_list.json').toString())
  let i = 0
  for (const item of items.boards[0].items_page.items) {
    if (get(item, 'status') == 'מחכה לתכנון') {
      console.log(i++, item.id)
      if (i > 84) await updateBasedOnMondayItem(item)
    }

    // await updateBasedOnMondayItem(
    //   JSON.parse(fs.readFileSync('tmp/monday.json').toString())
    // )
  }
}
async function readItemList(fs: typeof import('fs')) {
  const x = await gql(
    { board: boardId },
    `#graphql

query ($board: ID!) {
  boards(ids: [$board]) {
    id
    name
    board_folder_id
    board_kind
    items_page(limit:500,
    query_params:{
      rules:[
        {
          column_id:"status99"
          compare_value:2
        },
        {
          column_id:"color"
          compare_value:2
        },
      
      ]
    }
      
    ) {

      items {
        id
        name
        column_values {
          id
          text
          value
        }
      }
    }
  }
}
`
  )
  fs.writeFileSync('tmp/monday_list.json', JSON.stringify(x, null, 2))
}

export async function upsertFamilyFromMonday(id: number) {
  const item = await getItem(id, boardId)
}

async function updateBasedOnMondayItem(item: MondayItem) {
  const mondayUser = await repo(Helpers).findFirst(
    { phone: new Phone('0500000000') },
    { createIfNotFound: true }
  )
  if (mondayUser.isNew()) {
    mondayUser.name = 'Monday Integration'
    await mondayUser.save()
  }
  if (mondayUser.archive) throw 'monday Integration disabled'
  remult.user = {
    id: mondayUser.id,
    roles: [Roles.admin]
  }
  const f = await remult.repo(Families).findFirst(
    {
      iDinExcel: 'm:' + item.id,
      status: FamilyStatus.Active
    },
    {
      createIfNotFound: true
    }
  )
  let shortId = item.id.toString()

  f.name =
    item.name +
    ' ' +
    shortId.substring(shortId.length - 4) +
    ' - ' +
    get(item, 'status5')
  f.deliveryComments = get(item, 'long_text')
  f.address = get(item, 'location0').replace(/, ישראל$/, '')
  f.phone1Description = get(item, 'short_text8')
  f.phone1 = new Phone(get(item, 'phone').replace(/972/g, '0'))
  f.phone4 = new Phone(get(item, 'phone37').replace(/972/g, '0'))
  f.phone4Description = get(item, 'text26')
  if (f.phone4Description) {
    f.phone4Description += ' איש קשר במוצא'
  }
  f.phone2 = new Phone(get(item, 'phone23').replace(/972/g, '0'))
  f.phone2Description = get(item, 'short_text1')
  if (f.phone2Description) {
    f.phone2Description += ' הפונה'
  }
  const basket = get(item, 'single_select15')
  if (basket) {
    f.basketType = await remult
      .repo(BasketType)
      .findFirst({ name: basket }, { createIfNotFound: true })
    if (f.basketType.isNew()) {
      f.basketType.boxes = 1
      await f.basketType.save()
    }
  }
  let quantity = Number(get(item, 'single_select4'))
  if (!Number.isInteger(quantity)) quantity = 1

  await f.save()
  let fd = f._.isNew()
    ? undefined
    : await remult.repo(ActiveFamilyDeliveries).findFirst({ family: f.id })
  if (!fd) {
    await Families.addDelivery(
      // await remult.call(
      //   Families.addDelivery,
      //   undefined,
      f.id,
      f.basketType,
      f.defaultDistributionCenter,
      undefined,
      {
        comment: f.deliveryComments,
        quantity,
        selfPickup: false
      }
    )
  } else {
    fd.basketType = f.basketType
    fd.quantity = quantity
    fd._disableMessageToUsers = true
    fd.deliveryComments = f.deliveryComments
    await fd.save()
  }
  if (get(item, 'status') == 'מחכה לתכנון') {
    await updateMondayBasedOnDriver(Number(item.id), Boolean(fd?.courier))
  }
}

export async function updateMondayBasedOnDriver(
  id: number,
  hasDriver: boolean
) {
  await update(boardId, id, 'status', { index: hasDriver ? 1 : 0 })
}
