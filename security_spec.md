# Security Specification - TeamTrack Soccer

## Data Invariants
1. A Game must have a valid ISO timestamp for `date`.
2. Home games (location: "Central Park, Malvern") require a Pitch Marshal and Referee.
3. Users can only sign themselves up for duties or update a duty if it's currently empty.

## The "Dirty Dozen" Payloads
1. **Unauthorized Create**: Create a game without being an admin (blocked).
2. **Duty Override**: Overwrite someone else's snack duty (blocked).
3. **Invalid ID**: Use a 1MB string as a document ID (blocked).
4. **State Poisoning**: Set `isHome` to a string instead of boolean (blocked).
5. **PII Leak**: Read the entire `users` collection without authentication (blocked).
6. **Bypass Rules**: Update a game's `date` or `opponent` as a parent (only duties can be updated by parents).
7. **Identity Spoofing**: Signed-in user A tries to update a game claiming they are user B (blocked).
8. **Invalid Date**: Setting `date` to "tomorrow" as a string (blocked).
9. **Shadow Field**: Adding a `hiddenFlag` to a game document (blocked).
10. **Resource Exhaustion**: Sending a 1MB string in the `location` field (blocked).
11. **Malicious Pitch Marshal**: Setting `pitchMarshal` to a script tag (blocked).
12. **Negative Date**: Setting a date in the year 1900 (blocked).

## Implementation Strategy
- `Game` entity validation helper.
- Restricted updates: Parents can only update duty fields if they were empty.
- Global catch-all deny.
