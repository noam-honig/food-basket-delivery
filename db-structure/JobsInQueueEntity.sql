create table jobsInQueue
id varchar default '' not null
userId varchar default '' not null
url varchar default '' not null
submitTime timestamp
doneTime timestamp
result varchar default '' not null
done boolean default false not null
error boolean default false not null
progress numeric default 0 not null