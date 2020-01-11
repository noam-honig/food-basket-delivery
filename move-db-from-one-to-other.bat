rem - this is what we need to do:
heroku addons:create heroku-postgresql:hobby-dev --app=kol-halev
heroku pg:wait --app=kol-halev
heroku pg:info --app=kol-halev
heroku pg:copy dinale::DATABASE_URL HEROKU_POSTGRESQL_CYAN_URL --app=kol-halev
heroku pg:promote HEROKU_POSTGRESQL_CYAN_URL --app=kol-halev