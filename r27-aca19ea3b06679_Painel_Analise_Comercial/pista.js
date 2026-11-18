"use strict";

window.pista = (() => {
  const get = suffix => document.getElementById(`pista-${suffix}`);
  const monthLabels = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out"];
  const weekdays = ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"];
  const shortDays = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
  const segmentNames = ["Clientes","Desconto Frota","Passantes"];
  const segmentColors = ["#79b8ff","#f3c277","#52d9b5"];
  const number = new Intl.NumberFormat("pt-BR",{maximumFractionDigits:2});
  const integer = new Intl.NumberFormat("pt-BR",{maximumFractionDigits:0});
  const cash = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
  const percent = new Intl.NumberFormat("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1});
  const liters = n => `${number.format(n)} L`;
  const pp = n => n === null ? "—" : `${percent.format(n*100)}%`;
  const sharePct = new Intl.NumberFormat("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2,style:"percent"});
  const ratio = (n,d) => d>0 ? n/d : null;
  const growth = (a,b) => b>0 ? (a-b)/b : null;
  const signed = (x,format) => x === null ? "—" : (x>0 ? "+" : "") + format(x);
  const sequence = n => Array.from({length:n},(_,i)=>i);
  const empty = () => ({qty:0,sales:0,profit:0,fuel:0,lube:0,packs:0,mapped:0});
  const elements = new Map();
  const pageSize = 15;
  let catalog, current, state, buyerData, buyerPage=0, request=0, ready=false;
  let selectedMonths = new Set(sequence(10));
  let selectedDays = new Set(sequence(7));
  const selectedGroups = new Set([0]);
  let detail, trocas;

  function data(file) {
    if (elements.has(file)) return elements.get(file);
    const pending=fetch(`${file}.json?v=20261118-pista2`).then(response=>{
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }).catch(error=>{
      elements.delete(file);
      throw error;
    });
    elements.set(file,pending);
    return pending;
  }

  function setupMulti(suffix, labels, selected, allLabel) {
    const node=get(suffix);
    node.innerHTML=`<summary></summary><div class="drop-content">
      <div class="drop-actions"><button type="button" class="link-button" data-pick="all">Todos</button>
      <button type="button" class="link-button" data-pick="none">Nenhum</button></div>
      <div class="drop-list">${labels.map((label,index)=>`<label><input type="checkbox" value="${index}">${html(label)}</label>`).join("")}</div>
      </div>`;
    const inputs=[...node.querySelectorAll("input")];
    const refresh=()=>{
      inputs.forEach((input,index)=>input.checked=selected.has(index));
      node.firstElementChild.textContent=selected.size===labels.length ? allLabel :
        selected.size===0 ? "Nenhum" : selected.size===1 ? labels[[...selected][0]] : `${selected.size} selecionados`;
    };
    node.addEventListener("click",event=>{
      const mode=event.target.dataset.pick;
      if (!mode) return;
      selected.clear();
      if (mode==="all") labels.forEach((_,i)=>selected.add(i));
      refresh();
      if(suffix==="group"){populateProducts();updateMetricOptions();}
      render();
    });
    node.addEventListener("change",()=>{
      selected.clear();
      inputs.forEach((input,i)=>{if(input.checked) selected.add(i);});
      refresh();
      if(suffix==="group"){populateProducts();updateMetricOptions();}
      render();
    });
    refresh();
    return refresh;
  }

  function populateProducts() {
    const selected=selectedGroups;
    get("product").innerHTML='<option value="">Todos os produtos</option>'+
      catalog.products.map(([group,name,,,code],pid)=>selected.has(group) ? `<option value="${pid}">${html(code?code+" · "+name:name)}</option>` : "").join("");
  }

  function bind() {
    get("store").innerHTML+=
      catalog.stores.map(([slug,name])=>`<option value="${slug}">${html(name)}</option>`).join("");
    const resetGroups=setupMulti("group",catalog.groups,selectedGroups,"Todas as categorias");
    const resetMonths=setupMulti("months",monthLabels,selectedMonths,"Jan a out");
    const resetDays=setupMulti("days",weekdays,selectedDays,"Todos os dias");
    populateProducts();
    updateMetricOptions();
    get("store").addEventListener("change",load);
    get("year").addEventListener("change",render);
    get("product").addEventListener("change",render);
    get("chart-metric").addEventListener("change",()=>drawPatterns(state));
    get("abc-metric").addEventListener("change",()=>drawABC(state));
    for (const suffix of ["buyer-segment","buyer-sort","buyer-search"]) {
      get(suffix).addEventListener(suffix==="buyer-search"?"input":"change",()=>{
        buyerPage=0;
        drawBuyers();
      });
    }
    get("prev").addEventListener("click",()=>{buyerPage--;drawBuyers();});
    get("next").addEventListener("click",()=>{buyerPage++;drawBuyers();});
    get("reset").addEventListener("click",()=>{
      get("store").value="all";
      get("year").value="2026";
      selectedGroups.clear(); selectedGroups.add(0); resetGroups();
      get("buyer-segment").value="";
      get("buyer-sort").value="volume";
      get("buyer-search").value="";
      get("abc-metric").value="profit";
      sequence(10).forEach(i=>selectedMonths.add(i));
      sequence(7).forEach(i=>selectedDays.add(i));
      resetMonths();
      resetDays();
      populateProducts();
      updateMetricOptions();
      load();
    });
    get("collapse").addEventListener("click",()=>{
      const hide=!get("fields").hidden;
      get("fields").hidden=hide;
      get("collapse").setAttribute("aria-expanded",String(!hide));
      get("collapse").textContent=hide?"Expandir":"Recolher";
    });
    get("retry").addEventListener("click",()=>{if (ready) load(); else activate();});
    get("trocas-category").addEventListener("change",()=>drawTrocas(state));
    ready=true;
  }

  async function activate() {
    if (ready) return;
    try {
      [catalog,detail,trocas]=await Promise.all([data("pista-index"),data("pista-detail"),data("pista-trocas")]);
      if(ready) return;
      bind();
      await load();
    } catch {
      get("error").hidden=false;
      get("context").textContent="Base da pista indisponível.";
      get("dashboard").hidden=true;
    }
  }

  async function load() {
    const id=++request;
    const store=get("store").value;
    const shops=catalog.stores.filter(([slug])=>store==="all"||slug===store);
    get("context").textContent="Carregando a base selecionada…";
    get("dashboard").hidden=true;
    get("error").hidden=true;
    try {
      const [older,newer,units]=await Promise.all([
        data("pista-clientes-2025"),data("pista-clientes-2026"),
        Promise.all(shops.map(async ([slug,name])=>{
          const [base,now]=await Promise.all([data(`pista-${slug}-2025`),data(`pista-${slug}-2026`)]);
          return {slug,name,2025:base,2026:now};
        }))
      ]);
      if(id!==request)return;
      current={units,names:{2025:older,2026:newer},store};
      render();
      get("dashboard").hidden=false;
    } catch (error) {
      if(id!==request)return;
      console.error(error);
      get("error").hidden=false;
      get("context").textContent="Base da pista indisponível.";
    }
  }

  function updateMetricOptions() {
    const group=selectedGroups.size===1?[...selectedGroups][0]:-1;
    const qty=group===0 ? "Volume (L)" : "Unidades";
    get("chart-metric").innerHTML=(group<0?"":`<option value="qty">${qty}</option>`)+
      (group===1?'<option value="lube">Litros convertidos</option>':'')+
      '<option value="sales">Faturamento</option><option value="profit">Lucro bruto</option>';
  }

  function addTo(values,qty,sales,profit,group,capacity) {
    const quantity=qty/100;
    values.qty+=quantity;
    values.sales+=sales/100;
    values.profit+=profit/10000;
    if(group===0) values.fuel+=quantity;
    if(group===1) {
      values.packs+=quantity;
      if(capacity) {
        values.lube+=quantity*capacity;
        values.mapped+=quantity;
      }
    }
  }
  function combine(target,source) {
    for(const key of Object.keys(target)) target[key]+=source[key];
  }

  function collect(unit,year,activeMonths,group,filter) {
    const totals=empty();
    const months=sequence(10).map(empty);
    const products=new Map();
    const grid=sequence(7).map(()=>sequence(24).map(empty));
    const dates=sequence(10).map(()=>Array(7).fill(0));
    const predicates=new Set(catalog.products.flatMap(([g],pid)=>selectedGroups.has(g)&&(!filter||pid===Number(filter))?[pid]:[]));
    for(const month of activeMonths) {
      const record=unit[year][month];
      dates[month]=record.days.map((n,d)=>selectedDays.has(d)?n:0);
      for(const [day,hour,pid,qty,sales,profit] of record.sales) {
        if(!selectedDays.has(day)||!predicates.has(pid))continue;
        const capacity=catalog.products[pid][2];
        if(!products.has(pid))products.set(pid,empty());
        const sums=[totals,products.get(pid),months[month]];
        if(hour>=0)sums.push(grid[day][hour]);
        for(const sum of sums)addTo(sum,qty,sales,profit,catalog.products[pid][0],capacity);
      }
    }
    return {totals,months,products,grid,dates};
  }

  function mergeSummaries(units, prop) {
    const totals=empty(), months=sequence(10).map(empty), products=new Map();
    const grid=sequence(7).map(()=>sequence(24).map(empty));
    const dates=sequence(10).map(()=>Array(7).fill(0));
    for(const unit of units) {
      const part=unit[prop];
      combine(totals,part.totals);
      for (let m=0;m<10;m++) {
        combine(months[m],part.months[m]);
        dates[m]=dates[m].map((n,d)=>Math.max(n,part.dates[m][d]));
      }
      for(let d=0;d<7;d++) for(let h=0;h<24;h++)combine(grid[d][h],part.grid[d][h]);
      for(const [pid,row] of part.products) {
        if(!products.has(pid))products.set(pid,empty());
        combine(products.get(pid),row);
      }
    }
    const dayCounts=sequence(7).map(day=>dates.reduce((sum,m)=>sum+m[day],0));
    return {totals,months,products,grid,dayCounts};
  }

  function collectFuel(units,year,monthProp,pidFilter) {
    const groups=[0,0,0];
    const buyers=new Map();
    const fuels=[new Map(),new Map(),new Map()];
    const months=sequence(10).map(()=>[0,0,0]);
    const discrepancies=[];
    const invalid=[];
    let total=0, cells=0;
    for(const unit of units) for(const month of unit[monthProp]) {
      const rec=unit[year][month];
      if(!rec.days.some(Boolean))continue;
      cells++;
      const sold=new Map(rec.fuel.filter(([pid])=>!pidFilter||pid===Number(pidFilter)));
      const mix=[0,0];
      const recorded=new Map();
      for(const [segment,index,pid,qty] of rec.clients) {
        if(pidFilter&&pid!==Number(pidFilter))continue;
        mix[segment]+=qty;
        recorded.set(pid,(recorded.get(pid)||0)+qty);
        fuels[segment].set(pid,(fuels[segment].get(pid)||0)+qty);
        const name=current.names[year][index];
        const key=`${segment}|${keyText(name).trim()}`;
        let buyer=buyers.get(key);
        if(!buyer) {
          buyer={name,segment,qty:0};
          buyers.set(key,buyer);
        }
        buyer.qty+=qty;
      }
      const subtotal=[...sold.values()].reduce((n,v)=>n+v,0);
      total+=subtotal;
      groups[0]+=mix[0];
      groups[1]+=mix[1];
      const remainder=subtotal-mix[0]-mix[1];
      groups[2]+=remainder;
      months[month][0]+=mix[0];
      months[month][1]+=mix[1];
      months[month][2]+=remainder;
      if(remainder<0)invalid.push({name:unit.name,month,qty:-remainder});
      for(const pid of new Set([...sold.keys(),...recorded.keys()])) {
        const left=(sold.get(pid)||0)-(recorded.get(pid)||0);
        if(left<0)discrepancies.push({name:unit.name,month,pid,qty:-left});
        fuels[2].set(pid,(fuels[2].get(pid)||0)+left);
      }
    }
    return {total,groups,buyers,fuels,months,discrepancies,invalid,cells};
  }

  function prepare() {
    const year=Number(get("year").value);
    const group=selectedGroups.size===1?[...selectedGroups][0]:-1;
    const filter=get("product").value;
    const allMonths=[...selectedMonths].sort((a,b)=>a-b);
    const units=current.units.map(unit=>{
      const common=allMonths.filter(m=>unit[2025][m].complete&&unit[2026][m].complete);
      return {...unit,allMonths,common,
        time:collect(unit,year,allMonths,group,filter),
        base:collect(unit,2025,common,group,filter),
        now:collect(unit,2026,common,group,filter)};
    });
    return {year,group,filter,units,allMonths,
      time:mergeSummaries(units,"time"),base:mergeSummaries(units,"base"),now:mergeSummaries(units,"now"),
      fuel:group===0&&selectedDays.size===7?collectFuel(units,year,"allMonths",filter):null,
      fuelBase:group===0&&selectedDays.size===7?collectFuel(units,2025,"common",filter):null,
      fuelNow:group===0&&selectedDays.size===7?collectFuel(units,2026,"common",filter):null};
  }

  function qtyFormat(group,value) {
    return group===0 ? liters(value):`${number.format(value)} un.`;
  }

  function cell(title,value,sub) {
    return `<article class="kpi"><span>${html(title)}</span><strong>${html(value)}</strong><small>${html(sub)}</small></article>`;
  }

  function drawKpis(s) {
    const v=s.time.totals;
    const compare=name=>s.units.some(u=>u.common.length) ? `${signed(growth(s.now.totals[name],s.base.totals[name]),pp)} · 2026/25*` : "Comparação indisponível";
    const cards=[
      ...(s.group<0?[cell("Volume de combustíveis",liters(v.fuel),"Categorias selecionadas"),cell("Unidades de produtos",number.format(v.qty-v.fuel),"Produtos fora de Combustíveis")]:[cell(s.group===0?"Volume de combustíveis":"Unidades vendidas",qtyFormat(s.group,v.qty),compare("qty"))]),
      cell("Faturamento",cash.format(v.sales),compare("sales")),
      cell("Lucro bruto",cash.format(v.profit),compare("profit")),
      cell("Margem bruta",pp(ratio(v.profit,v.sales)),"Lucro bruto ÷ faturamento")
    ];
    if(s.group===0) {
      const profitPerLiter=ratio(v.profit,v.fuel);
      cards.push(cell("Lucro bruto por litro",profitPerLiter===null?"—":cash.format(profitPerLiter),"Na base de vendas"));
    } else if(s.group===1) {
      cards.push(cell("Litros convertidos",v.mapped?liters(v.lube):"—",`${pp(ratio(v.mapped,v.packs))} das unidades com conversão`));
    }
    get("kpis").innerHTML=cards.join("");
  }

  function tableHead(labels){return "<tr>"+labels.map(text=>`<th scope="col">${html(text)}</th>`).join("")+"</tr>";}
  function tableRow(label,values,klass=""){return `<tr class="${klass}"><th scope="row">${html(label)}</th>`+values.map(value=>`<td>${html(value)}</td>`).join("")+"</tr>";}
  function drawUnits(s) {
    const withPairs=s.units.filter(u=>u.common.length);
    get("units-head").innerHTML=tableHead(["Posto",s.group===0?"Volume":"Quantidade","Faturamento","Lucro bruto","Margem bruta",s.group===0?"Δ volume*":"Δ unidades*","Δ lucro bruto*"]);
    const rank=s.units.slice().sort((a,b)=>b.time.totals.profit-a.time.totals.profit);
    const row=(label,time,base,now,hasPair,klass)=>tableRow(label,[
      s.group<0?`${liters(time.fuel)} · ${number.format(time.qty-time.fuel)} un.`:qtyFormat(s.group,time.qty),cash.format(time.sales),cash.format(time.profit),pp(ratio(time.profit,time.sales)),
      hasPair&&s.group>=0?signed(growth(now.qty,base.qty),pp):"—",hasPair?signed(growth(now.profit,base.profit),pp):"—"
    ],klass);
    get("units").innerHTML=rank.map(u=>row(u.name,u.time.totals,u.base.totals,u.now.totals,u.common.length)).join("")+
      (rank.length>1?row("Todos os postos",s.time.totals,s.base.totals,s.now.totals,withPairs.length,"pista-total"):"");
    const missing=s.units.filter(u=>u.common.length<s.allMonths.length).map(u=>u.name);
    get("comparison-note").textContent="* Variação de 2026 sobre 2025, considerando os meses completos comuns a cada posto."+
      (missing.length?` ${missing.join(", ")}: meses sem cobertura completa em um dos anos ficam fora da comparação.`:"");
  }

  function drawSegments(s) {
    const f=s.fuel;
    const unavailable=s.group!==0?"Os relatórios de clientes cobrem apenas combustíveis. Selecione Combustíveis para ver a composição.":
      "A carteira tem abertura mensal. Selecione todos os dias da semana para ver a composição e o ranking.";
    get("scope-badge").textContent="Visão mensal";
    get("mix-content").hidden=!f;
    if(!f) {
      get("recon").textContent=unavailable;
      buyerData=null;
      return;
    }
    const invalid=f.groups[2]<0;
    let notice=`Base de vendas do recorte: ${liters(f.total/100)}.`;
    if(!f.cells)notice="Sem cobertura de vendas para os meses selecionados.";
    if(invalid) {
      const examples=f.invalid.slice(0,3).map(x=>`${x.name} (${monthLabels[x.month]})`).join(", ");
      notice+=` Em ${f.invalid.length} recorte(s) de posto e mês, a carteira supera a base: ${examples}${f.invalid.length>3?"…":""}. Composição indisponível até conciliar as bases.`;
    } else if(f.invalid.length) {
      const examples=f.invalid.slice(0,3).map(x=>`${x.name} (${monthLabels[x.month]})`).join(", ");
      notice+=` Saldo do recorte consolidado. A carteira supera as vendas exportadas em ${f.invalid.length} posto(s)/mês, incluindo ${examples}. Consulte esses recortes separadamente para a conciliação.`;
    } else if(f.discrepancies.length) {
      notice+=` Há ${f.discrepancies.length} recorte(s) divergentes por posto, mês e combustível. O saldo consolidado usa o total das vendas exportadas para a seleção.`;
    }
    get("recon").textContent=notice;
    get("sharebar").hidden=invalid||f.total<=0;
    get("sharebar").innerHTML=invalid||f.total<=0?"":f.groups.map((value,i)=>`<span style="width:${100*value/f.total}%;background:${segmentColors[i]}"></span>`).join("");
    const goodPairs=s.fuelBase.cells>0&&s.fuelNow.cells>0;
    const comparablePassers=goodPairs&&s.fuelBase.groups[2]>=0&&s.fuelNow.groups[2]>=0;
    let rounded=f.total>0?f.groups.map(n=>Math.round(n/f.total*10000)):null;
    if(rounded&&!invalid) {
      const difference=10000-rounded.reduce((a,b)=>a+b,0);
      const largest=f.groups.indexOf(Math.max(...f.groups));
      rounded[largest]+=difference;
    }
    get("mix").innerHTML=segmentNames.map((label,i)=>{
      const value=f.groups[i];
      return tableRow(label,[
        !f.cells||(i===2&&invalid)?"—":liters(value/100),
        !invalid&&rounded?sharePct.format(rounded[i]/10000):"—",
        goodPairs&&(i!==2||comparablePassers)?signed(growth(s.fuelNow.groups[i],s.fuelBase.groups[i]),pp):"—"
      ],`pista-segment segment-${i}`);
    }).join("");
    buyerData={f,base:s.fuelBase,now:s.fuelNow,showShare:!invalid,goodPairs,year:s.year};
    buyerPage=0;
    drawBuyers();
  }

  function drawBuyers() {
    if(!buyerData)return;
    const {f,base,now,showShare,goodPairs,year}=buyerData;
    const group=get("buyer-segment").value;
    const query=keyText(get("buyer-search").value.trim());
    const order=get("buyer-sort").value;
    const keys=new Set(f.buyers.keys());
    if(order!=="volume"&&goodPairs) {
      for(const key of base.buyers.keys())keys.add(key);
      for(const key of now.buyers.keys())keys.add(key);
    }
    const list=[...keys].map(key=>{
      const shown=f.buyers.get(key);
      const old=base.buyers.get(key);
      const recent=now.buyers.get(key);
      const label=shown||recent||old;
      return {...label,qty:shown?.qty||0,delta:goodPairs?(recent?.qty||0)-(old?.qty||0):null};
    }).filter(row=>(!group||Number(group)===row.segment)&&keyText(row.name).includes(query));
    list.sort((a,b)=>{
      const delta=order==="loss"?(a.delta||0)-(b.delta||0):order==="gain"?(b.delta||0)-(a.delta||0):0;
      return delta||b.qty-a.qty||a.name.localeCompare(b.name,"pt-BR");
    });
    get("buyer-sort").options[1].disabled=!goodPairs;
    get("buyer-sort").options[2].disabled=!goodPairs;
    if(!goodPairs&&order!=="volume") get("buyer-sort").value="volume";
    const pages=Math.max(1,Math.ceil(list.length/pageSize));
    buyerPage=Math.min(Math.max(buyerPage,0),pages-1);
    const rows=list.slice(buyerPage*pageSize,(buyerPage+1)*pageSize);
    get("buyers").innerHTML=rows.length?rows.map(row=>tableRow(row.name,[
      segmentNames[row.segment],liters(row.qty/100),showShare?pp(ratio(row.qty,f.total)):"—",
      pp(ratio(row.qty,f.groups[row.segment])),signed(row.delta===null?null:row.delta/100,liters)
    ])).join(""):'<tr><td colspan="6" class="muted">Nenhum cliente neste recorte.</td></tr>';
    get("buyer-page").textContent=`${integer.format(list.length)} clientes/grupos · Página ${buyerPage+1} de ${pages} · Volume ${year}`;
    get("prev").disabled=buyerPage===0;
    get("next").disabled=buyerPage+1>=pages;
  }

  function portrait(title,summary,evidence,action=false) {
    return `<article class="portrait ${action?"action-card":""}"><h3>${html(title)}</h3><p>${html(summary)}</p><p class="evidence">${html(evidence)}</p></article>`;
  }

  const fuelLabel = name => name.toLocaleLowerCase("pt-BR")
    .replace("gasolina c aditivada","gasolina aditivada")
    .replace("diesel s-10 b comum","diesel S-10").replace("etanol hidratado combustivel","etanol");
  function largest(map) {
    return [...map].filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])[0];
  }
  function observationsForUnit(unit,year,months) {
    const portfolio=new Map(), residual=new Map(), accounts=new Map(), excluded=[];
    const add=(map,key,n)=>map.set(key,(map.get(key)||0)+n);
    for(const month of months) {
      const rec=unit[year][month];
      if(!rec.days.some(Boolean)) continue;
      const balance=new Map(rec.fuel);
      for(const [,index,pid,qty] of rec.clients) {
        add(portfolio,pid,qty);
        add(balance,pid,-qty);
        const key=keyText(current.names[year][index]).trim();
        if(!accounts.has(key)) accounts.set(key,{months:new Set(),qty:0});
        const account=accounts.get(key);
        if(qty>0) account.months.add(month);
        account.qty+=qty;
      }
      if([...balance.values()].some(v=>v<0)||!rec.complete||!rec.clients.length) excluded.push(monthLabels[month]);
      else for(const [pid,qty] of balance) add(residual,pid,qty);
    }
    const fuelName=pid=>fuelLabel(catalog.products[pid][1]);
    const total=map=>[...map.values()].reduce((a,b)=>a+b,0);
    const best=largest(portfolio);
    const repeat=[...accounts.values()].filter(a=>a.months.size>=2);
    const recurrentVolume=repeat.reduce((sum,a)=>sum+a.qty,0);
    const fleet=best?portrait("Cliente/Frotista",
      `A carteira de clientes e convênios comprou ${liters(total(portfolio)/100)}. De cada 100 litros, cerca de ${integer.format(100*best[1]/total(portfolio))} foram de ${fuelName(best[0])}.`+
      (months.length>1?` Os cadastros que voltaram em pelo menos dois meses responderam por ${pp(ratio(recurrentVolume,total(portfolio)))} dos litros da carteira.`:""),
      `Para manter a carteira, acompanhe os cadastros que abastecem todo mês e procure os que reduziram as compras. Para prospectar, comece por ${/diesel/i.test(fuelName(best[0]))?"operações com veículos a diesel":"empresas com veículos leves"} que circulam pela região e usam ${fuelName(best[0])} com frequência.`):
      portrait("Cliente/Frotista","Sem compras identificadas da carteira nos meses selecionados.","");
    const pass=largest(residual);
    const scope=excluded.length?` Fora da estimativa por cobertura incompleta ou diferença entre as bases: ${excluded.join(", ")}.`:"";
    const passText=pass?`Estimamos ${liters(total(residual)/100)} vendidos ao público passante, descontando a carteira das vendas do posto. O combustível com mais litros foi ${fuelName(pass[0])} (${pp(ratio(pass[1],total(residual)))}).`:
      "Os meses selecionados não permitem estimar a composição dos passantes.";
    const rows=detailRows(unit.slug,year,p=>p>=0&&catalog.products[p][0]===0);
    function pattern(family) {
      const grouped=[new Map(),new Map()];
      for(const [,day,h,p,qty,sales,tx] of rows) {
        if(!catalog.products[p][1].startsWith(family)) continue;
        const group=grouped[Number(day>=5)];
        if(!group.has(p)) group.set(p,{qty:0,sales:0,tx:0,hours:Array(24).fill(0)});
        const v=group.get(p); v.qty+=qty;v.sales+=sales;v.tx+=tx;if(h>=0)v.hours[h]+=tx;
      }
      const overall=new Map();
      for(const group of grouped) for(const [pid,v] of group) add(overall,pid,v.qty);
      const leader=largest(overall);
      if(!leader)return "";
      const pid=leader[0], name=fuelName(pid);
      const [wk,we]=grouped.map(g=>g.get(pid));
      if(!wk?.tx||!we?.tx)return `O produto de maior volume nessa família foi ${name}. A seleção de dias não permite comparar os dois períodos.`;
      const pct=(g,v)=>pp(ratio(v.qty,[...g.values()].reduce((a,b)=>a+b.qty,0)));
      const ticketA=wk.sales/wk.tx,ticketB=we.sales/we.tx;
      const peak=v=>v.hours.indexOf(Math.max(...v.hours));
      const delta=growth(ticketB,ticketA);
      const diff=delta===null?"":Math.abs(delta)<0.0005?" (praticamente igual)":` (${pp(Math.abs(delta))} ${delta>0?"maior":"menor"})`;
      const basket=we.qty/we.tx-wk.qty/wk.tx;
      const reading=Math.abs(basket)<0.05?"O volume médio por abastecimento praticamente se manteve.":`Quem abasteceu com ${name} no fim de semana levou, em média, ${liters(Math.abs(basket))} a ${basket>0?"mais":"menos"} por compra.`;
      return `${reading} A participação de ${name} nos litros de ${family==="GASOLINA"?"gasolina":"diesel"} foi de ${pct(grouped[0],wk)} de segunda a sexta e ${pct(grouped[1],we)} no fim de semana. Nesse produto, o gasto médio passou de ${cash.format(ticketA)} para ${cash.format(ticketB)}${diff}. O preço médio por litro foi de ${cash.format(wk.sales/wk.qty)} e ${cash.format(we.sales/we.qty)}, respectivamente. A hora com mais registros foi ${peak(wk)}h nos dias úteis e ${peak(we)}h no fim de semana.`;
    }
    const gas=pattern("GASOLINA"),diesel=pattern("DIESEL");
    const actions={
      arco:"No centro, teste uma oferta de aditivada no horário de maior movimento da gasolina e acompanhe quantos abastecimentos mudam de produto.",
      glorimar:"Na área central, ajuste a cobertura ao pico da gasolina e acompanhe se o ticket e o tempo de espera mudam.",
      coracao:"Na região da academia, teste uma comunicação de pista no pico da gasolina e compare o resultado com o mesmo horário nas semanas anteriores.",
      flash:"Perto do shopping, teste a oferta de gasolina no pico do fim de semana e compare a participação da aditivada antes e depois.",
      jaburuna:"Na rodovia, teste reforço no atendimento do diesel no horário de maior movimento e acompanhe os litros por abastecimento.",
      sinha:"No bairro, teste uma oferta de retorno para o combustível mais comprado e acompanhe os resgates durante a semana.",
      teresina:"No fluxo de passagem, teste atendimento dedicado ao diesel no pico e observe a fila e o volume por abastecimento.",
      "boa-vizinhanca":"Teste uma oferta para o combustível que lidera no posto e compare o ticket com o mesmo dia e horário das semanas anteriores."
    };
    return fleet+portrait("Passantes",passText+scope,"")+
      (gas?portrait("Gasolina no posto",gas,""):"")+(diesel?portrait("Diesel no posto",diesel,""):"")+
      (rows.length?portrait("Ação sugerida",actions[unit.slug],""):"");
  }

  function drawObservations(s) {
    const single=s.units.length===1;
    get("actions").innerHTML=s.units.map(unit=>{
      const cards=observationsForUnit(unit,s.year,s.allMonths);
      return `<details class="observ-unit" ${single?"open":""}><summary>${html(unit.name)}</summary><div class="observ-cards">${cards}</div></details>`;
    }).join("");
  }

  function graphBox(container, labels, values, format, columns=false) {
    if(!values.some(Number.isFinite)) {
      container.innerHTML='<p class="muted">Sem datas no recorte.</p>';
      return;
    }
    const width=columns?380:590,height=165,left=70,right=14,top=19,bottom=30;
    const valid=values.filter(Number.isFinite);
    const min=Math.min(0,...valid);
    const max=Math.max(0,...valid);
    const domain=max-min||1;
    const x=i=>left+(width-left-right)*(i+.5)/values.length;
    const y=value=>top+(height-top-bottom)*(max-value)/domain;
    const baseline=y(0);
    function pointAttributes(i) {
      const label=`${labels[i]} · ${format(values[i])}`;
      return `data-point="${html(label)}" tabindex="0" aria-label="${html(label)}"`;
    }
    const dots=values.map((value,i)=>Number.isFinite(value)?
      columns?
        `<rect x="${x(i)-13}" y="${Math.min(y(value),baseline)}" width="26" height="${Math.max(Math.abs(y(value)-baseline),1)}" rx="3" fill="#52d9b5" ${pointAttributes(i)}><title>${html(format(value))}</title></rect>`:
        `<circle cx="${x(i)}" cy="${y(value)}" r="3.2" fill="#52d9b5" stroke="#101b2b" ${pointAttributes(i)}><title>${html(format(value))}</title></circle>`:"").join("");
    const path=values.map((v,i)=>Number.isFinite(v)?`${i===0||!Number.isFinite(values[i-1])?"M":"L"} ${x(i)} ${y(v)}`:"").join(" ");
    const ticks=[...new Set([Math.min(0,min),min+domain*.5,max])];
    const axes=ticks.map(t=>`<line x1="${left}" y1="${y(t)}" x2="${width-right}" y2="${y(t)}" stroke="#27394f"/><text x="${left-6}" y="${y(t)+4}" text-anchor="end">${html(format(t))}</text>`).join("");
    const legends=labels.map((label,i)=>columns||i%3===0?`<text x="${x(i)}" y="${height-7}" text-anchor="middle">${html(label)}</text>`:"").join("");
    container.innerHTML=`<svg class="pista-chart" viewBox="0 0 ${width} ${height}" role="group" aria-label="${columns?"Médias por dia":"Médias por hora"}">${axes}${legends}
      ${columns?"":`<path d="${path}" stroke="#52d9b5" fill="none" stroke-width="2"/>`}${dots}</svg>`;
    container.querySelectorAll("[data-point]").forEach(point=>{
      const show=()=>{get("point").textContent=point.dataset.point;};
      for(const event of ["pointerenter","focus","click"])point.addEventListener(event,show);
    });
  }

  function drawPatterns(s) {
    if(!s)return;
    const metric=get("chart-metric").value||"qty";
    const format=value=>metric==="lube"?liters(value):metric==="qty"?qtyFormat(s.group,value):cash.format(value);
    const {grid,dayCounts}=s.time;
    const totalDays=dayCounts.reduce((a,b)=>a+b,0);
    const hours=sequence(24).map(hour=>totalDays?grid.reduce((sum,day)=>sum+day[hour][metric],0)/totalDays:null);
    const days=grid.map((day,index)=>dayCounts[index]?day.reduce((sum,h)=>sum+h[metric],0)/dayCounts[index]:null);
    const hourLabels=sequence(24).map(h=>`${String(h).padStart(2,"0")}h`);
    graphBox(get("hours"),hourLabels,hours,format);
    graphBox(get("week"),shortDays,days,format,true);
    if(hours.some(Number.isFinite)) {
      const peak=hours.indexOf(Math.max(...hours.filter(Number.isFinite)));
      get("point").textContent=`Maior média horária no recorte · ${hourLabels[peak]} · ${format(hours[peak])}`;
    } else get("point").textContent="";
    const heat=grid.map((day,d)=>day.map(h=>dayCounts[d]?h[metric]/dayCounts[d]:null));
    const heatMax=Math.max(1,...heat.flat().filter(Number.isFinite).map(Math.abs));
    get("heat").innerHTML=`<table class="pista-heat" aria-label="Médias por dia e hora"><thead>${tableHead(["Dia",...hourLabels])}</thead><tbody>
      ${heat.map((day,d)=>`<tr><th scope="row">${shortDays[d]}</th>${day.map((value,h)=>{
        const label=`${weekdays[d]} · ${hourLabels[h]} · ${value===null?"sem datas":format(value)}`;
        const color=value===null?"transparent":value<0?`rgb(255 130 130 / ${.07+.85*Math.abs(value)/heatMax})`:`rgb(83 204 176 / ${.06+.86*value/heatMax})`;
        return `<td><button type="button" style="--heat:${color}" data-point="${html(label)}" title="${html(label)}" aria-label="${html(label)}" ${value===null?"disabled":""}></button></td>`;
      }).join("")}</tr>`).join("")}</tbody></table>`;
    get("heat").querySelectorAll("button:not(:disabled)").forEach(button=>{
      const show=()=>{get("point").textContent=button.dataset.point;};
      for(const event of ["focus","pointerenter","click"])button.addEventListener(event,show);
    });
    get("monthly-head").innerHTML=tableHead(["Mês",get("chart-metric").selectedOptions[0].textContent+` · ${s.year}`,"2025 comparável","2026 comparável","Δ 2026/25"]);
    get("monthly").innerHTML=s.allMonths.map(m=>{
      const paired=s.units.some(u=>u.common.includes(m));
      const base=s.base.months[m][metric],now=s.now.months[m][metric];
      const activity=s.units.some(u=>u.time.dates[m].some(Boolean));
      return tableRow(monthLabels[m],[
        activity?format(s.time.months[m][metric]):"—",paired?format(base):"—",paired?format(now):"—",paired?signed(growth(now,base),pp):"—"
      ]);
    }).join("");
  }

  function drawABC(s) {
    if(!s)return;
    const by=get("abc-metric").value;
    const rows=[...s.time.products].sort((a,b)=>b[1][by]-a[1][by]||catalog.products[a[0]][1].localeCompare(catalog.products[b[0]][1],"pt-BR"));
    const total=rows.reduce((a,[,row])=>a+Math.max(0,row[by]),0);
    const headers=["Produto","Classe",s.group===0?"Litros":"Unidades","Faturamento","Lucro bruto","Margem","% acumulado"];
    if(s.group===1)headers.splice(3,0,"Código","Litros convertidos","Embalagem (L)","Vínculo");
    if(s.group===0)headers.splice(6,0,"Lucro bruto/L");
    get("abc-head").innerHTML=tableHead(headers);
    let accumulated=0;
    get("abc").innerHTML=rows.length?rows.map(([id,row])=>{
      const [,name,capacity,source,code]=catalog.products[id];
      const basis=row[by];
      const before=total>0?accumulated/total:0;
      const klass=total<=0||basis<=0?"—":before<.8?"A":before<.95?"B":"C";
      if(basis>0)accumulated+=basis;
      const values=[klass,qtyFormat(catalog.products[id][0],row.qty),cash.format(row.sales),cash.format(row.profit),pp(ratio(row.profit,row.sales)),klass==="—"?"—":pp(ratio(accumulated,total))];
      if(s.group===1)values.splice(2,0,code||"—",capacity?liters(row.lube):"—",capacity?number.format(capacity):"—",source);
      if(s.group===0)values.splice(5,0,row.qty>0?cash.format(row.profit/row.qty):"—");
      return tableRow(name,values);
    }).join(""):`<tr><td colspan="${headers.length}" class="muted">Sem produtos com registros no recorte.</td></tr>`;
    if(s.group===1) {
      const v=s.time.totals;
      get("pack-note").textContent=v.packs>0?
        `${number.format(v.mapped)} de ${number.format(v.packs)} unidades convertidas (${pp(ratio(v.mapped,v.packs))}). ${number.format(v.packs-v.mapped)} unidades seguem sem volume em litros por falta de vínculo por código.`:
        "Nenhuma unidade de lubrificante no recorte.";
    } else get("pack-note").textContent="";
  }

  function render() {
    if(!current||current.store!==get("store").value)return;
    const s=state=prepare();
    const days=s.time.dayCounts.reduce((a,b)=>a+b,0);
    const shop=s.units.length===1?s.units[0].name:`Todos os postos · ${s.units.length} unidades`;
    get("context").textContent=`${shop} · ${s.year} · ${integer.format(days)} datas na base · ${[...selectedGroups].map(g=>catalog.groups[g]).join(", ")||"Nenhuma categoria"}`;
    drawKpis(s);
    drawUnits(s);
    drawSegments(s);
    drawObservations(s);
    drawPatterns(s);
    drawABC(s);
    drawExtra(s);
  }

  function detailRows(slug,year,product) {
    return detail.units[slug][year].rows.filter(([m,d,,p])=>selectedMonths.has(m)&&selectedDays.has(d)&&product(p));
  }
  function detailDays(slug,year,day) {
    return detail.units[slug][year].days.reduce((n,ds,m)=>n+(selectedMonths.has(m)?ds.reduce((a,v,d)=>a+(selectedDays.has(d)&&(day===undefined||day===d)?v:0),0):0),0);
  }
  function drawExtra(s) {
    const otto=new Set(catalog.products.flatMap(([g,name],i)=>g===0&&/GASOLINA|ETANOL/.test(name)?[i]:[]));
    const sums=year=>s.allMonths.map(m=>s.units.reduce((total,u)=>total+detailRows(u.slug,year,p=>otto.has(p)).filter(r=>r[0]===m).reduce((v,r)=>v+r[4],0),0));
    const older=sums(2025), newer=sums(2026), shown=s.year===2026?newer:older;
    graphBox(get("otto-chart"),s.allMonths.map(m=>monthLabels[m]),shown,liters);
    get("otto-head").innerHTML=tableHead(["Mês","Otto · 2025","Otto · 2026","Δ 2026/25 · meses completos","Gasolinas · "+s.year,"Etanol · "+s.year]);
    get("otto").innerHTML=s.allMonths.map((m,i)=>{
      const units=s.units.filter(u=>u.common.includes(m));
      const amount=(year,predicate,chosen)=>chosen.reduce((sum,u)=>sum+detailRows(u.slug,year,predicate).filter(r=>r[0]===m).reduce((v,r)=>v+r[4],0),0);
      return tableRow(monthLabels[m],[liters(older[i]),liters(newer[i]),units.length?signed(growth(amount(2026,p=>otto.has(p),units),amount(2025,p=>otto.has(p),units)),pp):"—",liters(amount(s.year,p=>otto.has(p)&&/GASOLINA/.test(catalog.products[p][1]),s.units)),liters(amount(s.year,p=>otto.has(p)&&/ETANOL/.test(catalog.products[p][1]),s.units))]);
    }).join("");
    get("profiles").innerHTML=s.units.map(u=>{
      const rows=detailRows(u.slug,s.year,p=>p>=0&&catalog.products[p][0]===0), total=detailRows(u.slug,s.year,p=>p===-1);
      const volume=total.reduce((a,r)=>a+r[4],0), sales=total.reduce((a,r)=>a+r[5],0), transactions=total.reduce((a,r)=>a+r[6],0);
      if(!transactions)return portrait(u.name,"Sem abastecimentos no recorte.","Amplie os meses e dias selecionados.");
      const mix=new Map();for(const r of rows)mix.set(r[3],(mix.get(r[3])||0)+r[4]);
      const rank=[...mix].sort((a,b)=>b[1]-a[1]);
      const visits=new Map();
      for(const r of rows){if(!visits.has(r[3]))visits.set(r[3],{count:0,sales:0});const v=visits.get(r[3]);v.count+=r[6];v.sales+=r[5];}
      const frequent=[...visits].sort((a,b)=>b[1].count-a[1].count)[0];
      const hours=sequence(24).map(h=>total.filter(r=>r[2]===h).reduce((a,r)=>a+r[6],0)/Math.max(1,detailDays(u.slug,s.year)));
      const days=sequence(7).map(d=>detailDays(u.slug,s.year,d)?total.filter(r=>r[1]===d).reduce((a,r)=>a+r[6],0)/detailDays(u.slug,s.year,d):0);
      const hour=hours.indexOf(Math.max(...hours)), day=days.indexOf(Math.max(...days));
      const gas=rows.filter(r=>/GASOLINA/.test(catalog.products[r[3]][1])).reduce((a,r)=>a+r[4],0), ethanol=rows.filter(r=>/ETANOL/.test(catalog.products[r[3]][1])).reduce((a,r)=>a+r[4],0);
      const summary=`O combustível mais frequente nas transações é ${catalog.products[frequent[0]][1]}, com ${integer.format(frequent[1].count)} registros e ticket médio de ${cash.format(frequent[1].sales/frequent[1].count)} nesse combustível. ${catalog.products[rank[0][0]][1]} lidera com ${pp(ratio(rank[0][1],volume))} dos litros. Gasolinas somam ${pp(ratio(gas,volume))}, etanol ${pp(ratio(ethanol,volume))} e diesel ${pp(ratio(volume-gas-ethanol,volume))}. Ticket médio de ${cash.format(sales/transactions)} e ${liters(volume/transactions)} por transação de combustível.`;
      return portrait(u.name,summary,`${integer.format(transactions)} transações. Maior média horária às ${String(hour).padStart(2,"0")}h (${number.format(hours[hour])} transações/dia). ${weekdays[day]} tem a maior média diária (${number.format(days[day])} transações). Médias divididas pelas datas observadas, incluindo dias sem movimento no horário.`);
    }).join("");
    drawTrocas(s);
  }
  function drawTrocas(s) {
    const record=(u,y)=>trocas.units[u.slug][y];
    const read=(u,y,category)=>record(u,y).rows.filter(([m,d,,g])=>selectedMonths.has(m)&&selectedDays.has(d)&&g===category);
    const amount=(u,y,category,field=6)=>read(u,y,category).reduce((n,r)=>n+r[field],0);
    const metric=Number(get("trocas-category").value);
    get("trocas-kpis").closest("section").querySelectorAll(".chart-pair, #pista-trocas-heat").forEach(node=>node.hidden=!s.units.some(u=>record(u,s.year).identified));
    const available=s.units.filter(u=>record(u,s.year).identified);
    const totalDays=available.reduce((n,u)=>n+detailDays(u.slug,s.year),0);
    const rows=available.flatMap(u=>read(u,s.year,metric));
    const transactions=rows.reduce((n,r)=>n+r[6],0),sales=rows.reduce((n,r)=>n+r[5],0);
    const lube=available.reduce((n,u)=>n+amount(u,s.year,1,7),0),packs=available.reduce((n,u)=>n+amount(u,s.year,1,4),0),mapped=available.reduce((n,u)=>n+amount(u,s.year,1,8),0);
    get("trocas-kpis").innerHTML=[cell("Transações da Troca",integer.format(transactions),get("trocas-category").selectedOptions[0].textContent),cell("Transações por dia",totalDays?number.format(transactions/totalDays):"—","Por unidade e data observada"),cell("Ticket médio da Troca",transactions?cash.format(sales/transactions):"—","Faturamento ÷ IDs de venda distintos"),cell("Lubrificantes em litros",liters(lube),`${number.format(mapped)} de ${number.format(packs)} unidades com conversão por código`)].join("");
    get("trocas-status").innerHTML=s.units.map(u=>{
      const valid=record(u,s.year).identified;
      const pair=record(u,2025).identified&&record(u,2026).identified;
      const common=(y)=>read(u,y,-1).filter(r=>u.common.includes(r[0])).reduce((n,r)=>n+r[6],0);
      return tableRow(u.name,[valid?(u.slug==="jaburuna"?"Filtros · todos os registros":u.slug==="glorimar"?"Troca consolidada":"Troca"):"Unidade sem Troca",... [1,2,3].map(g=>valid?(u.slug==="jaburuna"&&g!==3?"—":integer.format(amount(u,s.year,g))):"—"),valid?integer.format(amount(u,s.year,-1)):"—",pair&&u.common.length?signed(growth(common(2026),common(2025)),pp):"—"]);
    }).join("");
    const hours=sequence(24).map(h=>totalDays?rows.filter(r=>r[2]===h).reduce((n,r)=>n+r[6],0)/totalDays:null);
    const week=sequence(7).map(d=>{const dates=available.reduce((n,u)=>n+detailDays(u.slug,s.year,d),0);return dates?rows.filter(r=>r[1]===d).reduce((n,r)=>n+r[6],0)/dates:null;});
    graphBox(get("trocas-hours"),sequence(24).map(h=>`${h}h`),hours,v=>number.format(v));graphBox(get("trocas-week"),shortDays,week,v=>number.format(v),true);
    get("trocas-head").innerHTML=tableHead(["Mês","Transações · 2025","Transações · 2026","Δ 2026/25*","Lubrificantes · "+s.year,"Automotivos · "+s.year,"Filtros · "+s.year,"Total sem duplicar · "+s.year]);
    get("trocas-months").innerHTML=s.allMonths.map(m=>{
      const sum=(y,g,chosen=s.units)=>chosen.reduce((n,u)=>n+read(u,y,g).filter(r=>r[0]===m).reduce((a,r)=>a+r[6],0),0);
      const paired=s.units.filter(u=>record(u,2025).identified&&record(u,2026).identified&&u.common.includes(m));
      return tableRow(monthLabels[m],[integer.format(sum(2025,metric)),integer.format(sum(2026,metric)),paired.length?signed(growth(sum(2026,metric,paired),sum(2025,metric,paired)),pp):"—",...[1,2,3,-1].map(g=>integer.format(sum(s.year,g)))]);
    }).join("");
    get("trocas-heat").innerHTML='<table class="pista-table">'+tableHead(["Dia",...sequence(24).map(h=>`${h}h`)])+"<tbody>"+sequence(7).map(d=>{const dates=available.reduce((n,u)=>n+detailDays(u.slug,s.year,d),0);return tableRow(shortDays[d],sequence(24).map(h=>dates?number.format(rows.filter(r=>r[1]===d&&r[2]===h).reduce((n,r)=>n+r[6],0)/dates):"—"));}).join("")+"</tbody></table>";
  }

  return {activate};
})();
