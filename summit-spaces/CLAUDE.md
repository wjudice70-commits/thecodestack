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
- Plain HTML/CSS, no build step. Publish the `summit-spaces/` folder (netlify.toml included; CLAUDE.md is blocked from public access).
- Note: the Drive homepage kit is a Wix build guide for "Elevated Property 1". Only its overlay SVG/texture assets were used here (in `assets/`).
- Deploy: Netlify. Upload the folder that has `index.html` at its top level (or the build output folder: dist/build/out). Never the zip, never the notes.
- Starting material: `Summit_Spaces_to_EP1_Homepage_Kit.zip` in Drive (unverified contents).

## Lead path
- Phone/text: 832-832-1998. Email: wjudice70@gmail.com (temporary). Both are in the header, footer, quote page, CTA and a mobile call/text bar.
- TODO: service area (Nashville + surrounding?), license/insurance wording. Set Netlify form notifications (Site settings > Forms) to email leads.
- Plan: Netlify Forms (`data-netlify="true"`) on a quote form, plus a click-to-text/call button.

## Status
- Done: image prompts (v2), overlay assets, static site built (home, services, process, about, quote form with Netlify Forms, thanks, 404)
- Videos (from Drive 'Summit Spaces' folder, compressed in `assets/video/`): hero house-to-mountain line drawing, modular concrete construct (promise), materials (services), B&W workshop (CTA). Not used (off the matte-black standard): door, logo reveal, floating-house clips. Large stock clips in Drive 'Website Assets' not pulled.
- Placeholder: no photos yet (new business). Using CSS gradients, blueprint overlays and an SVG house-with-lit-window on the CTA; the 5 hero images from the kit live in Wix, not Drive
- To do: service area + license wording, real photos (v2 prompts or job photos), privacy policy, deploy to Netlify and confirm the form works, Google Business Profile, analytics, domain

## Working rules
- Keep this file short and current. Update the Status section at the end of each session.
- Prefer small targeted edits over regenerating whole pages.
- Ask before adding new dependencies or build tooling.
