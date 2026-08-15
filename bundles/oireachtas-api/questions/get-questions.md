---
type: API Endpoint
title: GET /questions - Questions Endpoint
description: Questions Endpoint
resource: https://api.oireachtas.ie/v1/questions
tags:
  - api
  - endpoint
  - questions
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

# GET /questions

**Questions Endpoint**

Returns list of questions filtered by the base and additional parameters.
The list supports paging.
#### Mapping
* date_start (Greater Than or Equal To) - question.date
* date_end (Less Than or Equal To) - question.date
* skip - this will ignore the first x number of records set in the parameter
* limit - this will only return a specific amount of records - the maximum allowed limit is 1,000 records per request. To retrieve more records, use limit=1000 together with the skip parameter, e.g. skip=0, skip=1000, skip=2000, etc.
* qtype - question.questionType
* member_id - question.by.uri
* question_id - question.uri
* question_no - question.questionNumber

## Request Details

* **HTTP Method**: `GET`
* **Endpoint Path**: `/questions`
* **Full URL**: `https://api.oireachtas.ie/v1/questions`
* **Consumes**: `application/json`
* **Produces**: `application/json`

## Parameters

| Parameter | In | Type | Required | Description |
| --- | --- | --- | --- | --- |
| `date_start` | query | `string` | No | In the format YYYY-MM-DD (e.g. 1900-12-31) |
| `date_end` | query | `string` | No | In the format YYYY-MM-DD (e.g. 2025-12-31) |
| `skip` | query | `integer` | No | This allows skipping of records by a specific integer, e.g. 1000, 2000, etc. |
| `limit` | query | `integer` | No | This allows the limiting of records to a specific integer - the maximum allowed limit is 1,000 records per request. To retrieve more records, use limit=1000 together with the skip parameter, e.g. skip=0, skip=1000, skip=2000, etc. |
| `qtype` | query | `array` | No | Filter questions by oral or writtens. |
| `member_id` | query | `string` | No | Filter by Member uri, e.g. /ie/oireachtas/member/id/Brendan-Howlin.S.1983-02-23 |
| `question_id` | query | `string` | No | Identifier for a Single Question, e.g. /ie/oireachtas/question/2025-04-10/pq_1 |
| `question_no` | query | `integer` | No | Filter by question number |
| `show_answers` | query | `boolean` | No | Add answers to the questions response |

## Responses

| HTTP Status | Description |
| --- | --- |
| `200` | Success |
| `default` | Error |

## Code Examples

### cURL

```bash
curl -X GET "https://api.oireachtas.ie/v1/questions" \
  -H "Accept: application/json"
```

### Python (requests)

```python
import requests

url = "https://api.oireachtas.ie/v1/questions"
headers = {"Accept": "application/json"}

response = requests.get(url, headers=headers)
print(response.status_code)
print(response.json())
```

---

[^src-houses-of-the-oireac]: [Houses of the Oireachtas Open Data APIs](https://api.oireachtas.ie/) - OpenAPI Specification
