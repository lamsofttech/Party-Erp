export type Survey = { id:number; title:string; description?:string; status:'draft'|'published'|'archived'; slug?:string };
export type SurveyQuestion = {
id:number; survey_id:number; q_type:string; question_text:string; is_required:boolean; q_order:number; settings?:any; options?:SurveyOption[]
};
export type SurveyOption = { id:number; question_id:number; label:string; value?:string; o_order:number };