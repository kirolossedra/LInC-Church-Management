# Pastor Calendar

Calendar persistence is provided by the authenticated Hono Pastor Calendar
API. React consumes one shared snapshot and refreshes it after each mutation
and every 30 seconds. Files in this module must not import `firebase/database`
or send calendar email directly from the browser.
