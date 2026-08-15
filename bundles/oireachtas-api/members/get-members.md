---
type: API Endpoint
title: GET /members - Members Endpoint
description: Members Endpoint
resource: https://api.oireachtas.ie/v1/members
tags:
  - api
  - endpoint
  - members
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

# GET /members

**Members Endpoint**

Returns a list of members.
The list supports paging.

#### Mapping
* date_start (Greater Than or Equal To) - member.memberships.membership.dateRange.start
* date_end (Less Than or Equal To) - member.memberships.membership.dateRange.start
* chamber_id - member.memberships.membership.house.uri
* chamber - member.memberships.membership.house.houseCode
* house_no - member.memberships.membership.house.houseNo
* member_id - member.uri
* skip - this will ignore the first x number of records set in the parameter
* limit - this will only return a specific amount of records - the maximum allowed limit is 1,000 records per request. To retrieve more records, use limit=1000 together with the skip parameter, e.g. skip=0, skip=1000, skip=2000, etc.
* party_code - member.memberships.membership.parties.party.partyCode
* party_id - member.memberships.membership.parties.party.uri
* const_code - member.memberships.membership.represents.represent.representCode
* const_id - member.memberships.membership.represents.represent.uri
* fuzzy_name_search - member.fullName

## Request Details

* **HTTP Method**: `GET`
* **Endpoint Path**: `/members`
* **Full URL**: `https://api.oireachtas.ie/v1/members`
* **Consumes**: `application/json`
* **Produces**: `application/json`

## Parameters

| Parameter | In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `date_start` | query | `string` | No | In the format YYYY-MM-DD (e.g. 1900-12-31) |
| `date_end` | query | `string` | No | In the format YYYY-MM-DD (e.g. 2025-12-31) |
| `chamber_id` | query | `array` | No | Filter by house or committee uri, e.g. /ie/oireachtas/house/dail/32 |
| `chamber` | query | `string` | No | Filter by House name (dail or seanad). Using an empty string retrieves results for both Houses. |
| `house_no` | query | `integer` | No | Filter by house number (integer only) |
| `member_id` | query | `string` | No | Filter by Member uri, e.g. /ie/oireachtas/member/id/Brendan-Howlin.S.1983-02-23 |
| `skip` | query | `integer` | No | This allows skipping of records by a specific integer, e.g. 1000, 2000, etc. |
| `limit` | query | `integer` | No | This allows the limiting of records to a specific integer - the maximum allowed limit is 1,000 records per request. To retrieve more records, use limit=1000 together with the skip parameter, e.g. skip=0, skip=1000, skip=2000, etc. |
| `party_code` | query | `string` | No | Filter by party code, e.g. Labour_Party |
| `party_id` | query | `string` | No | Filter by unique party identifier (uri), e.g. /ie/oireachtas/party/dail/32/Labour_Party |
| `const_code` | query | `string` | No | Filter by constituency code, e.g. Administrative-Panel |
| `const_id` | query | `string` | No | Filter by unique constituency identifier (uri), e.g. /ie/oireachtas/house/seanad/26/panel/Administrative-Panel |
| `fuzzy_name_search` | query | `string` | No | Filter by name with fuzzy search (typo safe) |

## Responses

| HTTP Status | Description |
| --- | --- |
| `200` | Success |
| `default` | Error |

## Code Examples

### cURL

```bash
curl -X GET "https://api.oireachtas.ie/v1/members" \
  -H "Accept: application/json"
```

### Python (requests)

```python
import requests

url = "https://api.oireachtas.ie/v1/members"
headers = {"Accept": "application/json"}

response = requests.get(url, headers=headers)
print(response.status_code)
print(response.json())
```

---

[^src-houses-of-the-oireac]: [Houses of the Oireachtas Open Data APIs](https://api.oireachtas.ie/) - OpenAPI Specification
