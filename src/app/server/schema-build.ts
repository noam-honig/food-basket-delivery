import { Pool } from 'pg';
import { Entity, DateColumn, DateTimeColumn, BoolColumn, NumberColumn } from 'radweb';
export class SchemaBuilder {

    CreateIfNotExist(e: Entity<any>): any {
        this.pool.query("select 1 from information_Schema.tables where table_name=$1", [e.__getDbName().toLowerCase()]).then(r => {
            if (r.rowCount == 0) {
                let result = '';
                e.__iterateColumns().forEach(x => {
                    if (!x.__isVirtual()) {
                        if (result.length != 0)
                            result += ',';
                        result += '\r\n  ' + x.__getDbName();
                        if (x instanceof DateTimeColumn)
                            result += " date";
                        else if (x instanceof BoolColumn)
                        result += " boolean default false not null";
                         else if (x instanceof NumberColumn)
                            result += " int default 0 not null";
                         else
                            result += " varchar default '' not null ";
                        if (x == e.__idColumn)
                            result += ' primary key';
                    }
                });
                this.pool.query('create table ' + e.__getDbName() + ' (' + result + '\r\n)');
            }
        });
    }

    constructor(private pool: Pool) {
''.toString();
    }
}