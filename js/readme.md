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

The service layer is a set of functions that contain business logic.
These functions can call each other, and understand each other's return values.
This means that return values should not be serialized. Let the handler decide whether it's returning JSON or XML.

Use the `verbNoun()` naming convention. 
Since layer is primarily about logic, rather than the underlying entities used within a service, so the verb is paramount.

Services will naturally be a mix of high level functions and low level functions.
Avoid mixing low level logic in a high level service.
If two services need to share the same logic there are two options, 
1. Favour locality of behaviour, and extract the logic into a private function (a separate function within the service, that is not exported)
2. Or if it needs to be shared with other services, extract the logic into a new lower level service.

This is opposed to making large general purpose services.
When logic is categorized into a class or module, it's not always clear where each new function should go,
e.g. if there's a `UserService`, and an `EmailValidationService`, where does the function go that deletes an email token and flags a user as validated.
And as services grow larger, the more you approach chicken and egg problems with services that need to import each other.

A service should expose a single entrypoint, and it's best to have this as plain functions rather than classes.
Putting this logic into classes creates extra overheads and barriers to entry, where you first have to instantiate it, and then know what to call inside it.
Classes encapsulate both behaviour and logic, whereas the service layer should just be a hierarchy of logic, not data.
Keeping the two separate give more flexibility, and reduces the need for later refactors.

The service layer doesn't, and shouldn't, care how it is reached.
Sometimes it might be through an API. Other times it might be driven off a queue.
Avoid fragmenting the codebase based on what runs the code, so services are reusable.
Bundling and tree shaking are good option to avoid issues with the artifacts becoming too large.

In this sample code, all three major layers return objects which contain a `status` field.
This allows services to easily understand the outcome of a call. 
It's also a pattern for errors as return values, which means 
exceptions are reserved for exceptional cases where recovery is not possible.

### [Data Access Layer](./dal)

- Named after entities.\
  e.g. User and UserEmailToken
- Responsible for persisting data, or calling external APIs.
- Layer of abstraction for the underlying data store,\
  e.g. services unchanged if database migrates, and use models to aid with this abstraction.
- Manage entities independently.
  - If queries have joins to other entities, have them in a separate combined DAL.
- To avoid n + 1, allow lists as parameters.\
  e.g. the user DAL should be able to accept a list of userIds that go into a `WHERE IN (...)`\
  so that you can select in batches.

In the case of serverless applications, not every DAL needs to open up a database connection for every worker or lambda.
And, it may not always be clear in the data layer which databases need to be connected to.
A simple solution to this is to only establish connections on demand. 
If there's any scaling involved, consider having very small connection pools.
Avoiding global code which connects to databases, as this is not as easily removed by tree shaking when it's not needed.

### [Data Models](./model)

- Also named after entities, or data that needs to be sent between services.
- Could take the form of data classes or type definitions to aid development.
- Avoid having any business logic here.
- The code in this layer will naturally be shaped by the libraries or frameworks you're using.
- As much as possible, use this layer to prevent services from needing to understand a specific library or framework.

### [Utils](./util)

- Common functions not related to business logic.