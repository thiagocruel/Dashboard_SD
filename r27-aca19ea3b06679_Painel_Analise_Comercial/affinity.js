"use strict";

const basketCache = new Map();
let affinityRenderId = 0;

function fetchBasketGroups(unit,year) {
  const key=`${unit}-${year}`;
  if (!basketCache.has(key)) {
    const promise=fetch(`afinidade-${key}.json`).then(response=>{
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }).catch(error=>{
      basketCache.delete(key);
      throw error;
    });
    basketCache.set(key,promise);
  }
  return basketCache.get(key);
}

function summarizeBaskets(files,dataset,scope,matchingProducts=null) {
  const categories=files[0].categories;
  const categoryBits=new Map(categories.map((category,index)=>[category,1<<index]));
  const isGeneral=scope.categories.size===dataset.categories.length && matchingProducts===null;
  const baseNames=matchingProducts!==null
    ? [...new Set(matchingProducts.map(row=>dataset.categories[dataset.products[row.id][0]]))]
    : [...scope.categories].map(id=>dataset.categories[id]);
  const allowedProducts=matchingProducts!==null?new Set(matchingProducts.map(row=>row.id)):null;
  const baseMask=baseNames.reduce((sum,category)=>sum|(categoryBits.get(category)??0),0);
  const slots=[...scope.months].flatMap(month=>[...scope.days].map(day=>month*7+day));
  const mixedByCategory=categories.map(()=>0);
  let total=0, mixed=0;
  files.forEach((file,unit)=>{
    const localProducts=dataset.productMaps[unit];
    for(const slot of slots) {
      for(const row of file.slots[slot]) {
        const mask=row[0], count=row[1];
        if (!isGeneral && (mask & baseMask)===0) continue;
        if (allowedProducts) {
          let match=false;
          for(let i=2;i<row.length && !match;i++) match=allowedProducts.has(localProducts[row[i]]);
          if (!match) continue;
        }
        total+=count;
        const associated=isGeneral?(mask & (mask-1) ? mask : 0):(mask & ~baseMask);
        if (!associated) continue;
        mixed+=count;
        for(let i=0;i<categories.length;i++) {
          if (associated & (1<<i)) mixedByCategory[i]+=count;
        }
      }
    }
  });
  const detail=categories.map((category,index)=>({category,count:mixedByCategory[index]}))
    .filter(row=>row.count>0)
    .sort((a,b)=>b.count-a.count || a.category.localeCompare(b.category,"pt-BR"));
  return {total,mixed,detail,baseNames,isGeneral};
}

function updateAffinity({total,mixed,detail,baseNames,isGeneral},productFilter) {
  const count=$("affinity-count");
  const context=$("affinity-context");
  $("affinity-result").hidden=total===0;
  $("affinity-overlap").hidden=total===0;
  count.hidden=total===0;
  if (!total) {
    context.textContent="Nenhum cupom corresponde aos filtros selecionados.";
    return;
  }
  count.textContent=`${formatNum.format(total)} cupons na base`;
  const single=baseNames.length===1;
  const baseName=single?categoryLabel(baseNames[0]):"as categorias selecionadas";
  context.textContent=isGeneral?"Base: todos os cupons do recorte.":productFilter
    ? "Base: cupons com ao menos um dos produtos do filtro."
    : single?`Base: cupons que contêm ${baseName}.`
    : "Base: cupons com pelo menos uma das categorias selecionadas.";
  const onlyLabel=isGeneral?"Cupons com uma categoria":single?`Só ${baseName}`:
    productFilter?"Só categorias dos produtos filtrados":"Só categorias selecionadas";
  const mixedLabel=isGeneral?"Cupons com duas ou mais categorias":
    productFilter?"Com categorias fora da seleção de produtos":"Com pelo menos uma outra categoria";
  const roundedMixed=Math.round(1000*mixed/total)/10;
  const percent=value=>formatPct.format(value)+"%";
  $("affinity-summary").innerHTML=[
    [onlyLabel,total-mixed,100-roundedMixed,"only"],
    [mixedLabel,mixed,roundedMixed,"mixed"]
  ].map(([label,n,pct,kind])=>`<tr class="affinity-${kind}"><th scope="row">${html(label)}</th><td>${formatNum.format(n)}</td><td>${percent(pct)}</td></tr>`).join("");
  const heading=isGeneral?"Categorias presentes nos cupons com duas ou mais categorias":"Outras categorias no mesmo cupom";
  $("affinity-detail").innerHTML=`<tr class="affinity-divider"><th colspan="3" scope="rowgroup">${heading}</th></tr>`+
    (detail.length?detail.map(({category,count})=>{
      const share=100*count/total;
      return `<tr><th scope="row">${html(categoryLabel(category))}</th><td>${formatNum.format(count)}</td>
        <td class="affinity-share"><div class="affinity-track" aria-hidden="true"><span style="width:${share}%"></span></div><strong>${percent(share)}</strong></td></tr>`;
    }).join(""):'<tr><td colspan="3">Nenhuma outra categoria registrada nesses cupons.</td></tr>');
  $("affinity-overlap").textContent="As duas primeiras linhas somam 100%. A tabela usa a mesma base de cupons, e um cupom pode aparecer em várias categorias.";
}

function renderAffinity(dataset,scope,matchingProducts) {
  const renderId=++affinityRenderId;
  const isCurrent=()=>renderId===affinityRenderId && dataset===source && !$("dashboard").hidden;
  $("affinity-count").hidden=true;
  $("affinity-result").hidden=true;
  $("affinity-overlap").hidden=true;
  $("affinity-context").textContent="Carregando cupons…";
  Promise.all(dataset.units.map(unit=>fetchBasketGroups(unit,dataset.year))).then(files=>{
    if(isCurrent()) updateAffinity(summarizeBaskets(files,dataset,scope,matchingProducts),matchingProducts!==null);
  }).catch(error=>{
    if (!isCurrent()) return;
    console.error(error);
    $("affinity-context").textContent="Não foi possível carregar os cupons deste recorte. Altere um filtro para tentar novamente.";
  });
}
