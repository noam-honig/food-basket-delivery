

rem remember these for future use
heroku addons:create heroku-postgresql:DBTYPE

heroku addons:create heroku-postgresql:hobby-dev
heroku pg:wait
heroku maintenance:on
heroku pg:copy DATABASE_URL HEROKU_POSTGRESQL_PINK --app sushi
heroku pg:promote HEROKU_POSTGRESQL_PINK
heroku maintenance:off
heroku addons:destroy HEROKU_POSTGRESQL_LAVENDER

copy from one db to another
heroku pg:copy app1_name::HEROKU_POSTGRESQL_ONYX_URL HEROKU_POSTGRESQL_AQUA_URL --app app2_name


