'use strict';
const fs=require('node:fs');const path=require('node:path');
const {appendPrediction}=require('./validate_prediction_goal3.js');
const [inputPath]=process.argv.slice(2);
if(!inputPath){console.error('Usage: node scripts/save_prediction_goal3.js <records.json|records.jsonl>');process.exit(1);}
const input=path.resolve(inputPath);
const records=fs.readFileSync(input,'utf8').trim().split(/\r?\n/).filter(Boolean).flatMap(line=>{const x=JSON.parse(line);return Array.isArray(x)?x:[x]});
let saved=0;
for(const r of records){const file=path.join(__dirname,'..','predictions',`round_${r.round}_${r.modelName}_goal3.jsonl`);appendPrediction(file,r);saved++;}
console.log(`Saved ${saved} GOAL3 records (append-only).`);
