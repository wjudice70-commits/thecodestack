# Summit Spaces

Nashville home repair / improvement / renovation business. This is the marketing + lead-gen website.
Tagline in use: "Room to Breathe, and the Space to Live".
Positioning: one-stop shop (decks, roofs, tile, cabinets, lighting, shelves, hardscapes). New company ("We're new. That's the point.").

## Goal
Get the site live on Netlify and turn visitors into quote requests. Revenue comes from booked jobs, so the lead path matters more than polish.

## Pages
- Home: hero, "The Promise", pain -> flip section, services teaser (Repair / Improve / Renovate), closing CTA
- Services: Repair, Improve, Renovate
- Process: six steps (Call, Vision, Estimate, Work, Updates, Reveal)
- About

## Visual standard (locked)
- Matte black only. No glossy, wet or reflective finishes.
- One soft diffused gradient light falling from above, dissolving into pure black.
- No warm naturalistic sunset gradients. The single lit window on the closing CTA is the only departure from black.
- Image prompts live in Drive: `summit-spaces-image-prompts-by-section-v2.md` (v2 supersedes v1).

## Stack and deploy
- TODO: confirm stack (plain HTML/CSS vs framework).
- Deploy: Netlify. Upload the folder that has `index.html` at its top level (or the build output folder: dist/build/out). Never the zip, never the notes.
- Starting material: `Summit_Spaces_to_EP1_Homepage_Kit.zip` in Drive (unverified contents).

## Lead path
- TODO: phone number, email for leads, service area (Nashville + surrounding?), license/insurance wording.
- Plan: Netlify Forms (`data-netlify="true"`) on a quote form, plus a click-to-text/call button.

## Status
- Done: image prompts (v2), blueprint overlay SVG, homepage kit (unverified)
- To do: confirm site code is in this repo, build remaining pages, add quote form, real photos, privacy policy, Google Business Profile, analytics, connect domain

## Working rules
- Keep this file short and current. Update the Status section at the end of each session.
- Prefer small targeted edits over regenerating whole pages.
- Ask before adding new dependencies or build tooling.
