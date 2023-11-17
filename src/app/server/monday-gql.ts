export async function gql(variables: any, s: string, authorization?: string) {
  const fetch = await import('node-fetch')
  if (!authorization) authorization = process.env['MONDAY_C_KEY']!
  const result = await fetch.default('https://api.monday.com/v2', {
    body: JSON.stringify({
      query: s,
      variables: variables
    }),
    method: 'POST',
    headers: {
      authorization,
      'API-Version': '2023-10',
      'content-type': 'application/json'
    }
  })

  let data: any
  try {
    data = await result.json()
  } catch (err) {}
  if (!result.ok || data.errors || data.error_code) {
    console.error(
      'monday error response',
      variables,
      JSON.stringify(data, undefined, 2)
    )
    throw data || result.statusText
  }
  return data.data
}

export interface MondayItem {
  id: string
  name: string
  column_values: {
    id: string
    title: string
    value: string
    text: string
  }[]
  subitems: any[]
}

export async function update(
  board: number,
  id: number,
  column_id: string,
  value: any
) {
  const values = {
    id: +id,
    value: value == null ? null : JSON.stringify(value),
    board,
    column_id
  }
  try {
    const result = await gql(
      values,
      `#graphql
  mutation ($id: ID!,$value:JSON!,$board:ID!,$column_id:String!) {
change_column_value(
 item_id:$id
 column_id:$column_id,
 board_id:$board,
 value:$value
) {
 id
name,
column_values(ids:[$column_id]){
  id
  text
  value
}
}
}
     `
    )
    if (true) {
      var z = undefined
      if (result?.change_column_value) {
        z = { ...result.change_column_value }
        delete z.column_values
      }
      console.log({
        values,
        result: z,
        column_values: result?.change_column_value?.column_values
      })
      return result?.change_column_value
    }
  } catch (err: any) {
    console.error({
      error: values,
      err
    })
    return {
      error: err.message
    }
  }
}
export async function getItem(id: number, board: number) {
  const monday = await gql(
    {
      board: board,
      item: id
    },
    `#graphql
        query ($board: ID!, $item: ID!) {
          boards(ids: [$board]) {
            id
            name
            board_folder_id
            board_kind
            items_page(query_params: {ids: [$item]}) {
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
        }`
  )
  return monday.boards[0].items_page.items[0] as MondayItem
}
export interface EventRoot {
  event: Event
}

export interface Event {
  app: string
  type: string
  triggerTime: string
  subscriptionId: number
  userId: number
  originalTriggerUuid: any
  boardId: number
  groupId: string
  pulseId: number
  pulseName: string
  columnId: string
  columnType: string
  columnTitle: string
  value: Value
  previousValue: Value
  changedAt: number
  isTopGroup: boolean
  triggerUuid: string
}

export interface Value {
  label: Label
  post_id: any
}

export interface Label {
  index: number
  text: string
  style: Style
  is_done: boolean
}

export interface Style {
  color: string
  border: string
  var_name: string
}

export function get(
  item: MondayItem,
  mondayColumn: string,

  useVal?: boolean
): any {
  for (const c of item.column_values) {
    if (c.id == mondayColumn) {
      let val = c.text
      if (useVal) val = JSON.parse(c.value)

      if (val) return val
    }
  }
  return ''
}
