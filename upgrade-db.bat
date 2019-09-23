set app=shorashim
set dbType=hobby-dev
rem set dbType=standard-0
heroku pg:info --app=%app%

rem create backup
heroku pg:backups:capture --app=%app%
heroku pg:backups:download --app=%app%

rem create db
heroku addons:create heroku-postgresql:%dbType% --app=%app%
heroku pg:wait --app=%app%
heroku pg:info --app=%app%
heroku maintenance:on --app=%app%

------- wait here
set newdb=HEROKU_POSTGRESQL_PUCE_URL
heroku pg:copy DATABASE_URL %newdb% --app=%app%
------- wait here
heroku pg:promote %newdb%  --app=%app%
heroku maintenance:off --app=%app%


------- wait here
heroku pg:info --app=%app%
heroku addons:destroy HEROKU_POSTGRESQL_MAUVE_URL --app=%app%