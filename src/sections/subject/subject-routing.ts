/** Keep create/edit/return links in the workspace that opened the list. */
export function subjectRoutePaths(basePath: string) {
  const root = basePath.replace(/\/+$/, '');
  return { create: `${root}/new`, edit: (id: string) => `${root}/${encodeURIComponent(id)}/edit` };
}
