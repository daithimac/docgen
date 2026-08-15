---
type: API Endpoint
title: GET /debates - Debates Endpoint
description: Debates Endpoint
resource: https://api.oireachtas.ie/v1/debates
tags:
  - api
  - endpoint
  - debates
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

# GET /debates

**Debates Endpoint**

Returns list of debates filtered by the base and additional parameters.
The list supports paging.
#### Mapping
* chamber_type - debateRecord.house.chamberType
* chamber_id - debateRecord.house.uri
* chamber - debateRecord.house.houseCode
* date_start (Greater Than or Equal To) - debateRecord.date
* date_end (Less Than or Equal To) - debateRecord.date
* skip - this will ignore the first x number of records set in the parameter
* limit - this will only return a specific amount of records - the maximum allowed limit is 1,000 records per request. To retrieve more records, use limit=1000 together with the skip parameter, e.g. skip=0, skip=1000, skip=2000, etc.
* member_id - debateRecord.debateSections.debateSection.speakers.speaker
* debate_id - debateRecord.uri

## Request Details

* **HTTP Method**: `GET`
* **Endpoint Path**: `/debates`
* **Full URL**: `https://api.oireachtas.ie/v1/debates`
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
| `member_id` | query | `string` | No | Filter by Member uri, e.g. /ie/oireachtas/member/id/Brendan-Howlin.S.1983-02-23 |
| `debate_id` | query | `string` | No | Filter by debate uri, e.g. /akn/ie/debateRecord/dail/2024-11-07/debate/main |

## Responses

| HTTP Status | Description |
| --- | --- |
| `200` | Success |
| `default` | Error |

## Code Examples

### cURL

```bash
curl -X GET "https://api.oireachtas.ie/v1/debates" \
  -H "Accept: application/json"
```

### Python (requests)

```python
import requests

url = "https://api.oireachtas.ie/v1/debates"
headers = {"Accept": "application/json"}

response = requests.get(url, headers=headers)
print(response.status_code)
print(response.json())
```

---

[^src-houses-of-the-oireac]: [Houses of the Oireachtas Open Data APIs](https://api.oireachtas.ie/) - OpenAPI Specification
