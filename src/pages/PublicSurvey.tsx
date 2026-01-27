import { useEffect, useState } from 'react';
import { Box, Button, TextField, Typography, Checkbox, FormControlLabel, RadioGroup, Radio } from '@mui/material';
import { getPublicSurvey, submitPublicSurvey } from '../API/surveys';


export default function PublicSurvey(){
const slug = window.location.pathname.split('/').pop() as string; // assuming /public/s/:slug
const [survey,setSurvey]=useState<any>(null);
const [answers,setAnswers]=useState<Record<number, any>>({});
const [submitted,setSubmitted]=useState<any>(null);


useEffect(()=>{ (async()=>{ const s=await getPublicSurvey(slug); setSurvey(s.survey); })(); },[slug]);


function renderQuestion(q:any){
const val = answers[q.id];
if(q.q_type==='short_text' || q.q_type==='email' || q.q_type==='phone'){
return <TextField fullWidth value={val||''} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})}/>;
}
if(q.q_type==='long_text'){
return <TextField fullWidth multiline minRows={3} value={val||''} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})}/>;
}
if(q.q_type==='single_choice'){
return <RadioGroup value={val||''} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})}>
{q.options?.map((o:any)=> <FormControlLabel key={o.id} value={o.label} control={<Radio/>} label={o.label}/>) }
</RadioGroup>;
}
if(q.q_type==='multiple_choice'){
return <Box>{q.options?.map((o:any)=>{
const arr = Array.isArray(val)?val:[];
const checked = arr.includes(o.label);
return <FormControlLabel key={o.id} control={<Checkbox checked={checked} onChange={(e)=>{
const next = new Set(arr); e.target.checked? next.add(o.label): next.delete(o.label);
setAnswers({...answers,[q.id]: Array.from(next)});
}}/>} label={o.label}/>;
})}</Box>;
}
if(q.q_type==='rating' || q.q_type==='linear_scale'){
return <TextField type="number" value={val||''} onChange={e=>setAnswers({...answers,[q.id]:Number(e.target.value)})} />; // keep simple; can swap to slider
}
return <div/>;
}


async function submit(){
const payload = { answers: Object.entries(answers).map(([qid,v])=>({question_id:Number(qid), value:v})) };
const r = await submitPublicSurvey(slug, payload); setSubmitted(r);
}


if(!survey) return <Box p={3}><Typography>Loading survey…</Typography></Box>;
if(submitted) return <Box p={3}><Typography variant="h5">Thank you!</Typography></Box>;


return (
<Box p={3} maxWidth={800} mx="auto">
<Typography variant="h4">{survey.title}</Typography>
<Typography color="text.secondary" sx={{mb:2}}>{survey.description}</Typography>
{survey.questions.map((q:any)=> (
<Box key={q.id} sx={{mb:3}}>
<Typography variant="subtitle1">{q.question_text} {q.is_required?'*':''}</Typography>
{renderQuestion(q)}
</Box>
))}
<Button variant="contained" onClick={submit}>Submit</Button>
</Box>
);
}