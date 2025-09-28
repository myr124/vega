# Lottie Avatars

Drop Lottie JSON files in this folder to be used as animated avatars on the Results page.

How it works:
- The app tries to automatically discover all .json files here via the API route: /api/avatars
- If that returns an empty list, it falls back to public/avatars/manifest.json (array of strings with file names or absolute URLs)
- Each persona card picks an avatar "randomly" but deterministically, using a per-user seed stored in localStorage, so a user will generally see the same avatars on refresh
- Animations do not autoplay. They play when you hover over a persona card

Quick start:
1) Add one or more Lottie JSON files into this folder, e.g.:
   - public/avatars/astronaut.json
   - public/avatars/robot.json
   - public/avatars/rocket.json

2) (Optional) If you prefer to curate the list manually, edit manifest.json:
   [
     "astronaut.json",
     "robot.json",
     "rocket.json"
   ]
   You can also include full URLs if hosting the JSON elsewhere:
   [
     "https://cdn.example.com/lotties/sparkles.json"
   ]

Notes:
- Files must be valid Lottie JSON
- The Results page will render them at 48x48px in a circular mask to match the previous avatar size
- On touch devices, there is no hover, so animations will remain paused by default
