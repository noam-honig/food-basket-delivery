import { Entity, Field, IdEntity,Fields  } from "remult";

@Entity<MemoryStats>("memoryStats", {
  defaultOrderBy: {
    stamp: "desc"
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
  mem: any;

  @Fields.object({
    valueConverter: {
      fieldTypeInDb: 'json'
    }
  })
  stats: any;
}