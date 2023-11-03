(function(){"use strict";const y="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";function b(t){t=t.replace(/^@/,"");const[r,e]=t.split("/");return`owner: "${r}", name: "${e}"`}const w=new Date(Date.now()-2*365*864e5).toISOString(),_=()=>Math.abs(Math.random()*1e3|0),$=(t,r=w)=>`
r${_()}: repository(${b(t)}) {
  defaultBranchRef {
    target {
      ... on Commit {
        history(since: "${r}") {
          edges{
            node {
                author { user { name, login } }
                additions
                deletions
              }
            }
          }
        }
      }
    }
  }`;function S(t){const e=t.defaultBranchRef.target.history.edges;let o=0,s=[];const i=e.length;for(let n=0;n<i;n++){const a=e[n].node,{author:u,additions:g,deletions:A}=a;if(!u)continue;const{login:h,name:O}=u.user,m=s.findIndex(R=>R.login===h),p=g+A;o+=p,m===-1?s.push({name:O||h,login:h,diff:p}):s[m].diff+=p}s.sort((n,a)=>a.diff-n.diff);const c=[],d=[],f=[];let l=0;for(let n=0;n<s.length;n++){const{name:a,login:u,diff:g}=s[n];if(c.push(a),d.push(u),f.push(g),l+=g,l>o*.68)break}return{contributors:new Array(c.length).fill(0).map((n,a)=>({name:c[a],login:d[a],diff:Math.round(f[a]*100/o)+"%"})),total_diffs:o,total_devs:s.length}}async function k(t,r){const e=await fetch("https://api.github.com/graphql",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`bearer ${r||y}`},body:JSON.stringify({query:`{
      ${t.map(i=>$(i)).join(`,
`)}
    }`})}).then(i=>i.json()),o=Object.keys(e.data),s=o.map(i=>S(e.data[i]));return JSON.stringify({repos:o.map((i,c)=>{const{contributors:d,total_diffs:f,total_devs:l}=s[c];return{repo:t[c],contributors:d,total_diffs:f,total_devs:l}})})}self.onmessage=async t=>{const{repos:r,APIkey:e}=t.data,o=await k(r,e);self.postMessage(o)}})();
