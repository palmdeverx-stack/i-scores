import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const compile=(path)=>ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const root='/teacher/department-work/subject';
function loadPage(path){
 const exports={};vm.runInNewContext(compile(path),{exports,
 require(name){
  if(name==='react/jsx-runtime')return {jsx:(type,props)=>({type,props})};
  if(name==='src/routes/paths')return {paths:{teacher:{departmentSubject:root}}};
  if(name.includes('subject-list-view'))return {SubjectListView:'list'};
  if(name.includes('subject-form-view'))return {SubjectFormView:'form'};
  if(name==='src/auth/guard')return {DepartmentPermissionGuard:'guard'};
  throw new Error(`Unexpected dependency: ${name}`);
 }});return exports.default;
}
test('delegated subject pages render directly and preserve their workspace on create and edit',async()=>{
 for(const [path,access] of [['page.tsx',undefined],['new/page.tsx','manage'],['[id]/edit/page.tsx','manage']]){
  const page=loadPage(`src/app/teacher/department-work/subject/${path}`);
  const tree=await page({params:Promise.resolve({id:'subject-id'})});
  assert.equal(tree.type,'guard');assert.equal(tree.props.permission,'subjects.manage');assert.equal(tree.props.access,access);
  assert.equal(tree.props.children.props.basePath,root);
  if(path.includes('[id]'))assert.equal(tree.props.children.props.subjectId,'subject-id');
 }
});
test('all subject workspaces generate create and edit links without switching areas',()=>{
 const exported={};vm.runInNewContext(compile('src/sections/subject/subject-routing.ts'),{exports:exported,encodeURIComponent});
 for(const base of ['/admin/subject','/teacher/subject',root]){
  const links=exported.subjectRoutePaths(`${base}/`);
  assert.equal(links.create,`${base}/new`);assert.equal(links.edit('subject-id'),`${base}/subject-id/edit`);
 }
});
