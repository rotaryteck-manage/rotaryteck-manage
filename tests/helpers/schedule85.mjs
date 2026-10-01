import * as schedule from '../../worker/schedule.mjs';
import {migrations85} from './migrations85.mjs';
const initialized=new WeakSet();
function ready(env){if(env.DB?.db85&&!initialized.has(env.DB)){migrations85(env.DB.db85);initialized.add(env.DB);}}
export function scheduleApi(request,env,employee){ready(env);return schedule.scheduleApi(request,env,employee);}
export function schedulePhotoUpload(request,env,employee){ready(env);return schedule.schedulePhotoUpload(request,env,employee);}
export function schedulePhotoApi(request,env,employee){ready(env);return schedule.schedulePhotoApi(request,env,employee);}
export function scheduleMaterialUpload(request,env,employee){ready(env);return schedule.scheduleMaterialUpload(request,env,employee);}
export function scheduleMaterialPhotoApi(request,env,employee){ready(env);return schedule.scheduleMaterialPhotoApi(request,env,employee);}

export {scheduleUnique73} from '../../worker/schedule.mjs';
