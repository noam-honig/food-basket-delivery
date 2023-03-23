import { Entity, Field, IdEntity, Fields } from 'remult'

@Entity<MemoryStats>('memoryStats', {
  defaultOrderBy: {
    stamp: 'desc'
  }
})
export class MemoryStats extends IdEntity {
  @Fields.date()
  stamp = new Date()

  @Fields.object({
    valueConverter: {
      fieldTypeInDb: 'json'
    }
  })
  mem: any

  @Fields.object({
    valueConverter: {
      fieldTypeInDb: 'json'
    }
  })
  stats: any
}


/*
select stamp, cast(stats->>'total' as integer),cast (stats->>'total$sse' as integer) from guest.memoryStats 
order by 1 desc NULLS LAST
limit 1000
*/