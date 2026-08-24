import{_ as e,i as t,n,p as r,x as i}from"./firebase-DYKGnidX.js";i((()=>{t();async function i(){let t=document.getElementById(`ranking-body`);try{let i=await r(e(n,`usuarios`)),a=[];i.forEach(e=>{let t=e.data();a.push({nome:t.nome||`Usuário sem nome`,xp:t.xp||0,denuncias:t.denuncias||0})}),a.sort((e,t)=>t.xp-e.xp),t.innerHTML=``,a.slice(0,100).forEach((e,n)=>{let r=n+1,i=r;r===1&&(i=`🥇`),r===2&&(i=`🥈`),r===3&&(i=`🥉`);let a=document.createElement(`tr`);a.innerHTML=`
                <td>${i}</td>
                <td>${e.nome}</td>
                <td>${e.xp} XP</td>
                <td>${e.denuncias}</td>
            `,t.appendChild(a)}),a.length===0&&(t.innerHTML=`
                <tr>
                    <td colspan="4">
                        Nenhum usuário encontrado.
                    </td>
                </tr>
            `)}catch(e){console.error(`Erro ao carregar ranking:`,e)}}document.getElementById(`btn-sair`).addEventListener(`click`,()=>{window.location.href=`index.html`}),i()}))();