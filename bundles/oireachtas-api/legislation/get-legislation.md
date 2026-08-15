---
type: API Endpoint
title: GET /legislation - Legislation Endpoint
description: Legislation Endpoint
resource: https://api.oireachtas.ie/v1/legislation
tags:
  - api
  - endpoint
  - legislation
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

# GET /legislation

**Legislation Endpoint**

Returns list of bills filtered by the base and additional parameters.
The list supports paging.

#### Mapping
* bill_status - bill.status
* bill_source - bill.source
* date_start (Greater Than or Equal To) - bill.mostRecentStage.event.dates.date
* date_end (Less Than or Equal To) - bill.mostRecentStage.event.dates.date
* last_updated (Greater Than or Equal To) - bill.lastUpdated
* skip - this will ignore the first x number of records set in the parameter
* limit - this will only return a specific amount of records - the maximum allowed limit is 1,000 records per request. To retrieve more records, use limit=1000 together with the skip parameter, e.g. skip=0, skip=1000, skip=2000, etc.
* member_id - bill.sponsors.sponsor.by.uri
* bill_id - bill.uri
* bill_no - bill.billNo
* bill_year - bill.billYear
* chamber_id - bill.mostRecentStage.event.house.uri
* act_year - bill.act.actYear
* act_no - bill.act.actNo

## Request Details

* **HTTP Method**: `GET`
* **Endpoint Path**: `/legislation`
* **Full URL**: `https://api.oireachtas.ie/v1/legislation`
* **Consumes**: `application/json`
* **Produces**: `application/json`

## Parameters

| Parameter | In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `bill_status` | query | `array` | No | An array which is used to filter legislation by status detailed in default settings below.  Comma seperated. |
| `bill_source` | query | `array` | No | An array used to filter legislation by origin source. |
| `date_start` | query | `string` | No | In the format YYYY-MM-DD (e.g. 1900-12-31) |
| `date_end` | query | `string` | No | In the format YYYY-MM-DD (e.g. 2025-12-31) |
| `last_updated` | query | `string` | No | In the format YYYY-MM-DD (e.g. 2025-12-31) |
| `skip` | query | `integer` | No | This allows skipping of records by a specific integer, e.g. 1000, 2000, etc. |
| `limit` | query | `integer` | No | This allows the limiting of records to a specific integer - the maximum allowed limit is 1,000 records per request. To retrieve more records, use limit=1000 together with the skip parameter, e.g. skip=0, skip=1000, skip=2000, etc. |
| `member_id` | query | `string` | No | Filter by Member uri, e.g. /ie/oireachtas/member/id/Brendan-Howlin.S.1983-02-23 |
| `bill_id` | query | `string` | No | Filter results by Bill uri, e.g /ie/oireachtas/act/2025/1 |
| `bill_no` | query | `string` | No | Filter Bill by number. |
| `bill_year` | query | `string` | No | Filter Bill by year. |
| `chamber_id` | query | `array` | No | Filter by house or committee uri, e.g. /ie/oireachtas/house/dail/32 |
| `act_year` | query | `string` | No | Filter Bill by Act year. |
| `act_no` | query | `string` | No | Filter Bill by Act number. |
| `lang` | query | `string` | No | language of document to extract. Defaults to English (en) |

## Responses

| HTTP Status | Description |
| --- | --- |
| `200` | Success |
| `default` | Error |

## Code Examples

### cURL

```bash
curl -X GET "https://api.oireachtas.ie/v1/legislation" \
  -H "Accept: application/json"
```

### Python (requests)

```python
import requests

url = "https://api.oireachtas.ie/v1/legislation"
headers = {"Accept": "application/json"}

response = requests.get(url, headers=headers)
print(response.status_code)
print(response.json())
```

---

[^src-houses-of-the-oireac]: [Houses of the Oireachtas Open Data APIs](https://api.oireachtas.ie/) - OpenAPI Specification
