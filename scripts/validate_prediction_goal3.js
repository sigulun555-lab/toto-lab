'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {resolveTeamName}=require('./validate_prediction.js');
const FIELDS=new Set(['predictionId','round','matchNumber','team','opponent','isHome','probabilities','predictionConfirmedAt','deadlineAt','modelName','modelVersion','revisionOf','dataSource','notes']);
const REQ=['predictionId','round','matchNumber','team','opponent','isHome','probabilities','predictionConfirmedAt','deadlineAt','modelName','modelVersion','revisionOf'];
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
class ValidationError extends Error {}
function readLines(file){if(!fs.existsSync(file))return [];return fs.readFileSync(file,'utf8').split(/\r?\n/).filter(x=>x.trim()).map((x,i)=>{try{return JSON.parse(x)}catch{throw new Error(`Invalid JSONL ${file} line ${i+1}`)}})}
function validate(record,existing=[]){
 const errors=[],warnings=[];
 if(!record||typeof record!=='object'||Array.isArray(record))return {ok:false,errors:['record must be an object'],warnings};
 for(const k of Object.keys(record))if(!FIELDS.has(k))errors.push(`Unknown field: ${k}`);
 for(const k of REQ)if(!(k in record))errors.push(`Missing required field: ${k}`);
 if(errors.length)return {ok:false,errors,warnings};
 if(typeof record.predictionId!=='string'||!record.predictionId)errors.push('predictionId must be non-empty string');
 if(!Number.isInteger(record.round)||record.round<1)errors.push('round must be positive integer');
 if(!Number.isInteger(record.matchNumber)||record.matchNumber<1||record.matchNumber>3)errors.push('matchNumber must be 1..3');
 if(typeof record.team!=='string'||!record.team)errors.push('team must be non-empty string');
 if(typeof record.opponent!=='string'||!record.opponent)errors.push('opponent must be non-empty string');
 if(typeof record.isHome!=='boolean')errors.push('isHome must be boolean');
 if(!['ChatGPT','Claude'].includes(record.modelName))errors.push('modelName must be ChatGPT or Claude');
 if(typeof record.modelVersion!=='string'||!record.modelVersion)errors.push('modelVersion must be non-empty string');
 if(record.revisionOf!==null&&typeof record.revisionOf!=='string')errors.push('revisionOf must be string or null');
 if(!UTC.test(record.predictionConfirmedAt)||!UTC.test(record.deadlineAt))errors.push('timestamps must be ISO UTC ending in Z');
 else if(Date.parse(record.predictionConfirmedAt)>=Date.parse(record.deadlineAt))errors.push('prediction must be confirmed before deadline');
 if(record.dataSource!==undefined&&typeof record.dataSource!=='string')errors.push('dataSource must be string');
 if(record.notes!==undefined&&typeof record.notes!=='string')errors.push('notes must be string');
 const p=record.probabilities;
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).sort().join(',')!=='0,1,2,3')errors.push('probabilities must have exactly keys "0","1","2","3"');
 else {for(const k of ['0','1','2','3'])if(typeof p[k]!=='number'||!Number.isFinite(p[k])||p[k]<0||p[k]>1)errors.push(`probabilities[${k}] must be number 0..1`);if(Object.values(p).every(v=>typeof v==='number'&&Number.isFinite(v))&&Math.abs(Object.values(p).reduce((a,b)=>a+b,0)-1)>0.002)errors.push('probabilities must sum to 1 within 0.002');}
 if(existing.some(x=>x.predictionId===record.predictionId))errors.push('duplicate predictionId');
 if(record.revisionOf!==null&&!existing.some(x=>x.predictionId===record.revisionOf))errors.push('revisionOf must refer to an existing predictionId');
 for(const f of ['team','opponent']){const r=resolveTeamName(record[f]);if(!r.resolved)warnings.push(`${f} unresolved: ${r.reason}`);}
 return {ok:errors.length===0,errors,warnings};
}
function appendPrediction(file,record){const existing=readLines(file);const r=validate(record,existing);if(!r.ok)throw new ValidationError(r.errors.join('; '));fs.mkdirSync(path.dirname(file),{recursive:true});fs.appendFileSync(file,JSON.stringify(record)+'\n','utf8');return r;}
module.exports={validate,appendPrediction,readLines,ValidationError};
if(require.main===module){const [file,jsonFile]=process.argv.slice(2);if(!file||!jsonFile){console.error('Usage: node scripts/validate_prediction_goal3.js <log.jsonl> <record.json>');process.exit(1);}try{const rec=JSON.parse(fs.readFileSync(jsonFile,'utf8'));const r=appendPrediction(file,rec);console.log('OK: appended '+rec.predictionId);if(r.warnings.length)console.warn(r.warnings.join('\n'));}catch(e){console.error(e.message);process.exit(1);}}
