# Api for list events and register to events

Used to list and register to events as found on: [https://salmaz.herokuapp.com/guest/events](https://salmaz.herokuapp.com/guest/events)

Test Environment: [https://hugmomst.herokuapp.com/guest/events](https://hugmomst.herokuapp.com/guest/events) 

## List Events
`POST /guest/api/getAllEvents`

Example request body:
```json
{
    "args": [
        "0507330590",
        null
    ]
}
```
* args[0] = the phone number of the volunteer, used to highlight events that the volunteer is already registered to.

### Response
```json
{
    "data": [
        {
            "id": "92af7977-f64f-4dff-af36-614aa1f22256",
            "name": "חגי תשרי",
            "type": {
                "caption": "חלוקת מזון",
                "id": ""
            },
            "description": "חלוקת מזון בחגים",
            "eventDateJson": "2021-09-06",
            "startTime": "08:23",
            "endTime": "17:23",
            "city": "חיפה",
            "theAddress": "הנשיא 8 חיפה",
            "longLat": "32.8154082,34.9785697",
            "thePhone": "066666666",
            "thePhoneDisplay": "06-666-6666",
            "thePhoneDescription": "בדיקה",
            "requiredVolunteers": 10,
            "registeredVolunteers": 1,
            "registeredToEvent": false,
            "eventLogo": "/men/assets/apple-touch-icon.png",
            "location": {
                "lat": 32.8154082,
                "lng": 34.9785697
            },
            "orgName": "מנחם סלי מזון",
            "site": "men"
        }
    ]
}
```

* registeredToEvent - is the volunteer registered to the event, based on the phone number parameter provided in the request args.

## Register/UnRegister to event
`POST /guest/api/event-Info/registerVolunteerToEvent`

Example request body:
```json
{
    "args": [
        "92af7977-f64f-4dff-af36-614aa1f22256",
        "men",
        true
    ],
    "fields": {
        "phone": "0507330590",
        "name": "נועם",
        "rememberMeOnThisDevice": true
    }
}
```

* args[0] - event's `id` 
* args[1] - event's `site`
* args[2] - add or remove from event, true=add, false=remove

Please do not register to events where the `registeredVolunteers` >= `requiredVolunteers`

### Validations
* valid phone number
* name is required

### Response
The event info after the volunteer registration
```json
{
    "result": {
         "id": "92af7977-f64f-4dff-af36-614aa1f22256",
            "name": "חגי תשרי",
            "type": {
                "caption": "חלוקת מזון",
                "id": ""
            },
            "description": "חלוקת מזון בחגים",
            "eventDateJson": "2021-09-06",
            "startTime": "08:23",
            "endTime": "17:23",
            "city": "חיפה",
            "theAddress": "הנשיא 8 חיפה",
            "longLat": "32.8154082,34.9785697",
            "thePhone": "066666666",
            "thePhoneDisplay": "06-666-6666",
            "thePhoneDescription": "בדיקה",
            "requiredVolunteers": 10,
            "registeredVolunteers": 2,
            "registeredToEvent": false,
            "eventLogo": "/men/assets/apple-touch-icon.png",
            "location": {
                "lat": 32.8154082,
                "lng": 34.9785697
            },
            "orgName": "מנחם סלי מזון",
            "site": "men"
    },
    "fields": {
        "phone": "0507330590",
        "name": "נועם",
        "rememberMeOnThisDevice": true
    }
}
```
