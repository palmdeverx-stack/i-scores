-- admin.announcements closes a gap: every other core /admin/* page already
-- has a package-level feature key (admin.school_profile, admin.classrooms,
-- admin.staff, etc.) except the announcements page, which was reachable
-- regardless of subscription. Backfill existing rows so no school silently
-- loses access to a page they already had.

update public.school_subscriptions
set enabled_features = array_append(enabled_features, 'admin.announcements')
where not ('admin.announcements' = any(enabled_features));

update public.subscription_plans
set enabled_features = array_append(enabled_features, 'admin.announcements')
where not ('admin.announcements' = any(enabled_features));
