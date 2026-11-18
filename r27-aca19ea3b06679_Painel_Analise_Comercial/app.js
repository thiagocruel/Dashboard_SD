"use strict";

const $ = id => document.getElementById(id);
const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out"];
const dayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const dayShort = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const storeNames = {arco:"Arco",coracao:"Coração",flash:"Flash",glorimar:"Glorimar",jaburuna:"Jaburuna",sinha:"Sinhá Sabóia",teresina:"Teresina"};
const categoryNames = {
  "FOOD": "Food", "PIT STOP": "Pit Stop", "ZÉ DELIVERY": "Zé Delivery",
  "BEBIDAS NAO ALCOOLICAS": "Bebidas sem álcool",
  "BEBIDAS ALCOOLICAS GELADAS": "Bebidas alcoólicas geladas",
  "PICOLES E SORVETES": "Picolés e sorvetes",
  "PROMOÇÃO BALCÃO": "Promoção Balcão"
};
const storeLocations={
  arco:"Centro de Sobral.",
  coracao:"Área urbana próxima ao centro e a uma academia.",
  flash:"Próxima ao shopping, à universidade e a um mercantil.",
  glorimar:"Área central de Sobral. As vendas incluem balcão e Zé Delivery.",
  jaburuna:"Loja de posto de rodovia.",
  sinha:"Loja de bairro. As vendas incluem balcão e Zé Delivery.",
  teresina:"Posto de rodovia com comércio nas proximidades."
};
const cache = new Map();
let source = null;
let selection = {};
let focus = null;
let page = 0;
let request = 0;
let rankedExport = [];
const pageSize = 20;
const formatMoney = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const formatNum = new Intl.NumberFormat("pt-BR",{maximumFractionDigits:2});
const formatPct = new Intl.NumberFormat("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1});
const range = n => Array.from({length:n},(_,i)=>i);
const html = value => String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const keyText = text => text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const categoryLabel = category => categoryNames[category] || category.toLocaleLowerCase("pt-BR").replace(/^./,c=>c.toUpperCase());
const metricLabel = metric => ({qty:"Quantidade",sales:"Faturamento",profit:"Lucro bruto"}[metric]);
const formatMetric = (number,metric) => metric === "qty" ? formatNum.format(number) : formatMoney.format(number);
const accumulator = () => ({qty:0,sales:0,profit:0});

function switchModule(pista) {
  $("pista-view").hidden = !pista;
  $("loja-view").hidden = pista;
  $("breadcrumb").textContent = pista ? "Pista" : "Lojas";
  if (pista) window.pista.activate();
  for (const [id,active] of [["pista-tab",pista],["loja-tab",!pista]]) {
    $(id).classList.toggle("active",active);
    $(id).setAttribute("aria-pressed",String(active));
  }
}

function makeFilter(id, labels, allLabel) {
  const details = $(id);
  details.innerHTML = `<summary></summary><div class="drop-content">
    <div class="drop-actions"><button type="button" class="link-button" data-select="all">Todos</button>
    <button type="button" class="link-button" data-select="none">Nenhum</button></div>
    <div class="drop-list">${labels.map((label,i)=>`<label><input type="checkbox" value="${i}">${html(label)}</label>`).join("")}</div></div>`;
  const boxes = [...details.querySelectorAll("input")];
  boxes.forEach((box,i)=>box.checked = selection[id].has(i));
  const summarize = () => {
    const selected = [...selection[id]];
    details.querySelector("summary").textContent = selected.length === labels.length ? allLabel :
      selected.length === 1 ? labels[selected[0]] : selected.length ? `${selected.length} selecionados` : "Nenhum";
  };
  const onChanged = () => {
    selection[id] = new Set(boxes.filter(b=>b.checked).map(b=>Number(b.value)));
    summarize();
    if (id === "categories" && focus !== null && !selection.categories.has(source.products[focus][0])) focus=null;
    page=0;
    render();
  };
  details.onchange = onChanged;
  details.onclick = event => {
    const mode=event.target.dataset.select;
    if (!mode) return;
    for (const box of boxes) box.checked = mode === "all";
    onChanged();
  };
  summarize();
}
function setupFilters() {
  makeFilter("months",months,"Jan a out");
  makeFilter("days",dayNames,"Todos os dias");
  makeFilter("categories",source.categories.map(categoryLabel),"Todas as categorias");
}
let profileRequest=0;
function purchasePortraits(sales,basket,scope,allowedProducts,prior=null) {
  const pct=(n,d)=>formatPct.format(100*n/d)+"%";
  const money=cents=>formatMoney.format(cents/100);
  const productName=id=>sales.products[id][1].toLowerCase().replace(/^am (?=natur)/,"água mineral ");
  const productCats=sales.products.map(([c])=>basket.categories.indexOf(sales.categories[c]));
  const eligible=sales.products.map(([c],id)=>scope.categories.has(sales.categories[c])&&(!allowedProducts||allowedProducts.has(id)));
  const selectedKeys=allowedProducts&&new Set([...allowedProducts].map(id=>JSON.stringify([sales.categories[sales.products[id][0]],sales.products[id][1]])));
  const previousCats=prior?.products.map(([i,name])=>{
    const cat=prior.categories[i];
    return scope.categories.has(cat)&&(!selectedKeys||selectedKeys.has(JSON.stringify([cat,name])))?basket.categories.indexOf(cat):-1;
  });
  const periods=["Cliente de meio de semana","Cliente de final de semana"].map(title=>({title,dates:0,coupons:0,baskets:[],rows:[],products:sales.products.map(()=>accumulator()),
    cats:basket.categories.map((name,i)=>({name,i,count:0,solo:0,sales:0,profit:0,baseline:0,comparable:0,hours:Array(24).fill(0)}))}));
  for(const m of scope.months){
    const block=sales.months[m],previous=prior?.months[m];
    for(const d of scope.days){
      const p=periods[Number(d>=5)];p.dates+=block.days[d];
      for(const row of basket.slots[m*7+d]){
        p.coupons+=row[1];
        let mask=row[0];
        if(allowedProducts){
          mask=0;
          for(let i=2;i<row.length;i++)if(eligible[row[i]])mask|=1<<productCats[row[i]];
        }
        p.baskets.push([mask,row]);
        for(const c of p.cats)if(mask&(1<<c.i)){
          c.count+=row[1];
          if(row[0]===(1<<c.i))c.solo+=row[1];
        }
      }
    }
    for(const row of block.rows){
      const [slot,id,qty,v,g]=row,d=Math.floor(slot/24);
      if(!scope.days.has(d))continue;
      const p=periods[Number(d>=5)];
      add(p.products[id],qty,v,g);
      if(!eligible[id])continue;
      const c=p.cats[productCats[id]];
      if(!c)continue;
      c.sales+=v;c.profit+=g;c.hours[slot%24]+=v;p.rows.push(row);
      if(previous?.days[d]>0&&block.days[d]>0)c.comparable+=v;
    }
    if(previous)for(const [slot,id,,value] of previous.rows){
      const d=Math.floor(slot/24),idx=previousCats[id];
      if(idx>=0&&scope.days.has(d)&&previous.days[d]>0&&block.days[d]>0)
        periods[Number(d>=5)].cats[idx].baseline+=value*block.days[d]/previous.days[d];
    }
  }
  const best=(values,score)=>values.reduce((a,b)=>score(b)>score(a)?b:a);
  return periods.map((p,k)=>{
    const other=periods[1-k];
    const choices=p.cats.filter(c=>scope.categories.has(c.name)&&c.name!=="USO E CONSUMO - DESPESAS"&&c.count>0&&c.sales>0);
    if(!p.dates||!choices.length)return {title:p.title,empty:"Sem compras para este período nos filtros selecionados."};
    const lead=best(choices,c=>c.count);
    const shareGain=c=>c.count/p.coupons-other.cats[c.i].count/other.coupons;
    const material=choices.filter(c=>c.profit>0&&c.count>=.05*p.coupons);
    const distinct=other.coupons&&material.length?best(material,shareGain):lead;
    const c=distinct&&other.coupons&&shareGain(distinct)>=.01?distinct:lead;
    const hour=best(range(22),h=>c.hours[h]+c.hours[h+1]+c.hours[h+2]);
    const items=new Map();let salesPeak=0,profitPeak=0;
    for(const [slot,id,qty,v,g] of p.rows)if(productCats[id]===c.i&&slot%24>=hour&&slot%24<hour+3){
      if(!items.has(id))items.set(id,accumulator());add(items.get(id),qty,v,g);salesPeak+=v;profitPeak+=g;
    }
    const id=best([...items.keys()],id=>items.get(id).qty),product=productName(id);
    const label=categoryLabel(c.name).toLowerCase(),main=categoryLabel(lead.name).toLowerCase();
    const window=hour+"h–"+(hour+3)+"h",share=pct(c.count,p.coupons);
    let profile=lead===c?`A compra mais frequente inclui ${label}.`:
      `A categoria mais presente é ${main}, mas o que distingue esse período é a procura por ${label}.`;
    if(other.coupons)profile+=` A cada 100 cupons, ${formatPct.format(100*c.count/p.coupons)} incluem ${label}, frente a ${formatPct.format(100*other.cats[c.i].count/other.coupons)} ${k?"de segunda a sexta":"aos sábados e domingos"}.`;
    profile+=c.solo>c.count/2?` Em ${pct(c.solo,c.count)} dessas compras, o cliente leva só itens da categoria.`:` Em ${pct(c.count-c.solo,c.count)} dessas compras, o cliente acrescenta itens de outra categoria.`;
    profile+=` O movimento da categoria se concentra entre ${hour}h e ${hour+3}h, quando ${product} lidera em unidades.`;
    const occasion=c.name==="FOOD"?(hour<11?"O retrato é de quem passa cedo para pegar um lanche pronto. ":(hour<18?"A parada para lanchar ganha força à tarde. ":"A parada para lanchar ganha força à noite. ")):
      c.name==="BEBIDAS ALCOOLICAS GELADAS"?(hour<4?"A compra de geladas atravessa a madrugada. ":"O cliente procura bebida gelada para levar. "):
      c.name==="CIGARROS"&&c.solo>c.count/2?"Há um público que entra com uma compra específica em mente. ":"";
    profile=occasion+profile;
    let economics=`Por dia selecionado, há ${formatPct.format(c.count/p.dates)} cupons com ${label}, com gasto médio de ${money(c.sales/c.count)} na categoria. Na faixa de três horas são ${money(salesPeak/p.dates)} em vendas por dia, com margem bruta de ${pct(profitPeak,salesPeak)}.`;
    if(c.baseline>0){
      const change=(c.comparable-c.baseline)/c.baseline;
      economics+=` No período selecionado, as vendas registradas da categoria ficaram ${formatPct.format(100*Math.abs(change))}% ${change<0?"abaixo":"acima"} de 2025, ajustando o número de dias.`;
    }
    const pairCounts=new Map();
    for(const [mask,row] of p.baskets)if(mask&(1<<c.i))for(let i=2;i<row.length;i++){
      const pid=row[i],t=p.products[pid];
      if(productCats[pid]!==c.i&&basket.categories[productCats[pid]]!=="USO E CONSUMO - DESPESAS"&&t.sales>0&&t.profit/t.sales>Math.max(0,profitPeak/salesPeak))
        pairCounts.set(pid,(pairCounts.get(pid)||0)+row[1]);
    }
    const pair=pairCounts.size?best([...pairCounts],e=>e[1]):null;
    const supply=c.name==="FOOD"?`Prepare ${product} em lotes antes das ${hour}h e ajuste o segundo lote pela sobra.`:
      /^gelo(?: |$)/.test(product)?`Reforce o freezer de gelo antes das ${hour}h.`:
      c.name.startsWith("BEBIDAS")?`Reponha ${product} na geladeira antes das ${hour}h.`:`Garanta ${product} disponível antes das ${hour}h.`;
    let action=supply;
    if(pair&&pair[1]/c.count>=.02)action+=` Teste oferecer ${productName(pair[0])} junto. Já aparece em ${pct(pair[1],c.count)} desses cupons e deixa ${pct(p.products[pair[0]].profit,p.products[pair[0]].sales)} de margem no período.`;
    else action+=` Teste a reposição antecipada e registre as faltas. Compare faturamento e margem da faixa com os das semanas anteriores.`;
    return {title:p.title,window,profile,economics,action,category:label,product,share,rate:c.count/p.dates,margin:pct(profitPeak,salesPeak),period:k?"sábado e domingo":"segunda a sexta"};
  });
}
async function renderPurchaseProfiles(matchingRows) {
  const version=++profileRequest,dataset=source,year=Number(dataset.year);
  const scope={months:[...selection.months],days:new Set(selection.days),categories:new Set([...selection.categories].map(i=>dataset.categories[i]))};
  const selected=matchingRows&&new Set(matchingRows.map(row=>row.id));
  const total=dataset.units.length>1;
  showQuarterPlans($("loja-plan"),"loja",dataset.units.map(u=>[u,storeNames[u]]));
  $("location").textContent=total?"":storeLocations[dataset.units[0]];
  $("profile-period").textContent=year+" · "+scope.months.length+" "+(scope.months.length===1?"mês":"meses");
  $("portraits").textContent="Carregando os retratos de compra…";
  try{
    const sections=await Promise.all(dataset.units.map(async(unit,i)=>{
      const [sales,basket,prior]=await Promise.all([fetchSource(unit+"-"+year),fetchBasketGroups(unit,year),year===2026?fetchSource(unit+"-2025"):null]);
      if(version!==profileRequest||dataset!==source)return "";
      const ids=selected&&new Set(dataset.productMaps[i].flatMap((id,local)=>selected.has(id)?[local]:[]));
      const profiles=purchasePortraits(sales,basket,scope,ids,prior);
      const cards=profiles.map(p=>`<article class="portrait"><h3>${html(p.title)}</h3>${p.empty?`<p>${html(p.empty)}</p>`:`<span class="tag">${html(p.period+" · "+p.window)}</span><p>${html(p.profile)}</p><p class="evidence">${html(p.economics)}</p><p><strong>Estratégia</strong> · ${html(p.action)}</p>`}</article>`).join("");
      const grid=`<div class="observ-cards">${cards}</div>`;
      return total?`<details class="observ-unit"><summary>${html(storeNames[unit])}</summary><p class="muted">${html(storeLocations[unit])}</p>${grid}</details>`:grid;
    }));
    if(version===profileRequest&&dataset===source)$("portraits").innerHTML=sections.join("");
  }catch(error){if(version===profileRequest&&dataset===source)$("portraits").textContent="Não foi possível carregar os retratos deste recorte.";}
}

async function fetchSource(key) {
  if (cache.has(key)) return cache.get(key);
  const response=await fetch(`${key}.json`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data=await response.json();
  cache.set(key,data);
  return data;
}

function mergeSources(units, files) {
  const categories=[...new Set(files.flatMap(file=>file.categories))].sort((a,b)=>categoryLabel(a).localeCompare(categoryLabel(b),"pt-BR"));
  const products=[], identities=new Map(), productMaps=[];
  const blocks=months.map((_,i)=>({days:files[0].months[i].days, sales:0, ref:0, rows:[]}));
  files.forEach((file,unitIndex)=>{
    const ids=file.products.map(([cat,product])=>{
      const category=categories.indexOf(file.categories[cat]);
      const identity=JSON.stringify([category,product]);
      if (!identities.has(identity)) {
        identities.set(identity,products.length);
        products.push([category,product]);
      }
      return identities.get(identity);
    });
    productMaps.push(ids);
    file.months.forEach(({sales,ref,days,rows},index)=>{
      const block=blocks[index];
      if (days.some((count,day)=>count!==block.days[day])) {
        throw new Error("Os calendários das lojas não coincidem.");
      }
      block.sales+=sales;
      block.ref+=ref;
      for(const [slot,id,qty,value,profit] of rows) block.rows.push([slot,ids[id],qty,value,profit,unitIndex]);
    });
  });
  return {year:files[0].year,categories,products,months:blocks,units,productMaps};
}

async function loadSource() {
  const current=++request;
  const store=$("store").value;
  const year=$("year").value;
  const units=store==="all"?Object.keys(storeNames):[store];
  const previousCategories=source && selection.categories.size!==source.categories.length
    ? new Set([...selection.categories].map(i=>source.categories[i])) : null;
  const previousProduct=focus===null?null:JSON.stringify([source.categories[source.products[focus][0]],source.products[focus][1]]);
  $("dashboard").hidden=true;
  $("dashboard-error").hidden=true;
  $("dashboard-loading").hidden=false;
  $("context").textContent="Carregando vendas…";
  try {
    const files=await Promise.all(units.map(unit=>fetchSource(`${unit}-${year}`)));
    if (request!==current) return;
    source=mergeSources(units,files);
    const matched=previousProduct===null?-1:source.products.findIndex(([cat,p])=>JSON.stringify([source.categories[cat],p])===previousProduct);
    focus=matched<0?null:matched;
    page=0;
    selection={
      months:selection.months || new Set(range(10)),
      days:selection.days || new Set(range(7)),
      categories:new Set(range(source.categories.length).filter(i=>!previousCategories || previousCategories.has(source.categories[i])))
    };
    if(focus!==null && !selection.categories.has(source.products[focus][0])) focus=null;
    setupFilters();
    $("dashboard-loading").hidden=true;
    $("dashboard").hidden=false;
    render();
  } catch(error) {
    if (request!==current) return;
    console.error(error);
    $("dashboard-loading").hidden=true;
    $("dashboard-error").hidden=false;
    $("context").textContent="Base não carregada";
  }
}

function add(target,qty,sales,profit) {
  target.qty+=qty;
  target.sales+=sales;
  target.profit+=profit;
}
function aggregate(visible=null) {
  const products=new Map();
  const total=accumulator();
  const stores=source.units.map(accumulator);
  const dayCount=range(7).map(()=>0);
  const grid=range(168).map(accumulator);
  let exportSales=0, commercialSales=0;
  for (const month of selection.months) {
    const block=source.months[month];
    exportSales+=block.sales;
    commercialSales+=block.ref;
    for (const day of selection.days) dayCount[day]+=block.days[day];
    for (const [slot,id,qty,sales,profit,unit] of block.rows) {
      if (!selection.days.has(Math.floor(slot/24)) || !selection.categories.has(source.products[id][0]) ||
          (visible && !visible.has(id))) continue;
      if (!products.has(id)) products.set(id,accumulator());
      add(products.get(id),qty,sales,profit);
      add(total,qty,sales,profit);
      add(stores[unit],qty,sales,profit);
      add(grid[slot],qty,sales,profit);
    }
  }
  return {products,total,stores,dayCount,grid,exportSales,commercialSales};
}
function scaled(value,metric){return value/(metric==="qty"?1000:100);}
function renderKpis(data) {
  const {total, products, dayCount, exportSales, commercialSales}=data;
  const coverage=commercialSales ? formatPct.format(100*exportSales/commercialSales)+"%" : "—";
  const scope=source.units.length===1?storeNames[source.units[0]]:`Todos os postos · ${source.units.length} lojas`;
  $("context").textContent=`${scope} · ${source.year} · ${dayCount.reduce((a,b)=>a+b,0)} datas selecionadas · Cobertura comercial dos meses: ${coverage}`;
  const kpis=[
    ["Faturamento",formatMoney.format(total.sales/100),"Valor líquido da exportação"],
    ["Lucro bruto",formatMoney.format(total.profit/100),"Venda menos custo dos itens"],
    ["Margem bruta",total.sales?formatPct.format(100*total.profit/total.sales)+"%":"—","Lucro bruto ÷ faturamento"],
    ["Produtos",formatNum.format(products.size),"Produtos com registro no recorte"]
  ];
  $("kpis").innerHTML=kpis.map(([label,number,detail],i)=>`<article class="kpi ${i===1?"primary":""}"><h2>${label}</h2><strong>${number}</strong><small>${detail}</small></article>`).join("");
}
function renderUnitTotals(data) {
  const all=source.units.length>1;
  $("unit-panel").hidden=!all;
  if(!all) return;
  const money=cents=>formatMoney.format(cents/100);
  const cells=row=>`<td>${money(row.sales)}</td><td>${money(row.profit)}</td>
    <td>${row.sales?formatPct.format(100*row.profit/row.sales)+"%":"—"}</td>
    <td>${data.total.sales?formatPct.format(100*row.sales/data.total.sales)+"%":"—"}</td>`;
  $("unit-body").innerHTML=data.stores.map((row,index)=>({row,unit:source.units[index]}))
    .sort((a,b)=>b.row.profit-a.row.profit)
    .map(({row,unit})=>`<tr><th scope="row">${storeNames[unit]}</th>${cells(row)}</tr>`).join("");
  $("unit-foot").innerHTML=`<tr><td>Total</td>${cells(data.total)}</tr>`;
}
function chartValue(target,label,value,metric) {
  const formatted=formatMetric(value,metric);
  return `<title>${html(label)}: ${formatted}</title>`;
}
function chartDomain(values) {
  const high=Math.max(0,...values);
  const low=Math.min(0,...values);
  return high===low?[0,1]:[low,high];
}
function renderCharts(data) {
  const metric=$("metric").value;
  const n=data.dayCount.reduce((a,b)=>a+b,0);
  const h=range(24).map(hour=> n?scaled(data.dayCount.reduce((sum,_,d)=>sum+data.grid[24*d+hour][metric],0)/n,metric):0);
  const day=data.dayCount.map((count,d)=>count?scaled(data.grid.slice(24*d,24*(d+1)).reduce((sum,slot)=>sum+slot[metric],0)/count,metric):null);
  const p=focus===null ? "" : source.products[focus][1];
  $("focus-strip").hidden=focus===null;
  $("focus-label").textContent=p;
  const numericH=chartDomain(h);
  const toY=(val,min,max)=> 132-103*(val-min)/(max-min);
  const toX=i=>58+(448/23)*i;
  const yH=h.map(v=>toY(v,...numericH));
  const line=h.map((_,i)=>`${i?"L":"M"}${toX(i)},${yH[i]}`).join(" ");
  const tick=n=>metric==="qty"?formatNum.format(Math.round(n)):"R$ "+formatNum.format(Math.round(n));
  const hAxis=[0,.5,1].map(r=>{
    const value=numericH[0]+r*(numericH[1]-numericH[0]);
    const y=toY(value,...numericH);
    return `<line class="axis" x1="55" x2="512" y1="${y}" y2="${y}"/><text x="51" y="${y+4}" text-anchor="end" font-size="10">${tick(value)}</text>`;
  }).join("");
  const markers=h.map((v,i)=>`<circle class="chart-point" tabindex="0" cx="${toX(i)}" cy="${yH[i]}" r="4.6" fill="#84c3ff" data-point="${i}h · ${formatMetric(v,metric)}" aria-label="${i}h, ${formatMetric(v,metric)}">${chartValue("hour",i+"h",v,metric)}</circle>`).join("");
  const labels=range(24).filter(i=>i%3===0||i===23).map(i=>`<text x="${toX(i)}" y="150" text-anchor="middle" font-size="11">${i}h</text>`).join("");
  $("hour-chart").innerHTML=`<svg viewBox="0 0 525 161" role="group" aria-label="${metricLabel(metric)} médio por hora">${hAxis}
    <path d="${line} L506,${toY(0,...numericH)} L58,${toY(0,...numericH)} Z" fill="#265c883d"/>
    <path d="${line}" fill="none" stroke="#84c3ff" stroke-width="2"/>${markers}${labels}</svg>`;

  const dDomain=chartDomain(day.filter(v=>v!==null));
  const baseline=toY(0,...dDomain);
  const dayBars=day.map((v,i)=>{
    const x=47+i*42, yy=toY(v??0,...dDomain);
    const desc=v===null?"Dia fora do filtro":formatMetric(v,metric);
    return `<rect class="day-bar" tabindex="0" x="${x}" y="${Math.min(yy,baseline)}" width="29" height="${Math.max(1,Math.abs(baseline-yy))}" rx="3" fill="${v===null?"#384960":i>=5?"#f3c277":"#52d9b5"}" data-point="${dayNames[i]} · ${desc}" aria-label="${dayNames[i]}, ${desc}"><title>${desc}</title></rect>
    <text x="${x+14.5}" y="150" text-anchor="middle" font-size="11">${dayShort[i]}</text>`;
  }).join("");
  const dAxis=[0,.5,1].map(r=>{
    const value=dDomain[0]+r*(dDomain[1]-dDomain[0]);
    const y=toY(value,...dDomain);
    return `<line class="axis" x1="43" x2="335" y1="${y}" y2="${y}"/><text x="40" y="${y+4}" text-anchor="end" font-size="9">${tick(value)}</text>`;
  }).join("");
  $("day-chart").innerHTML=`<svg viewBox="0 0 349 161" role="group" aria-label="${metricLabel(metric)} médio por dia da semana">${dAxis}${dayBars}</svg>`;

  const heat=data.grid.map((x,i)=> {
    const count=data.dayCount[Math.floor(i/24)];
    return count?scaled(x[metric]/count,metric):null;
  });
  const max=Math.max(1,...heat.map(t=>Math.abs(t??0)));
  $("heatmap").innerHTML=`<table class="heat-table"><thead><tr><th scope="col">Dia</th>${range(24).map(i=>`<th scope="col">${i}h</th>`).join("")}</tr></thead><tbody>
  ${dayShort.map((name,d)=>`<tr><th scope="row">${name}</th>${range(24).map(hour=>{
    const v=heat[d*24+hour];
    if (v===null) return '<td><span class="heat-cell" aria-label="Fora do filtro"></span></td>';
    const desc=`${dayNames[d]}, ${hour}h · ${formatMetric(v,metric)}`;
    const c=v<0?"248,139,139":"87,176,255";
    return `<td><button class="heat-cell" type="button" title="${desc}" aria-label="${desc}" data-point="${desc}" style="background:rgba(${c},${.08+.83*Math.sqrt(Math.abs(v)/max)})"></button></td>`;
  }).join("")}</tr>`).join("")}</tbody></table><div class="heat-scale">Menor <span class="scale-strip"></span> Maior</div>`;
  $("point-value").textContent=n && data.products.size?"Passe o cursor ou toque em um ponto para ver o valor.":"Nenhum registro corresponde aos filtros.";
  document.querySelectorAll("[data-point]").forEach(point=>{
    const show=()=>{$("point-value").textContent=point.dataset.point;};
    point.addEventListener("pointerenter",show);
    point.addEventListener("focus",show);
    point.addEventListener("click",show);
  });
}

function rankProducts(products,metric) {
  const ordered=[...products.entries()].sort((a,b)=>b[1][metric]-a[1][metric] ||
    source.products[a[0]][1].localeCompare(source.products[b[0]][1],"pt-BR"));
  const positive=ordered.reduce((sum,[,x])=>sum+Math.max(0,x[metric]),0);
  let cum=0;
  return ordered.map(([id,values])=>{
    const v=values[metric];
    const grade=v<=0?"—":cum<.8*positive?"A":cum<.95*positive?"B":"C";
    cum+=Math.max(0,v);
    return {id,...values,grade,share:v>0?100*cum/positive:null};
  });
}
function abcTable(all,filtered) {
  rankedExport=filtered;
  const pages=Math.ceil(filtered.length/pageSize);
  page=Math.max(0,Math.min(page,pages-1));
  const rows=filtered.slice(page*pageSize,(page+1)*pageSize);
  $("abc-body").innerHTML=rows.map(row=>{
    const [cat,product]=source.products[row.id];
    return `<tr><td><span class="grade grade-${row.grade.toLowerCase()}">${row.grade}</span></td>
      <td><button type="button" class="link-button" data-product="${row.id}" aria-label="Ver horários de ${html(product)}">${html(product)}</button>
      <span class="category">${html(categoryLabel(source.categories[cat]))}</span></td>
      <td>${formatNum.format(row.qty/1000)}</td><td>${formatMoney.format(row.sales/100)}</td><td>${formatMoney.format(row.profit/100)}</td>
      <td>${row.share===null?"—":formatPct.format(row.share)+"%"}</td></tr>`;
  }).join("") || '<tr><td colspan="6">Nenhum produto corresponde aos filtros.</td></tr>';
  $("grade-summary").innerHTML=["A","B","C","—"].map(grade=>{
    const count=all.filter(r=>r.grade===grade).length;
    return count?`<span class="grade-card grade-${grade.toLowerCase()}">${grade==="—"?"Sem classe":grade} · ${count} produtos</span>`:"";
  }).join("");
  $("abc-count").textContent=filtered.length?`${page*pageSize+1}–${Math.min((page+1)*pageSize,filtered.length)} de ${filtered.length} produtos`:"0 produtos";
  $("prev").disabled=page===0;
  $("next").disabled=page+1>=pages;
  $("download").disabled=!filtered.length;
}

let current=null;
let currentRanking=[];
let currentRows=[];
function render() {
  if (!source || $("dashboard").hidden) return;
  const base=aggregate();
  currentRanking=rankProducts(base.products,$("abc-metric").value);
  const query=keyText($("abc-search").value.trim());
  const selectedClass=$("abc-class").value;
  currentRows=currentRanking.filter(row=>
    (!query || keyText(source.products[row.id][1]).includes(query)) &&
    (!selectedClass || row.grade===selectedClass) &&
    (focus===null || row.id===focus)
  );
  current=currentRows.length===currentRanking.length?base:aggregate(new Set(currentRows.map(row=>row.id)));
  const matchingRows=query || selectedClass || focus!==null ? currentRows : null;
  renderPurchaseProfiles(matchingRows);
  renderKpis(current);
  renderUnitTotals(current);
  renderCharts(current);
  abcTable(currentRanking,currentRows);
  renderAffinity(source, selection, matchingRows);
}

function csvExport() {
  if (!rankedExport.length) return;
  const csvText=value=>{
    const text=String(value??"");
    return '"' + (/^[=+\-@\t\r]/.test(text)?"'":"") + text.replaceAll('"','""') + '"';
  };
  const csvNumber=x=>(x===null?"":String(x).replace(".",","));
  const rows=[["Classe","Produto","Categoria","Quantidade","Faturamento","Lucro bruto","Acumulado (%)"].map(csvText)];
  for(const r of rankedExport){
    const [cat,product]=source.products[r.id];
    rows.push([csvText(r.grade),csvText(product),csvText(categoryLabel(source.categories[cat])),
      csvNumber(r.qty/1000),csvNumber(r.sales/100),csvNumber(r.profit/100),csvNumber(r.share===null?null:r.share.toFixed(2))]);
  }
  const blob=new Blob(["\uFEFF",rows.map(row=>row.join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement("a");
  anchor.href=url;
  anchor.download=`Curva_ABC_${(storeNames[$("store").value]??"Todos_os_postos")}_${source.year}.csv`;
  anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

$("store").addEventListener("change",loadSource);
$("year").addEventListener("change",loadSource);
$("retry").addEventListener("click",loadSource);
$("reset").addEventListener("click",()=>{
  if (!source) return;
  selection={months:new Set(range(10)),days:new Set(range(7)),categories:new Set(range(source.categories.length))};
  focus=null;
  page=0;
  $("abc-class").value="";
  $("abc-search").value="";
  $("abc-metric").value="profit";
  $("metric").value="qty";
  setupFilters();
  render();
});
$("metric").addEventListener("change",()=>{if(current)renderCharts(current);});
for(const id of ["abc-metric","abc-search","abc-class"]){
  $(id).addEventListener(id==="abc-search"?"input":"change",()=>{page=0;if(id==="abc-search")focus=null;render();});
}
$("prev").addEventListener("click",()=>{page--;abcTable(currentRanking,currentRows);});
$("next").addEventListener("click",()=>{page++;abcTable(currentRanking,currentRows);});
$("download").addEventListener("click",csvExport);
$("abc-body").addEventListener("click",e=>{
  const button=e.target.closest("[data-product]");
  if(!button) return;
  focus=Number(button.dataset.product);
  page=0;
  render();
  $("consumption-title").scrollIntoView({block:"start",behavior:"smooth"});
});
$("clear-focus").addEventListener("click",()=>{focus=null;page=0;render();});
for(const [id,pista] of [["pista-tab",true],["loja-tab",false]])$(id).addEventListener("click",()=>{
  switchModule(pista);
  if (pista) history.replaceState(null,"","#pista");
  else if (location.hash==="#pista") history.replaceState(null,"",location.pathname+location.search);
  window.scrollTo(0,0);
});
if (location.hash==="#pista") switchModule(true);
document.addEventListener("click",e=>document.querySelectorAll("details.dropdown[open]").forEach(d=>{if(!d.contains(e.target))d.open=false;}));
document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll("details.dropdown[open]").forEach(d=>{d.open=false;d.querySelector("summary").focus();});});
const filterPanel=document.querySelector(".filter-panel");
const filterToggle=$("toggle-filters");
function setFilterVisibility(expanded) {
  $("filter-fields").hidden=!expanded;
  filterToggle.textContent=expanded?"Recolher":"Mostrar filtros";
  filterToggle.setAttribute("aria-expanded",String(expanded));
}
filterToggle.addEventListener("click",()=>setFilterVisibility($("filter-fields").hidden));
if (matchMedia("(max-width: 760px)").matches) setFilterVisibility(false);
new ResizeObserver(()=>document.documentElement.style.setProperty("--filter-height",`${filterPanel.offsetHeight}px`)).observe(filterPanel);
loadSource();
