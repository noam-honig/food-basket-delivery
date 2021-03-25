## Hagai Food Delivery App

For info, see https://noam-honig.github.io/salmaz/en.html

## Dev Environment setup

### Step 1:
```
git clone https://github.com/noam-honig/food-basket-delivery.git
```

### Step 2:
rename the `sample.env` to `.env` and set the correct values in it in terms of google api keys etc....


## To run the app
```
npm install
npm run build
npm run start
```
When the application runs in production it uses just one server for both api and angular static pages.

## To work and develop in vs code we recommend the following:

When developing we run two servers:
1. Api server that run on port 3000
2. Angular dev server that run on port 4200 
   * we configure a proxy in the angular dev server to forward api calls to the api server, see `proxy.conf.json`

### To  run the dev environment
1. Run Task `ng-serve`  to run angular cli development server (on port 4200)
2. Run Task `node-serve` to build and run the `node js` server.

* if you need to debug something, run the `Attach to Running Node Server` debug configuration


## Running the application for the first time
When you run the application, you are prompted to enter a phone number and name.
The first user that signs into a new environment is imprinted as it's admin.

After that you'll be asked to configure a password - and now you are the admin of this server.

You can create new environments for organizations by clicking the add environment button


### index.html
The index file is changed on the fly as you run the application in production, according to the environment language and direction.
For development purposes you can use the index_dev.html and change it to match what the language and direction you want to test at that time

### Contributing code
To contribute to this repository please fork in and use pull requests.

For an excellent guide on how to do it, see [Contribute to someone's repository](http://kbroman.org/github_tutorial/pages/fork.html)