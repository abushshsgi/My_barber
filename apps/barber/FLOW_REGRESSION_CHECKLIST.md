# Barber Panel 4-Flow Regression Checklist

Use this checklist after changing onboarding, navigation, role permissions, or workspace switching.

## 1) Owner flow

- Sign up with `owner` from `/auth`.
- Verify redirect to `/salon/create`.
- Complete setup and confirm successful entry to `/barber`.
- Confirm `onboarding/status` returns complete and no `required_next_path`.
- In salon mode, verify owner menu includes `Salon`, `Galereya`, `Sharhlar`, `Jamoa`.
- Verify owner can access `/barber/salon-view/team` and is not redirected.

## 2) Employee (join salon) flow

- Sign up with `employee` from `/auth`.
- Verify redirect to `/salon/join`.
- Select salon + location and complete join.
- Verify redirect to `/salon/join/setup` when profile/schedule is incomplete.
- Finish setup and confirm `/barber` opens.
- Verify workspace labels use salon/personal workspace wording.
- In salon workspace, verify worker menu includes `members` (not `team` owner page).

## 3) MyBarber flow

- Sign up with `mybarber` from `/auth`.
- Verify redirect to `/mybarber/setup`.
- Complete setup and confirm `/barber` opens.
- Verify onboarding card text references MyBarber-specific completion language.
- Confirm no forced redirect to unrelated setup paths.

## 4) Independent flow

- Sign up with `independent` from `/auth`.
- Verify redirect to `/independent/setup`.
- Complete location, services, and working hours.
- Confirm onboarding becomes complete and dashboard opens.
- Verify independent menu is visible and salon workspace menu is hidden by default.

## 5) Cross-flow gating and navigation

- For each flow, manually open unrelated setup URLs and verify onboarding/status-driven behavior is consistent.
- Verify command palette quick actions match current workspace capability.
- Verify `required_next_path` CTA card on dashboard shows flow-appropriate message.
- Verify notifications/profile pages remain accessible across workspaces.

## 6) UI identity checks (20% distinction)

- Owner: header badge/tone and hero copy show management-oriented identity.
- Employee: join/setup pages and workspace labels clearly indicate team context.
- MyBarber: branding language and accent differ from owner generic wording.
- Independent: solo workspace tone and copy differ from salon-based flows.
- Shared design system remains unchanged (buttons/inputs/cards/spacing structure consistent).

