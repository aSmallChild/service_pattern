# Service Pattern Demo

This project contains an example of the service pattern in javascript.

It uses native node libraries for local development and testing.

There is a custom local dev server for handlers to mimic how AWS lambdas would call them.

### Getting started

To get this project up and running for local development, run [`local_dev.sh`](./local_dev.sh):

```sh
./local_dev.sh
```
Which runs the following:
*   `docker compose up` starts the database and mail server.
*   `npm install` 
*   `npm run dev` starts webserver in watch mode

Then you can access the local services:
*   **Database:** credentials here [docker-compose.yml](../local_dev/docker-compose.yml)
*   **Mailpit:** open [localhost:8025/](http://localhost:8025/) in your web browser to access the catch-all inbox.
*   **API:** runs on [localhost:3000/](http://localhost:3000/)

### Tests

Tests require the database & mail server to be running.
```sh
npm run test
```

### Deeper dive documentation

*   [Service Layer](./service/README.md)
*   [Validation Logic](./validator/README.md)
*   [Data Access Layer](./dal/README.md)
*   [Utility Functions](./util/README.md)
*   [Data Models](./model/README.md)
*   [Request Handlers](./handler/README.md)
