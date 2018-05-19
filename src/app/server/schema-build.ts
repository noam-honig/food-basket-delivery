import { Pool } from 'pg';
import { Entity, DateColumn, DateTimeColumn, BoolColumn, NumberColumn, Column } from 'radweb';
export class SchemaBuilder {

    CreateIfNotExist(e: Entity<any>): any {
        this.pool.query("select 1 from information_Schema.tables where table_name=$1", [e.__getDbName().toLowerCase()]).then(r => {
            if (r.rowCount == 0) {
                let result = '';
                e.__iterateColumns().forEach(x => {
                    if (!x.__isVirtual()) {
                        if (result.length != 0)
                            result += ',';
                        result += '\r\n  ';
                        result = this.addColumnSqlSyntax(x);
                        if (x == e.__idColumn)
                            result += ' primary key';
                    }
                });
                this.pool.query('create table ' + e.__getDbName() + ' (' + result + '\r\n)');
            }
        });
    }
    private addColumnSqlSyntax(x: Column<any>) {
        let result = x.__getDbName();
        if (x instanceof DateTimeColumn)
            result += " date";
        else if (x instanceof BoolColumn)
            result += " boolean default false not null";
        else if (x instanceof NumberColumn)
            result += " int default 0 not null";
        else
            result += " varchar default '' not null ";
        return result;
    }

    async addColumnIfNotExist<T extends Entity<any>>(e: T, c: ((e: T) => Column<any>)) {
        try {
            if (
                (await this.pool.query(`select 1   
        FROM information_schema.columns 
        WHERE table_name=$1 and column_name=$2`,
                    [e.__getDbName().toLocaleLowerCase(),
                    c(e).__getDbName().toLocaleLowerCase()])).rowCount == 0) {

                await this.pool.query(
                    `alter table ${e.__getDbName()} add column ${this.addColumnSqlSyntax(c(e))}`);
            }
            else
                console.log('exists');
        }
        catch (err) {
            console.log(err);
        }
    }

    constructor(private pool: Pool) {

    }
}