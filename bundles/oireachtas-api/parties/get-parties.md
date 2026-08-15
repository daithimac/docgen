---
type: API Endpoint
title: GET /parties - Parties Endpoint
description: Parties Endpoint
resource: https://api.oireachtas.ie/v1/parties
tags:
  - api
  - endpoint
  - parties
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

# GET /parties

**Parties Endpoint**

Returns list of parties filtered by the base and additional parameters.
The list supports paging.
#### Mapping
* chamber_id - house.uri
* chamber - house.houseCode
* house_no - house.houseNo
* skip - this will ignore the first x number of records set in the parameter
* limit - this will only return a specific amount of records - the maximum allowed limit is 1,000 records per request. To retrieve more records, use limit=1000 together with the skip parameter, e.g. skip=0, skip=1000, skip=2000, etc.

## Request Details

* **HTTP Method**: `GET`
* **Endpoint Path**: `/parties`
* **Full URL**: `https://api.oireachtas.ie/v1/parties`
* **Consumes**: `application/json`
* **Produces**: `application/json`

## Parameters

| Parameter | In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `chamber_id` | query | `array` | No | Filter by house or committee uri, e.g. /ie/oireachtas/house/dail/32 |
| `chamber` | query | `string` | No | Filter by House name (dail or seanad). Using an empty string retrieves results for both Houses. |
| `house_no` | query | `integer` | No | Filter by house number (integer only) |
| `skip` | query | `integer` | No | This allows skipping of records by a specific integer, e.g. 1000, 2000, etc. |
| `limit` | query | `integer` | No | This allows the limiting of records to a specific integer - the maximum allowed limit is 1,000 records per request. To retrieve more records, use limit=1000 together with the skip parameter, e.g. skip=0, skip=1000, skip=2000, etc. |

## Responses

| HTTP Status | Description |
| --- | --- |
| `200` | A list of parties and their associated house |
| `default` | Error |

## Code Examples

### cURL

```bash
curl -X GET "https://api.oireachtas.ie/v1/parties" \
  -H "Accept: application/json"
```

### Python (requests)

```python
import requests

url = "https://api.oireachtas.ie/v1/parties"
headers = {"Accept": "application/json"}

response = requests.get(url, headers=headers)
print(response.status_code)
print(response.json())
```

---

[^src-houses-of-the-oireac]: [Houses of the Oireachtas Open Data APIs](https://api.oireachtas.ie/) - OpenAPI Specification
