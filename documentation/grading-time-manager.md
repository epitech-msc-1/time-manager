# Grading criteria

## dockerfiles

Students deliver some valid Dockerfiles of images containerizing the app, for both dev and prod environments.

## containers

Web frontend, web backend and database are isolated inside different containers.

## Persistency

All logs are persistent, even if containers stop, restart or crash.

## Orchestration

The containers are orchestrated via docker-compose.

## Clean Deploy

The docker configurations supplied by the students differentiate various environments.

## Env specificity

Environment variables are specific (ie. they are not the same for different environments).

## Secrets

Secrets (token, password, keys...) are not commit to git in clear-text and are not visible to not granted people.

## API Crafting

A functional REST API is delivered.

## Data Persist

A coherent database is used to ensure data persistence without redundancy, including at least various tables to store data. Students can draw or show a schema of the database.

## Data Viz

The web application allows to visualize relevant and well presented charts.

## Roles

Students defined some relevant roles with cascading rights.

## Auth JWT

To use the application, a JWT authentication is mandatory.

## Auth Persist

Once authenticated, the user stays in the same session until it expires.

## Auth Sec

Students expose at least one method to protect session management against CSRF and XSS attacks.

## API Consumption

The front application consumes data from the back API previously built by students.

## Code Organisation

Front application's code is relevantly organized in classes.

## UI/UX Quality

The delivery offers a high-quality, polished UX and UI : the interface are well conceived to provide a good experience to its users.

## HMI

Students deliver a functional frontend application with different views/interfaces.

## Constraints

Students chose technologies that respect the technical constraints provided in the subject.

## Framework Front

Students use a tool to improve frontend development efficiency, and they provide a professional justification for why they chose it and how they use it.

## Framework Back

Students use a tool to improve backend development efficiency, and they provide a professional justification for why they chose it and how they use it.

## Maintainability

The code is easily maintainable (human readable names, atomicity of each functions, clear code structure, clean syntax).

## Robustness

The web console does NOT display errors.

## Tests Sequence

A sequence of unit tests is provided and easily runnable.

## Tests Coverage

An evaluation of the proportion of source code executed and tested is delivered.

## Tests Automation

A tests sequence is automatically launched via a script or a pipeline.

## CI Pipeline

Students deliver some YAML file(s) defining steps of a complete CI pipeline.

## CI Quality

CI pipeline is stopped when the code does not pass quality checks (unit tests, integration test, linting, ...).

## Versioning Basics

Students use a versioning tool with a proper workflow, including branching strategy, regular commits, descriptive messages, and a gitignore file.

## Doc Basic

Students deliver a technical documentation for the application, covering at least the technological choices, the components and architecture design.

## Presentation

The project is presented in a professional way using a relevant support (slides and/or demo).

## Argumentation

Students support their presentation or technical choices with well-structured arguments, providing logical explanations and evidences.

## Answers

Students provide relevant and concise answers for 3 (ops+back+front) technical questions.
