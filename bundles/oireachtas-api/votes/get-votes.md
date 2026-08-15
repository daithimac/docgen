---
type: API Endpoint
title: GET /votes - Votes Endpoint
description: Votes Endpoint
resource: https://api.oireachtas.ie/v1/votes
tags:
  - api
  - endpoint
  - votes
status: stable
generated:
  by: docgen/okf-api-parser-v0.2
  at: '2026-08-15T23:36:17.377Z'
verified:
  by: process:api-spec-parser
  at: '2026-08-15T23:36:17.377Z'
sources:
  - id: src-houses-of-the-oireac
    resource: https://api.oireachtas.ie/
    title: Houses of the Oireachtas Open Data APIs Specification (v1.1.0)
    author: Oireachtas Open Data
    last_modified: '2026-08-15'
---

# GET /votes

**Votes Endpoint**

This will return a list of votes which meet certain criteria
The list supports paging.
#### Mapping
* chamber_type - division.house.chamberType
* chamber_id - division.house.uri
* chamber - division.house.houseCode
* date_start (Greater Than or Equal To) - bill.mostRecentStage.event.dates.date
* date_end (Less Than or Equal To) - bill.mostRecentStage.event.dates.date
* skip - this will ignore the first x number of records set in the parameter
* limit - this will only return a specific amount of records - the maximum allowed limit is 1,000 records per request. To retrieve more records, use limit=1000 together with the skip parameter, e.g. skip=0, skip=1000, skip=2000, etc.
* outcome - division.outcome
* member_id - division.memberTally.member.uri
* debate_id - division.debate.uri
* vote_id - division.uri

## Request Details

* **HTTP Method**: `GET`
* **Endpoint Path**: `/votes`
* **Full URL**: `https://api.oireachtas.ie/v1/votes`
* **Consumes**: `application/json`
* **Produces**: `application/json`

## Parameters

| Parameter | In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `chamber_type` | query | `string` | No | Filter results by House, ie, Dáil or Seanad or committees. |
| `chamber_id` | query | `array` | No | Filter by house or committee uri, e.g. /ie/oireachtas/house/dail/32 |
| `chamber` | query | `string` | No | Filter by House name (dail or seanad). Using an empty string retrieves results for both Houses. |
| `date_start` | query | `string` | No | In the format YYYY-MM-DD (e.g. 1900-12-31) |
| `date_end` | query | `string` | No | In the format YYYY-MM-DD (e.g. 2025-12-31) |
| `skip` | query | `integer` | No | This allows skipping of records by a specific integer, e.g. 1000, 2000, etc. |
| `limit` | query | `integer` | No | This allows the limiting of records to a specific integer - the maximum allowed limit is 1,000 records per request. To retrieve more records, use limit=1000 together with the skip parameter, e.g. skip=0, skip=1000, skip=2000, etc. |
| `outcome` | query | `array` | No | Filter votes by outcome |
| `member_id` | query | `string` | No | Filter by Member uri, e.g. /ie/oireachtas/member/id/Brendan-Howlin.S.1983-02-23 |
| `debate_id` | query | `string` | No | Filter by debate uri, e.g. /akn/ie/debateRecord/dail/2024-11-07/debate/main |
| `vote_id` | query | `string` | No | Vote Identifier for a Single Vote, e.g. /ie/oireachtas/division/house/dail/34/2025-04-09/vote_43 |

## Responses

| HTTP Status | Description |
| --- | --- |
| `200` | Success |
| `default` | Error |

## Code Examples

### cURL

```bash
curl -X GET "https://api.oireachtas.ie/v1/votes" \
  -H "Accept: application/json"
```

### Python (requests)

```python
import requests

url = "https://api.oireachtas.ie/v1/votes"
headers = {"Accept": "application/json"}

response = requests.get(url, headers=headers)
print(response.status_code)
print(response.json())
```

---

[^src-houses-of-the-oireac]: [Houses of the Oireachtas Open Data APIs](https://api.oireachtas.ie/) - OpenAPI Specification
