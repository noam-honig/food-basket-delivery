
import { Entity, EntityBase, EntityMetadata, EntityRef, FieldRef, Fields, FieldsRef, FieldType, getEntityRef, IdEntity, isBackend, Remult } from "remult";
import { Roles } from "../auth/roles";
import { Field } from "../translate";

@Entity<ChangeLog>("changeLog", {
    allowApiRead: Roles.admin,
    defaultOrderBy: {
        changeDate: "desc"
    }
})
export class ChangeLog extends IdEntity {
    @Field()
    relatedId: string = '';
    @Field()
    relatedName: string = '';
    @Field()
    entity: string = '';
    @Field()
    appUrl: string = '';
    @Field()
    apiUrl: string = '';
    @Field()
    changeDate: Date = new Date();
    @Field()
    userId: string;
    @Field()
    userName: string;
    @Field()
    changes: change[] = [];
    @Field()
    changedFields: string[] = [];
}
export interface changeEvent {
    date: Date,
    userId: string,
    userName: string,
    changes: change[]

}
export interface change {
    key: string;
    oldValue: string;
    oldDisplayValue: string;
    newValue: string;
    newDisplayValue: string;
}


export async function recordChanges<entityType extends EntityBase>(remult: Remult, self: entityType, options?: ColumnDeciderArgs<entityType>) {
    if (!self.isNew() && isBackend()) {
        let changes = [] as change[];
        const decider = new FieldDecider(remult, self, options);

        for (const c of decider.fields.filter(c => c.valueChanged())) {
            try {
                let transValue = (val: any) => val;
                if (c.metadata.options.displayValue)
                    transValue = val => c.metadata.options.displayValue!(self, val);
                else if (c.metadata.valueType === Boolean)
                    transValue = val => val ? "V" : "X";

                const noVal = decider.excludedValues.includes(c);
                changes.push({
                    key: c.metadata.key,
                    oldDisplayValue: noVal ? "***" : transValue(c.originalValue),
                    newDisplayValue: noVal ? "***" : transValue(c.value),
                    newValue: noVal ? "***" : (c.value instanceof IdEntity) ? c.value.id : c.metadata.options.valueConverter.toJson(c.value),
                    oldValue: noVal ? "***" : (c.originalValue instanceof IdEntity) ? c.originalValue.id : c.metadata.options.valueConverter.toJson(c.originalValue)
                });
            } catch (err) {
                console.log(c);
                throw err;

            }
        }


        if (changes.length > 0) {
            await remult.repo(ChangeLog).insert({
                changeDate: new Date(),
                changedFields: changes.map(x => x.key),
                changes,
                entity: self._.metadata.key,
                relatedId: self._.getId().toString(),
                relatedName: self.$.find("name")?.value,
                userId: remult.user.id,
                userName: remult.user.name,
                appUrl: remult.requestRefererOnBackend,
                apiUrl: remult.requestUrlOnBackend
            })
        }

    }
}
interface ColumnDeciderArgs<entityType> {
    excludeColumns?: (e: FieldsRef<entityType>) => FieldRef<any>[],
    excludeValues?: (e: FieldsRef<entityType>) => FieldRef<any>[]
}
export class FieldDecider<entityType>{
    fields: FieldRef<entityType>[];
    excludedFields: FieldRef<entityType>[];
    excludedValues: FieldRef<entityType>[];
    constructor(remult: Remult, entity: entityType, options: ColumnDeciderArgs<entityType>) {
        const meta = getEntityRef(entity);
        if (!options?.excludeColumns)
            this.excludedFields = [];
        else
            this.excludedFields = options.excludeColumns(meta.fields);
        if (!options?.excludeValues)
            this.excludedValues = [];
        else this.excludedValues = options.excludeValues(meta.fields);
        this.excludedFields.push(...meta.fields.toArray().filter(c => c.metadata.options.serverExpression));
        this.excludedFields.push(...meta.fields.toArray().filter(c => c.metadata.options.sqlExpression));
        this.fields = meta.fields.toArray().filter(f => !this.excludedFields.includes(f));
    }
}

/*
select value->'newValue'->>'address',value from (
select * from uga.changelog ) as x ,json_array_elements(cast (x.changes as json))
where value->>'key' ='email'
order by changeDate desc
*/