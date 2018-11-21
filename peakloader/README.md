# Youtube Data API

## Quota [[link](https://developers.google.com/youtube/v3/getting-started#quota)]
|   Operations  |   Units   |
|   ----------  |   -----:  |
|   Simple Read | 1 |
|   Write | 50 |
|   Caption Insert | 400 |
|   Upload | 1600 |

Some operations may perform multiple actions on multiple resources. An insert (write) may return a list of resources (read) where you pay for *part*. For instance here are parts of a video resource and their associated costs:
- id: 0
- player: 0
- fileDetails: 1
- contentDetails: 2
- statistics: 2
- status: 2

## Scopes [[link](https://developers.google.com/youtube/v3/guides/auth/installed-apps)]
Google permission system relies on users granting applications access to certain scopes of features and functionality.
Scopes under `https://www.googleapis.com/auth/`:
|Scope|Purpose|
|-----|-----|
|youtube	|Manage account|
|youtube.force-ssl	|Create/update videos, ratings, comments and captions|
|youtube.readonly	|View|
|youtube.upload	|Manage videos|


#### Notepad
[Closed Caption File Types](https://support.google.com/youtube/answer/2734698)
