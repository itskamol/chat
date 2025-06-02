# Chat Application Backend Migration

This repository contains the backend system for a chat application, being migrated to a NestJS-based microservices architecture.

## Monorepo Structure

The workspace is organized as an NX monorepo with the following main directories:

-   `apps/`: Contains the individual microservice applications (e.g., API Gateway, User Service, Chat Service). Each service is a NestJS application.
-   `libs/`: Contains shared libraries used across different microservices. This includes common DTOs, utility functions, configuration modules, authentication logic, and core TypeScript types.
-   `tools/`: Contains scripts, Docker configurations, and other tooling related to building, testing, and deploying the applications.

## Technical Specification

This project is being developed based on a comprehensive **Technical Specification (TZ)** document (also known as Software Requirements Specification - SRS). The TZ outlines:

-   Detailed functional and non-functional requirements for each microservice.
-   The overall system architecture, including microservice design, inter-service communication strategies (RabbitMQ, gRPC), and database choices.
-   API definitions and interface requirements.
-   The migration strategy from the old system.
-   Technology stack, DevOps practices, and more.

All development should align with the specifications detailed in that document.
