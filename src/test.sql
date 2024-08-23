select id,
  family,
  name as name,
  basketType,
  quantity,
  items,
  distributionCenter,
  deliverStatus,
  courier,
  courierComments,
  courierCommentsDate,
  internalDeliveryComment,
  routeOrder,
  special,
  deliverySta tusDate,
  courierAssignUser,
  courierAssingTime,
  deliveryStatusUser,
  createDate,
  createUser,
  needsWork,
  needsWorkUser,
  needsWorkDate,
  deliveryComments,
  receptionComments,
  familySource,
  groups,
  address,
  floor,
  appartment,
  entrance,
  buildingCode,
  city,
  area,
  addressComment,
  addressLongitude,
  addressLatitud e,
  drivingLongitude,
  drivingLatitude,
  addressByGoogle,
  addressOk,
  fixedCourier,
  familyMembers,
  phone,
  phone1Description,
  phone2,
  phone2Description,
  phone3,
  phone3Description,
  phone4,
  phone4Description,
  case
    when FamilyDeliveries.courier <> '' then exists (
      select 1
      from FamilyDeliveries as fd
      where not (fd.id = FamilyDeliveries.id)
        and fd.family = FamilyDeliveries.family
        and fd.courier = FamilyDeliver ies.courier
        and deliverStatus in (11, 13, 19, 20, 21, 22, 23, 24, 25)
    )
    else false
  end courierBeenHereBefore a s courierBeenHereBefore,
  archive,
  archiveDate,
  onTheWayDate,
  archiveUser,
  case
    when (
      deliveryStatusDa te > current_date -1
      or deliverStatus in (0, 5)
    ) then true
    else false
  end as visibleToCourier,
  case
    wh en FamilyDeliveries.courier <> '' then COALESCE (
      (
        select case
            when h.lastSignInDate > FamilyDeliverie s.courierAssingTime then 3
            when h.smsDate > FamilyDeliveries.courierAssingTime then 2
            else 1
          end
        from Helpers as h
        where h.id = FamilyDeliveries.courier
      ),
      0
    )
    else 0
  end as messageStatus,
  a1,
  a2,
  a3,
  a4,
  (
    select count(*)
    from delivery_images e1
    where e1.deliveryId = FamilyDeliveries.id
  ) as numOfPhotos,
  caller,
  callerComment,
  lastCallDate,
  callerAssignDate,
  callCount,
  (
    select e1.socialWorker
    from Famili es e1
    where e1.id = FamilyDeliveries.family
    limit 1
  ) as socialWorker,
  urgent,
  deliveryType,
  pickupVol unteer,
  addressApiResult_2,
  address_2,
  floor_2,
  appartment_2,
  entrance_2,
  addressComment_2,
  phone1_2,
  phone1Description_2,
  phone2_2,
  phone2Description_2
from FamilyDeliveries
where lower (name) like lower ('%%')
  and archive = $1
Order By urgent desc,
  na me,
  id
limit 25 offset 0