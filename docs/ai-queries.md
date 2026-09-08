# Asking an AI questions about your data

This page is written for an AI assistant (Claude, ChatGPT, Gemini, ...). To use it:

1. Open a chat with any assistant that can make web requests.
2. Give it a link to this page.
3. Give it your site address (`https://your-host/your-org`) and a login token.
4. Ask questions in plain language, **in Hebrew or English** — "כמה משלוחים עוד מחכים?", "לאיזה מתנדב יש הכי הרבה משלוחים פתוחים?", "why did deliveries fail last week?"

**Getting a token:** open your site in a browser, sign in, open DevTools → Network, click any request to `/api/...`, and copy the `authorization: Bearer ...` header. The token carries your own permissions and expires — the assistant sees exactly the data you can see, nothing more.

**Treat the token like your password.** Anything you paste into a chat may be stored by that provider. Prefer a low-privilege user, and don't paste a `superAdmin` token into a service you don't trust.

---

## For the assistant

You are querying a food-basket distribution system over a read-only REST API. Follow the rules below — several of this API's failure modes return a **successful response with the wrong data**, so a confident answer built on a careless query is the main risk here.

**Answer in Hebrew by default.** Almost all users of this system speak Hebrew. Reply in Hebrew unless the user has written to you in another language — in that case match theirs. If you're unsure which language they want, or they've only given you a URL and a token with no prose to judge by, choose Hebrew. Don't ask which language to use; just answer in Hebrew and switch if they reply in something else.

The API itself is entirely English — field and entity names are English keys — but the *data* is Hebrew: names, cities, areas, groups, and free-text comments. Your job includes translating between the two: the user says "מתנדב", you query `courier`; the user says "לא נמסר", you filter `deliverStatus.in=[21,22,23,24,25]`.

### Connection

```
Base URL: https://<host>/<org>/api
Header:   Authorization: Bearer <token>
Header:   Accept: application/json
```

`<org>` is the schema segment from the user's URL — e.g. `https://sal.hagai.co/test` → base `https://sal.hagai.co/test/api`.

**Use only `GET` requests, and `POST` requests that carry `?__action=get|count|groupBy|query`.** In this API a `POST` *without* `__action` **inserts a row**, and `PUT`/`DELETE` modify data. Never issue those. If the user asks you to change something, tell them to do it in the web app.

### Pick the right entity

| The question is about | Use |
|---|---|
| Deliveries happening now (the working set) | `activeFamilyDeliveries` |
| Delivery history, including archived | `familyDeliveries` |
| The family record — address, phones, status | `families` |
| Volunteers | `helpers`, or `helpersAndStats` for per-volunteer delivery counts |
| Volunteer sign-up events | `events`, `volunteersInEvent` |
| Lookup tables | `basketType`, `groups`, `familySources`, `distributionCenters` |

`activeFamilyDeliveries` answers almost every "right now" question. `familyDeliveries` answers every "how did we do / over time" question — it includes archived rows from past distributions, so never use it for "currently".

Full field list for every entity: [model.md](model.md). Full query syntax: [remult REST API docs](https://remult.dev/docs/rest-api).

### Hebrew → field names

[model.md](model.md) lists every field with its Hebrew caption in the `caption` column — that is the authoritative mapping, and it is generated from the code, so consult it whenever a Hebrew term isn't in the table below. Fetch it once at the start of a session.

The common vocabulary:

| The user says | Query |
|---|---|
| משפחה / משפחות / נזקקים | `families` |
| מתנדב / מתנדבים / שליח | `helpers`, `helpersAndStats`; on a delivery, the `courier` field |
| משלוח / משלוחים / חבילה | `activeFamilyDeliveries` |
| חלוקה (the event) / סבב | a date range on `familyDeliveries` |
| סל / סוג סל | `basketType` |
| כמות / ארגזים | `quantity` |
| נמסר | `deliverStatus=11` |
| לא נמסר / נכשל / בעיה | `deliverStatus.in=[21,22,23,24,25]` |
| מוכן / ממתין / טרם נמסר | `deliverStatus=0` |
| באים לקחת / איסוף עצמי | `deliverStatus=2` |
| לא שויך / בלי מתנדב | `courier=` |
| עיר | `city` |
| אזור | `area` |
| קבוצה / קבוצות שיוך | `groups` (comma-separated Hebrew text) |
| נקודת חלוקה / מרכז חלוקה | `distributionCenter` |
| גורם מפנה | `familySource` |
| נפשות | `familyMembers` |
| כתובת | `address`, plus `floor` / `appartment` / `entrance` |
| טלפון | `phone1` .. `phone4` |
| הערות מתנדב | `courierComments` |
| הערה פנימית | `internalComment` (never shown to volunteers) |
| הערות למתנדב | `deliveryComments` |
| עו"ס / עובד סוציאלי | `socialWorker`, `socialWorkerPhone1` |
| דחוף | `urgent=true` |
| צריך טיפול / לטיפול | `needsWork=true` |
| ארכיון | `archive=true` (or use `familyDeliveries`) |
| אירוע / התנדבות | `events`, `volunteersInEvent` |
| מוקפא | `deliverStatus=9` |

### Hebrew values in queries

- **URL-encode Hebrew** in query strings. `?city=חולון` must be sent percent-encoded.
- **Prefer `.contains` over `=` for Hebrew text the user typed.** Real data has spelling variants, stray spaces, hyphens and mixed scripts — `תל אביב יפו`, `תל אביב-יפו` and `Tel Aviv-Yafo` are three distinct stored values for one city. An exact match on the user's spelling will silently return 0.
- **Confirm the spelling against the data before reporting a zero.** Group by the field (`{"groupBy":["city"]}`) to see the actual values, then filter on what's really there. A `0` from a misspelled Hebrew value looks exactly like a genuine "none".
- **Names are `family name` + `first name`, in that order** (`אבו גאבר אלטע`). Search names with `name.contains` on one distinctive word rather than the whole string.
- When you report a value back to the user, quote it as stored so they can find it in the web app.

### Counting

```
GET  activeFamilyDeliveries?deliverStatus=0&__action=count
POST activeFamilyDeliveries?__action=count      body: {"where":{"deliverStatus":0}}
```

Both return `{"count": n}`. A `POST` count **requires** `where` in the body — send `{"where":{}}` for "everything".

Counting is cheap and precise. Prefer it over fetching rows and counting them yourself.

### Breakdowns

Filter in the query string, group in the body:

```
POST activeFamilyDeliveries?deliverStatus=0&__action=groupBy
body: {"groupBy":["city"],"sum":["quantity"],
       "orderBy":[{"operation":"count","isDescending":true}]}
```

→ `[{"$count":215,"city":"חולון","quantity":{"sum":215}}, ...]`

- `$count` is always present. `sum`, `avg`, `min`, `max`, `distinctCount` take arrays of field names.
- Order by row count with `{"operation":"count","isDescending":true}`.
- `_limit` in the **query string** pages the groups. A `limit` in the body does nothing.

### Rows

```
GET activeFamilyDeliveries?deliverStatus=11&_sort=deliveryStatusDate&_order=desc&_limit=20
```

There is **no default page size** — a bare `GET activeFamilyDeliveries` returns every row and can be megabytes. Always send `_limit`, or use `__action=count` / `groupBy` instead.

### Filter operators

Append to the field name: `.ne` `.in` `.contains` `.notContains` `.startsWith` `.endsWith` `.gt` `.gte` `.lt` `.lte` `.null`. No suffix means equals.

```
?city=חולון&deliverStatus.in=[11,13,19]&deliveryStatusDate.gte=2024-01-01
```

URL-encode Hebrew values. If you use `curl`, also pass `-g` or percent-encode the brackets in `.in=[...]` — curl otherwise reads `[...]` as a URL glob and the request never reaches the server, giving you an empty result that looks like "no matches".

`OR` / `NOT` don't fit in a query string — put them in a `POST` body:

```json
{ "where": { "OR": [ { "city": "חולון" }, { "city": "רמת גן" } ] } }
```

Body filters use the same dot-suffix keys (`{"deliveryStatusDate.gte":"2024-01-01"}`). Mongo-style `{"$gte":...}` throws.

---

## deliverStatus — you cannot answer anything without this

`deliverStatus` is a number. Nothing in the API tells you what the numbers mean. The table below is a copy for convenience; [model.md](model.md) has a **Value lists** section generated from the source code, so if the two ever disagree, model.md is right.

| id | meaning |
|---|---|
| -10 | בירור פרטים — details need clarifying |
| -5 | ממתין למנהל — waiting for an admin |
| **0** | **מוכן למשלוח — ready for delivery (the pending pool)** |
| 2 | באים לקחת — family collects it themselves |
| 5 | חבילה נאספה — package collected |
| 9 | מוקפא — frozen |
| **11** | **נמסר בהצלחה — delivered successfully** |
| 13 | אספו את החבילה — package was picked up |
| 19 | הושאר ליד הבית — left by the house |
| 20 | התרומה עוד לא מוכנה לאיסוף — donation not ready for collection |
| 21 | לא נמסר, בעיה בכתובת — failed, bad address |
| 22 | רחוק לי — volunteer declined, too far |
| 23 | לא נמסר, לא היו בבית — failed, nobody home |
| 24 | לא נמסר, לא מעוניינים בחבילה — failed, refused |
| 25 | לא נמסר, אחר — failed, other |

Useful groupings:

- **delivered** = `[11,13,19]`
- **failed** = `[21,22,23,24,25]`
- **pending** = `[0]`
- **needs a human decision** = `[-10,-5]`

`families.status`: `0` = active, `99` = removed from the list. Report the active count, not the total.

`special` and `messageStatus` are also numeric codes; if a question depends on them, say you can't interpret them rather than guessing.

---

## Relation fields are raw ids

`family`, `courier`, `basketType`, `distributionCenter`, `familySource`, and every `*User` field hold a uuid string. An **unset** relation is `""`, not `null` — though `.null=true` does correctly match unset ones.

- `?courier.null=true` or `?courier=` → not yet assigned to a volunteer
- `?courier.null=false` or `?courier.ne=` → assigned

To show names instead of ids, fetch the (small) lookup table once and join locally:

```
GET basketType            GET distributionCenters
GET groups                GET familySources
```

For volunteers, prefer `helpersAndStats` — it already carries `name`, `phone`, `deliveriesInProgress` and `allDeliveires` (note the spelling), so you rarely need to resolve courier ids at all.

`groups` on a delivery is a **comma-separated Hebrew string**, not ids. Filter it with `groups.contains=...`.

---

## Failure modes that produce confidently wrong answers

Read these before you answer anything.

1. **Unrecognized filter parameters are ignored, not rejected.** A typo, a field that isn't exposed, or an unknown operator suffix is silently dropped and you get the **unfiltered** count back, with a `200`.

   A count close to the table total is a hint, not proof — a filter can legitimately match almost everything. To actually test whether a filter applies, re-run it with a deliberately absurd value and check you get `0`:

   ```
   ?groups.contains=zzzzqqq&__action=count   → {"count":0}  filter works
   ?courier.name=zzzzqqq&__action=count      → {"count":1403} filter ignored
   ```

2. **There is no nested relation filtering.** `?courier.name=מנחם` is read as the field `courier` with the unknown operator `.name` — silently ignored, returns everything. Look the id up first, then filter on `?courier=<id>`.

3. **`_limit` on an unordered result gives an arbitrary subset.** For "top 5", make sure your `orderBy` actually took effect. `{"field":"$count"}` names no field and is ignored; the correct form is `{"operation":"count"}`.

4. **`_select` does not omit fields, it blanks some of them.** Relation, date, phone and email fields you didn't select come back as `""`, which is indistinguishable from a genuinely empty value. Never conclude "this family has no phone number" from a `_select` response — re-fetch the full row.

5. **Mangled UTF-8 in a POST body matches nothing silently** (`{"count":0}` rather than an error). Prefer putting Hebrew filters in the URL-encoded query string.

6. **Row counts are not basket counts.** `quantity` is boxes per delivery; sum it when the user asks about quantities of food, and count rows when they ask about households.

7. **City and area names are dirty.** Real data contains `תל אביב יפו`, `תל אביב-יפו` and `Tel Aviv-Yafo` as separate values. Merge obvious duplicates before reporting, and say that you did.

8. **The token limits what you see.** A non-admin token is filtered to that user's own rows, and a count reflects that. If a number looks implausibly small, check the user's permissions before concluding it's real.

---

## How to answer well

- **Disambiguate before computing.** "Waiting" can mean *ready but unassigned* or *assigned but not yet delivered*. Report the split; it's the actionable part.
- **Exclude open deliveries from success rates.** A rate over `[0]`-included data understates success. Say which rows you counted.
- **Surface data-quality findings.** If most pending deliveries have no `basketType`, that's worth telling the user, not silently reporting a basket named `""`.
- **Show your query.** One line of URL lets the user check you, and lets them re-run it later.
- **Say when you can't tell.** An unknown numeric code or an unmapped id is better reported than guessed.
- **Answer in Hebrew unless the user wrote in another language.** Use the Hebrew caption for a status rather than its number — "נמסר בהצלחה", not "status 11". Keep field names and the query you show in English.

## Recipes

```
# Pending work, split by assignment
activeFamilyDeliveries?deliverStatus=0&__action=count
activeFamilyDeliveries?deliverStatus=0&courier=&__action=count

# Where the unassigned work is
POST activeFamilyDeliveries?deliverStatus=0&courier=&__action=groupBy
     {"groupBy":["city"],"orderBy":[{"operation":"count","isDescending":true}]}

# Busiest volunteers
helpersAndStats?_sort=deliveriesInProgress&_order=desc&_limit=10

# Why deliveries failed, with the volunteer's own words
familyDeliveries?deliverStatus.in=[21,22,23,24,25]&deliveryStatusDate.gte=<date>&_limit=100

# What needs attention
activeFamilyDeliveries?needsWork=true&__action=count
activeFamilyDeliveries?addressOk=false&__action=count
activeFamilyDeliveries?deliverStatus.in=[-10,-5]&__action=count

# How a distribution went
POST familyDeliveries?deliveryStatusDate.gte=<date>&__action=groupBy
     {"groupBy":["deliverStatus"]}

# Families served
POST families?__action=groupBy   {"groupBy":["status"]}

# Find a family
families?name.contains=<name>&_limit=10
families?address.contains=<street>&_limit=10
```

Phone numbers are stored formatted and inconsistently (`052-765-3002`), and a family may have any of `phone1`..`phone4`. Match with `.contains` on a distinctive digit run rather than an exact equality on a full number.
