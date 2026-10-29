export type Status='todo'|'in_progress'|'done';export type Priority='low'|'medium'|'high';
export interface User{id:number;name:string;email:string;role:'admin'|'member'}
export interface Task{id:number;title:string;description:string;status:Status;priority:Priority;assigned_to:number|null;created_by:number;assignee_name:string|null;due_date:string|null;created_at:string;updated_at:string}
export interface TaskInput{title:string;description:string;status:Status;priority:Priority;assigned_to:number|null;due_date:string|null}
export interface TaskFilters{status?:string;priority?:string;assigned_to?:string;search?:string;page:number;limit:number}
export interface TaskPage{items:Task[];total:number;page:number;limit:number}
export interface Stats{total:number;todo:number;in_progress:number;done:number;overdue:number;completed_this_week:number;low:number;medium:number;high:number}
