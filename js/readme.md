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

## Code breakdown

*   [/handler](./handler) - [Handlers](#handlers)
*   [/validator](./validator) - [Validation Logic](#validators)
*   [/service](./service) - [Service Layer](#services)
*   [/dal](./dal) - [Data Access Layer](#data-access-layer)
*   [/model](./model) - [Data Models](#data-models)
*   [/util](./util) - [Utility Functions](#utils)

### [Handlers](./handler)

- Named after an entrypoint into the code,\
  e.g. an API endpoint.
- Deals with protocol,\
  e.g. SQS or HTTP.
- Extract data from payload & pass to services,\
  e.g. message body, or http request body.
- Performs static validation,\
  e.g. were the relevant fields present?
- Formats responses, acts as a presentation layer.

### [Validators](./validator)

A layer that's used by handlers, prior to entering the service layer, to ensure garbage isn't being passed to services.

In this example, validators only do static validation e.g. checking that required fields are present.
Services are responsible for all other forms of validation e.g. checking if a username is taken, which involves querying the database.

### [Services](./service)

The service layer is a set of functions that can call each other, and understand each other's return values.
This means that return values should not be serialized. Let the handler decide whether it's returning JSON or XML.
In the sample code there is a util that defines some constants which can be mapped to status codes.
This helps to make services agnostic of any external protocols.
If you had a websocket API, or you were processing items off a queue, it wouldn't be very useful to have services returning HTTP status codes.

If two services need to share the same logic, this can be extracted into a new lower level service.
This is opposed to making a large general purpose service, which leads to chicken and egg problems with services that need to import each other.

As services are about business logic, it's best to have them as plain functions.
Putting this logic into classes creates extra overheads and barriers to entry.

- Named after the business logic it contains.
- Exposes a single entrypoint,\
  e.g one exported function per file.
- Agnostic of any protocol.
  - Handlers deal with presentation and protocol.
- Can be called by other services, without RPC.
- Return value is consumable by other services,\
  e.g. should not be serialized.

### [Data Access Layer](./dal)

As services are a family of functions which can all call each other, it won't be clear in the data layer which databases need to be connected to.
A simple solution to this is to only establish connections on demand. 
And if using lambdas or anything else that scales, consider having very small connection pools.

- Named after entities.\
  e.g. User and UserEmailToken
- Responsible for persisting data, or calling external APIs.
- Layer of abstraction for the underlying data store,\
  e.g. services unchanged if database migrates, and use Models to aid with this abstraction.
- Manage entities independently.
  - If queries have joins to other entities, have them in a separate combined DAL.
- To avoid n + 1, allow lists as parameters.\
  e.g. the user DAL should be able to accept a list of userIds that go into a `WHERE IN (...)`\
  so that you can select in batches.

### [Data Models](./model)

- Also named after entities, or data that needs to be sent between services.
- Could take the form of data classes or type definitions to aid development.
- Avoid having any business logic here.
- The code in this layer will naturally be shaped by the libraries or frameworks you're using.
- As much as possible, use this layer to prevent services from needing to understand a specific library or framework.

### [Utils](./util)

- Common functions not related to business logic.