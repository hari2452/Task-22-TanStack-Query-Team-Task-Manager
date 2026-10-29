import {api} from './axios';import type {Task,TaskInput,TaskFilters,TaskPage,Stats,User} from '../types';
export const fetchTasks=(params:TaskFilters):Promise<TaskPage>=>api.get('/api/tasks',{params}).then(r=>r.data);
export const fetchTask=(id:number):Promise<Task>=>api.get(`/api/tasks/${id}`).then(r=>r.data);
export const fetchStats=():Promise<Stats>=>api.get('/api/stats').then(r=>r.data);
export const fetchUsers=():Promise<User[]>=>api.get('/api/users').then(r=>r.data);
export const createTask=(data:TaskInput):Promise<{id:number}>=>api.post('/api/tasks',data).then(r=>r.data);
export const updateTask=({id,data}:{id:number;data:Partial<TaskInput>}):Promise<void>=>api.put(`/api/tasks/${id}`,data).then(r=>r.data);
export const deleteTask=(id:number):Promise<void>=>api.delete(`/api/tasks/${id}`).then(r=>r.data);
