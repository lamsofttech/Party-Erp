const API = 'https://skizagroundsuite.com/API/v1/surveys';
export async function listSurveys(){ const r=await fetch(`${API}/surveys.php?action=list`); return r.json(); }
export async function getSurvey(id:number){ const r=await fetch(`${API}/surveys.php?action=get&id=${id}`); return r.json(); }
export async function createSurvey(payload:{title:string;description?:string}){
const r=await fetch(`${API}/surveys.php?action=create`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});return r.json();
}
export async function updateSurvey(id:number, payload:any){
const r=await fetch(`${API}/surveys.php?action=update&id=${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});return r.json();
}
export async function addQuestion(surveyId:number, payload:any){
const r=await fetch(`${API}/surveys.php?action=add_question&survey_id=${surveyId}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});return r.json();
}
export async function addOption(questionId:number, payload:any){
const r=await fetch(`${API}/surveys.php?action=add_option&question_id=${questionId}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});return r.json();
}
export async function publishSurvey(id:number){
const r=await fetch(`${API}/surveys.php?action=publish&id=${id}`,{method:'POST'}); return r.json();
}


// Public
const PUB = 'https://skizagroundsuite.com/API/v1/surveys/public.php';
export async function getPublicSurvey(slug:string){ const r=await fetch(`${PUB}?action=get&slug=${slug}`); return r.json(); }
export async function submitPublicSurvey(slug:string, payload:any){
const r=await fetch(`${PUB}?action=submit&slug=${slug}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
return r.json();
}