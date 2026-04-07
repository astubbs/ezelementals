# Writing Profiles

Profiles define what the VLM is asked to extract from each frame. The base profile produces the monolithic timeline (description + elemental fields). Future profiles may add domain-specific fields or prompts.

## Current design

The monolithic VLM pass asks for everything in a single call:
- Natural language scene description
- Natural language audio description
- Structured elemental fields (wind, water, heat_ambient, heat_radiant, etc.)
- Confidence score

This is intentional — elemental fields add negligible cost, and every user who generates a timeline (even for AD purposes) automatically contributes elemental data to the community database.

## When to add a profile

Profiles are for fundamentally different VLM prompts that produce different kinds of output. For example:
- An AD profile might use a different prompt optimised for generating accessible descriptions
- A detailed event profile might ask the VLM to identify specific event types (explosions, crashes, etc.)

Profiles are **not** needed for different export formats — those are handled by [exporters](exporters.md).

## Adding a new profile

*Architecture is being established during the pivot refactor. This section will be updated with the concrete interface once `profiles/` is implemented.*

The general pattern:
1. Create `src/reeldesc/profiles/your_profile.py`
2. Define the VLM prompt
3. Define the response parser (JSON schema → dataclass)
4. Define which fields are added to the timeline
5. Add tests
