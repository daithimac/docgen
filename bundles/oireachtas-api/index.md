---
okf_version: "0.2"
---

# Houses of the Oireachtas Open Data APIs (v1.1.0)

The Houses of the Oireachtas is providing these APIs to allow our datasets to be retrieved and reused as widely as possible. They are intended to be used in conjunction with https://data.oireachtas.ie, from where our datasets can be accessed directly. By using the APIs, users can make metadata queries to identify the specific data they require. New data are available through the API as soon as they are published.

Currently, https://data.oireachtas.ie contains data in XML format from the Official Report of the Houses of the Oireachtas (the "debates") and replies to Parliamentary Questions in XML files complying with the [Akoma Ntoso](https://unsceb-hlcm.github.io) schema, as well as data in PDF format for Bills, Acts and other documents published by the Houses of the Oireachtas.

Files can be retrieved from https://data.oireachtas.ie by adding the URI fragment contained in the "formats" fields of the JSON documents returned by these APIs. At the moment only PDF and XML files are available directly from https://data.oireachtas.ie, but this will become the endpoint for direct access of all "uri" fields in the data queried through https://api.oireachtas.ie. We will also be making bulk downloads available through https://data.oireachtas.ie.

Please note the APIs are a work in progress. We are working on expanding the range of datasets we publish, and we are interested in hearing about how to make these APIs more useful and wide ranging. For these reasons, we welcome any feedback, suggestions and user stories to open.data@oireachtas.ie

Data published through these APIs are made available under the [Oireachtas (Open Data) PSI Licence](https://www.oireachtas.ie/en/open-data/license/)

* **Base URL**: `https://api.oireachtas.ie/v1`
* **License**: [Oireachtas (Open Data) PSI Licence ](https://www.oireachtas.ie/en/open-data/license/)
* **Contact**: open.data@oireachtas.ie

## CONSTITUENCIES Section

* [CONSTITUENCIES Directory](constituencies/index.md) - Section index and overview.
* [GET /constituencies](constituencies/get-constituencies.md) - Constituencies Endpoint

## DEBATES Section

* [DEBATES Directory](debates/index.md) - Section index and overview.
* [GET /debates](debates/get-debates.md) - Debates Endpoint

## HOUSES Section

* [HOUSES Directory](houses/index.md) - Section index and overview.
* [GET /houses](houses/get-houses.md) - Houses Endpoint

## LEGISLATION Section

* [LEGISLATION Directory](legislation/index.md) - Section index and overview.
* [GET /legislation](legislation/get-legislation.md) - Legislation Endpoint

## MEMBERS Section

* [MEMBERS Directory](members/index.md) - Section index and overview.
* [GET /members](members/get-members.md) - Members Endpoint

## PARTIES Section

* [PARTIES Directory](parties/index.md) - Section index and overview.
* [GET /parties](parties/get-parties.md) - Parties Endpoint

## QUESTIONS Section

* [QUESTIONS Directory](questions/index.md) - Section index and overview.
* [GET /questions](questions/get-questions.md) - Questions Endpoint

## VOTES Section

* [VOTES Directory](votes/index.md) - Section index and overview.
* [GET /votes](votes/get-votes.md) - Votes Endpoint

## SCHEMAS Section

* [SCHEMAS Directory](schemas/index.md) - Section index and overview.
* [ErrorResponse](schemas/errorresponse.md) - ErrorResponse data model definition.

