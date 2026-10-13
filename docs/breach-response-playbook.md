# Personal Data Breach Response Playbook

**Owner:** Grievance Officer — Sidharth Yadav (striderunclubbengaluru@gmail.com, +91 8368877289)
**Backs:** Privacy Policy §13. Legal basis: DPDP Act 2023 s.8(6) + DPDP Rules 2025 Rule 7; CERT-In Directions of 28 Apr 2022 (IT Act s.70B).

A *breach* is any unauthorised access to, or loss, disclosure, alteration or destruction of, personal data we hold. Examples: a leaked service-role key, an RLS policy that exposes rows, a stolen admin account, a misdirected bulk email, a public storage path that shouldn't be public. **No size threshold.** One affected member still counts.

## Clock starts when anyone on the team first notices

| Deadline | Action | Who |
|---|---|---|
| **Immediately** | Contain (see below). Start a written timeline: what, when noticed, by whom. | Whoever noticed + Owner |
| **≤ 6 hours** | If it is a reportable cyber incident (unauthorised access, compromised account/system, data leak, defacement), report to CERT-In: incident@cert-in.org.in, using the form at cert-in.org.in. | Owner |
| **Without delay** | Notify the Data Protection Board (intimation) and email every affected person (template below). | Owner |
| **≤ 72 hours** | Send the Board the full report: facts, cause, extent, likely impact, mitigation, and the user notice that was sent. | Owner |
| **Within 2 weeks** | Post-incident review: root cause, fix shipped, this playbook updated. | Owner + developer |

## Contain

1. **Leaked key or secret.** Rotate it right away in Supabase or Vercel (service role, Razorpay, Brevo, Strava, `CRON_SECRET`, `STRIDE_UNSUBSCRIBE_SECRET`), then redeploy.
2. **Compromised account.** Demote the role to `GUEST` in `users.role`, sign the account out in Supabase Auth, and revoke the Google session.
3. **Exposed data.** Fix the RLS policy or storage path, or pull the route behind `guardPreviewFeature()`. Confirm the exposure is closed from a signed-out browser.
4. **Preserve evidence.** Before anything changes, export the Supabase auth, API and storage logs and the Vercel logs for the incident window.

## Facts to collect (the Board report needs them)

- Categories of data involved: profile, contact/DOB, emergency contacts, photos, payment IDs, Strava.
- Number of people affected, including any minors.
- Start and end of exposure, and how the breach was discovered.
- Likely consequences for the people affected.
- Steps taken, and steps the affected people should take.

## User notice template (email, plain language)

> **Subject:** Important: a security incident affecting your Stride account
>
> On [date] we discovered that [plain description of what happened] between [start] and [end]. The information involved was [categories]. Your [card/payment details / password] were **not** involved — we never hold them.
>
> What this could mean for you: [likely consequences].
> What we have done: [containment + fix].
> What you can do: [e.g. be alert to calls or messages claiming to be from Stride; change your Google password if …].
>
> We have reported this to the Data Protection Board of India [and CERT-In]. For questions, contact our Grievance Officer, Sidharth Yadav, at striderunclubbengaluru@gmail.com or +91 8368877289.

Send it through Brevo as a **transactional** email (it goes to every affected person, whatever their marketing preference). Never include another member's data in a notice.
