# Notification & Administration Service 

## Objectives: ##

* Provide common facilities for exploiting environmental data. 
* Improve environmental data searchability thanks to integration of big data infrastructure for structured and semi-structured search facilities.
* Provide a semantic front-end framework for environmental data visualization.

## Modules ##

* **Notification provider**
Provides Web Interface
* **DB Operator**
Queries database

## Architecture ##

![arch.JPG](https://bitbucket.org/repo/oenAxz/images/2675508273-arch.JPG)

## Design ##

The notification system includes the mechanism whereby the users get a notification if a query result has changed in any manner. It will manage all user´s queries, which can have different database endpoints and they may last long time for perform complex queries. The results have to be sent by an asynchronous communication; a publish/subscribe mechanism is used.

## Requirements ##

* MQ Telemetry Transport protocol Broker: such as Mosquitto
* MongoDB
* SPARQL Enpoints: Running as web services

### Example ###

```
#!text

1.	User makes a query in notification provider and activates it.
2.	Notification provider sends the corresponding information to the adequate DB operator through the publish/subscribe mechanism.
3.	DB operator saves the query data and performs the query.
4.	First results are sent back to the notification provider when the query finishes.
5.	DB operator will check continuously if data changes in the database.
6.	Notification provider receives the data by the publish/subscribe mechanism and saves the results so user can review them.
7.	If user is connected, a real time notification will be sent through web socket and a will be visible in the screen.

```
