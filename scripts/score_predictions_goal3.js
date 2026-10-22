'use strict';
const fs=require('node:fs');const path=require('node:path');
const {resolveTeamName}=require('./validate_prediction.js');
const {readLines}=require('./validate_prediction_goal3.js');
function filesIn(target){if(!fs.existsSync(target))return [];const s=fs.statSync(target);return s.isFile()?[target]:fs.readdirSync(target).filter(x=>x.endsWith('.jsonl')).map(x=>path.join(target,x));}
function load(target){return filesIn(target).flatMap(readLines);}
function canonical(name){const r=resolveTeamName(name);return r.resolved?r.canonicalName:null;}
function score(predictions,results){
 const resultMap=new Map(),unresolvedResults=[],unresolved=[],postDeadline=[],superseded=[];
 for(const r of results){const h=canonical(r.homeTeam),a=canonical(r.awayTeam);if(!h||!a){unresolvedResults.push({round:r.round,matchNumber:r.matchNumber,reason:'unresolved result team name',homeTeam:r.homeTeam,awayTeam:r.awayTeam});continue;}resultMap.set(`${r.round}|${r.matchNumber}|${h}|${a}`,r);}
 const candidates=[];
 for(const p of predictions){
  const c=Date.parse(p.predictionConfirmedAt),d=Date.parse(p.deadlineAt);
  if(!Number.isFinite(c)||!Number.isFinite(d)||c>=d){postDeadline.push({predictionId:p.predictionId,reason:'post-deadline or invalid timestamp'});continue;}
  const t=canonical(p.team),o=canonical(p.opponent);
  if(!t||!o){unresolved.push({predictionId:p.predictionId,reason:'unresolved team/opponent name'});continue;}
  const home=p.isHome?t:o,away=p.isHome?o:t;
  const result=resultMap.get(`${p.round}|${p.matchNumber}|${home}|${away}`);
  if(!result){unresolved.push({predictionId:p.predictionId,reason:'no exact matching result (round/matchNumber/home/away)',homeTeam:home,awayTeam:away});continue;}
  const goals=p.isHome?result.homeGoals:result.awayGoals;
  if(!Number.isInteger(goals)||goals<0||!Number.isInteger(p.isHome?result.awayGoals:result.homeGoals)){unresolved.push({predictionId:p.predictionId,reason:'result goals missing/invalid'});continue;}
  candidates.push({prediction:p,result,actual:String(Math.min(3,goals))});
 }
 const groups=new Map();
 for(const x of candidates){const p=x.prediction,k=[p.round,p.matchNumber,p.modelName,p.modelVersion,p.team,p.isHome].join('|');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x);}
 const final=[];
 for(const arr of groups.values()){arr.sort((a,b)=>Date.parse(a.prediction.predictionConfirmedAt)-Date.parse(b.prediction.predictionConfirmedAt));final.push(arr[arr.length-1]);for(const old of arr.slice(0,-1))superseded.push({predictionId:old.prediction.predictionId,supersededBy:arr[arr.length-1].prediction.predictionId});}
 const byModel={};
 for(const x of final){const m=x.prediction.modelName;(byModel[m]??=[]).push(x);}
 const metrics=arr=>{let correct=0,brier=0,logloss=0;const n=arr.length;for(const x of arr){const p=x.prediction.probabilities,y=x.actual;const pick=['0','1','2','3'].sort((a,b)=>p[b]-p[a])[0];if(pick===y)correct++;for(const k of ['0','1','2','3'])brier+=(p[k]-(k===y?1:0))**2;logloss-=Math.log(Math.max(1e-12,p[y]));}return {n,accuracy:n?correct/n:null,brier:n?brier/n:null,brierConvention:'sum-of-4-squares (no division)',logloss:n?logloss/n:null};};
 return {generatedAt:new Date().toISOString(),inputCounts:{predictions:predictions.length,results:results.length},usedRecordCount:final.length,excludedPostDeadline:postDeadline,unresolved,unresolvedResults,superseded,byModel:Object.fromEntries(Object.entries(byModel).map(([k,v])=>[k,metrics(v)]))};
}
function buildReport(predDir,resDir){return score(load(predDir),load(resDir));}
module.exports={score,buildReport,load};
if(require.main===module){const [predDir,resDir,out]=process.argv.slice(2);const report=buildReport(predDir||path.join(__dirname,'..','predictions'),resDir||path.join(__dirname,'..','results'));console.log(JSON.stringify(report,null,2));if(out)fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
