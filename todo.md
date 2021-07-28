## to fix now
[V] width of status in update family screen.



## talk to yoni
[V] filters in entity - active for distribution center.
[V] complex lookup columns - distribution center, helper id
[V] multi column complex values- address + api result


## next version
[] restore the original parameter structure of addBox etc...
[] make questions object column
[] make geocode response object column
[] phone strategy object column

## Todo
[V] fix late binding of caption
[V] reconsider entity defs, columns etc... for the sql stuff - see groupsstatsforalldeliverycenters
[V] column used to have valueChange - that triggered stuff - used for duplicate check of name, phone and tz.
[V] review the whole archive helper strategy
[V] go over the delivery status options visibility and what happened to it (was in DeliveryStatusColumn)
[V] fix work with secondary database as used in overview
[V] fix helper work to select columns on grid and on dialog
[V] test merge
[V] test import phone
[V] select helper in distribution map controller
[V] verify that in the register helper, the caption for the address works ok
[V] Fix custom column

[V] create delivery, problem with top textbox

## test
[V] test import from excel
[V] test that there are no db changes.
[V] test and review archive helper class
[V] test duplicate phone check
[V] update of settings in manage component
[V] update user preferences
[V] test delivery options settings visibility based on usage
[V] test overview functionality
[V] fix חשב מסלול מחדש
[V] test all assignments 
[V] test questions for volunteer - only displays relevant questions
[V] test custom columns for family is ok
[V] test duplicate families - all the checkboxes there etc...
[V] fix select family
[V] test data-control size with icon on data-area - it seems to make the height grow, which it did not before
[V] disable mail and phone icons in the ui for register donor
[V] fix load helper history
[V] fix playback
[V] fix filter on date in history?
[V] update info
[V] first entrance to "guest" gave an error - and second :) - sign out and refresh to get this
[V] https://hugmomst.herokuapp.com/alex/my-families gave error about name
[V] sign in should move to deliveries - nowhere else
[V] excel import of helpers

[V] merge families
[V] fix excel export for async items
[V] test group dialog
[] do some work on uberContext via function