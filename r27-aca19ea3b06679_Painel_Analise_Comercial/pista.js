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
  let detail, trocas, compras, trocasDiarias;

  function data(file) {
    if (elements.has(file)) return elements.get(file);
    const pending=fetch(`${file}.json?v=${file==="pista-trocas"?"troca-p75":"20261118-pista2"}`).then(response=>{
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
    get("trocas-measure").addEventListener("change",()=>drawTrocas(state));
    get("trocas-category").addEventListener("change",()=>drawTrocas(state));
    ready=true;
  }

  async function activate() {
    if (ready) return;
    try {
      [catalog,detail,trocas,compras,trocasDiarias]=await Promise.all([data("pista-index"),data("pista-detail"),data("pista-trocas"),data("pista-compras"),data("pista-trocas-diarias")]);
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
  function pricePattern(rows,pid,weights,weekend) {
    // Pair cheaper and dearer dates within the same month and weekday.
    const strata=new Map();
    for(const [m,d,p,q,v,n] of rows) {
      if(p!==pid||!weights.has(m)||Number(d>=5)!==weekend||!selectedDays.has(d)||q<=0||n<=0)continue;
      const k=m*7+d;
      if(!strata.has(k))strata.set(k,[]);
      strata.get(k).push({price:v/q,n});
    }
    let pairs=0,spread=0,lowCount=0,highCount=0;
    for(const days of strata.values()){
      days.sort((a,b)=>a.price-b.price);
      for(let i=0;i<Math.floor(days.length/2);i++){
        const a=days[i],b=days[days.length-1-i];
        if(b.price-a.price<0.01)continue;
        pairs++;spread+=b.price-a.price;lowCount+=a.n;highCount+=b.n;
      }
    }
    if(pairs<6||!highCount)return "";
    const delta=(lowCount-highCount)/highCount;
    const movement=Math.abs(delta)<0.01?"o número de abastecimentos ficou praticamente igual":`houve ${pp(Math.abs(delta))} ${delta>0?"mais":"menos"} abastecimentos`;
    return ` Nos dias em que o litro saiu em média ${number.format(100*spread/pairs)} centavos mais barato, ${movement}. A comparação reúne ${pairs} pares de datas do mesmo mês e dia da semana.`;
  }

  function passantePeriods(unit,year,weights,excluded){
    const periods=["Meio de semana","Final de semana"].map(title=>({title,days:0,total:0,tx:0,mixed:0,fuels:new Map()}));
    const receipt=compras[unit.slug+"-"+year];
    for(const m of weights.keys())for(const d of selectedDays)
      periods[Number(d>=5)].days+=detail.units[unit.slug][year].days[m][d];
    for(const [m,d,h,p,q,v,n] of detailRows(unit.slug,year,()=>true)){
      if(!weights.has(m))continue;
      const group=periods[Number(d>=5)];
      if(p===-1){group.tx+=n;continue;}
      if(!weights.get(m).has(p))continue;
      if(!group.fuels.has(p))group.fuels.set(p,{pid:p,liters:0,qty:0,value:0,tx:0,hours:Array(24).fill(0)});
      const f=group.fuels.get(p),estimated=q*weights.get(m).get(p);
      f.liters+=estimated;group.total+=estimated;f.qty+=q;f.value+=v;f.tx+=n;if(h>=0)f.hours[h]+=n;
    }
    for(const [m,d,p,n] of receipt.basket)if(p===-1&&weights.has(m)&&selectedDays.has(d))periods[Number(d>=5)].mixed+=n;
    const fuel=p=>fuelLabel(catalog.products[p][1]);
    const cards=periods.map((g,k)=>{
      const other=periods[1-k];
      if(!g.days||g.total<=0)return {title:g.title,profile:"Sem volume conciliado para este período nos filtros selecionados.",action:"Amplie o recorte para avaliar esta ocasião."};
      const sorted=[...g.fuels.values()].filter(f=>f.liters>0&&f.tx>0).sort((a,b)=>b.liters-a.liters);
      const lead=sorted[0];if(!lead)return {title:g.title,profile:"Sem abastecimentos identificados.",action:"Amplie o recorte para avaliar esta ocasião."};
      const share=f=>f.liters/g.total,otherShare=f=>(other.fuels.get(f.pid)?.liters||0)/other.total;
      const diff=f=>share(f)-otherShare(f);
      const material=sorted.filter(f=>share(f)>=.10);
      const contrast=other.total>0&&material.length?material.reduce((a,b)=>diff(b)>diff(a)?b:a):lead;
      const f=other.total>0&&diff(contrast)>=.02?contrast:lead;
      const name=fuel(f.pid),hour=f.hours.indexOf(Math.max(...f.hours)),size=f.qty/f.tx;
      let profile=`O combustível que lidera entre os passantes é ${fuel(lead.pid)} (${pp(share(lead))} dos litros estimados).`;
      if(f!==lead)profile+=` A participação de ${name} sobe para ${pp(share(f))} dos litros neste período, frente a ${pp(otherShare(f))} no outro.`;
      else if(other.total>0)profile+=` No outro período, esse combustível representa ${pp(otherShare(f))}.`;
      if(unit.slug==="jaburuna"&&name.startsWith("diesel")&&size>=50)profile+=" Na rodovia, o tamanho do abastecimento é compatível com uma parada de veículo pesado.";
      else if(name.includes("gasolina")&&size<10)profile+=" O tamanho da compra sugere uma parada para completar poucos litros.";
      profile+=` Na pista inteira, a compra de ${name} nesse período dá em média ${liters(size)} (${cash.format(f.value/f.tx)}), com mais cupons às ${hour}h.`;
      const alt=other.fuels.get(f.pid);
      if(alt?.tx&&alt.qty>0&&f.qty>0){const price=f.value/f.qty-alt.value/alt.qty;if(Math.abs(price)>=.01)profile+=` O litro sai ${number.format(Math.abs(price)*100)} centavos ${price>0?"mais caro":"mais barato"} que no outro período.`;}
      if(unit.slug==="boa-vizinhanca"){
        const gas=sorted.filter(x=>fuel(x.pid).includes("gasolina"));
        const premium=gas.find(x=>fuel(x.pid).includes("aditivada"));
        if(premium)profile+=` Entre as gasolinas, a aditivada representa ${pp(premium.liters/gas.reduce((n,x)=>n+x.liters,0))} dos litros estimados de passagem.`;
      }
      profile+=pricePattern(receipt.daily,f.pid,weights,k);
      let action=name.startsWith("diesel")?`Organize o atendimento de ${name} antes das ${hour}h e acompanhe litros por parada e lucro por litro.`:
        name.includes("aditivada")?`Aproveite a procura por ${name} às ${hour}h e acompanhe sua participação nas gasolinas e a margem por litro.`:
        `Priorize o atendimento de ${name} no pico das ${hour}h. Teste a oferta de um automotivo durante o abastecimento e acompanhe os cupons conjuntos.`;
      if(!k&&name.includes("gasolina")&&!name.includes("aditivada"))
        action=`Concentre o atendimento da ${name} às ${hour}h e registre cupons por hora e litros por compra para avaliar a cobertura do pico.`;
      if(g.tx&&g.mixed)action+=` Hoje, 1 em cada ${integer.format(g.tx/g.mixed)} cupons de combustível da unidade inclui um automotivo nesse período.`;
      return {title:g.title,profile,action};
    });
    const card=(title,key,note="")=>`<article class="portrait"><h3>${html(title)}</h3>${cards.map(c=>`<p><strong>${html(c.title)}</strong> · ${html(c[key])}</p>`).join("")}${note?`<p class="evidence">${html(note)}</p>`:""}</article>`;
    const note=excluded.length?"Meses excluídos da estimativa por cobertura ou conciliação: "+excluded.join(", ")+".":"";
    return card("Perfil Clientes Passantes","profile",note)+card("Sugestões para esses clientes","action");
  }
  function observationsForUnit(unit,year,months) {
    const portfolio=new Map(),weights=new Map(),accounts=new Map(),excluded=[];
    const add=(map,k,v)=>map.set(k,(map.get(k)||0)+v);
    for(const m of months) {
      const record=unit[year][m];
      if(!record.days.some(Boolean))continue;
      const remaining=new Map(record.fuel);
      for(const [,idx,pid,qty] of record.clients) {
        add(portfolio,pid,qty);add(remaining,pid,-qty);
        const name=keyText(current.names[year][idx]).trim();
        if(!accounts.has(name))accounts.set(name,{months:new Set(),qty:0});
        const account=accounts.get(name);
        if(qty>0)account.months.add(m);
        account.qty+=qty;
      }
      if(!record.complete||!record.clients.length||[...remaining.values()].some(n=>n<0))excluded.push(monthLabels[m]);
      else {
        const monthly=new Map(record.fuel);
        weights.set(m,new Map([...remaining].filter(([pid])=>monthly.get(pid)>0).map(([pid,qty])=>[pid,qty/monthly.get(pid)])));
      }
    }
    const total=map=>[...map.values()].reduce((a,b)=>a+b,0);
    const fuel=pid=>fuelLabel(catalog.products[pid][1]);
    const lead=largest(portfolio);
    const fleetVolume=total(portfolio);
    const repeat=[...accounts.values()].filter(a=>a.months.size>=2).reduce((n,a)=>n+a.qty,0);
    const dieselShare=map=>[...map].reduce((a,[p,q])=>a+(fuel(p).startsWith("diesel")?q:0),0)/total(map);
    let fleet="Sem compras de carteira identificadas nos meses selecionados.",retain="Amplie o período para identificar contas recorrentes.";
    if(lead){
      const diesel=dieselShare(portfolio),dominant=fuel(lead[0]);
      fleet=`A carteira ${diesel>.7?"tem perfil de operação a diesel":diesel<.3?"se concentra em veículos de ciclo Otto":"reúne operações a diesel e abastecimentos de veículos leves"}. O produto mais comprado é ${dominant}, com ${pp(lead[1]/fleetVolume)} dos litros.`;
      if(months.length>1)fleet+=` Quem comprou em pelo menos dois meses responde por ${pp(repeat/fleetVolume)} do volume.`;
      const topThree=[...accounts.values()].sort((a,b)=>b.qty-a.qty).slice(0,3);
      if(accounts.size>3)fleet+=` Os três maiores cadastros concentram ${pp(topThree.reduce((n,a)=>n+a.qty,0)/fleetVolume)} dos litros da carteira.`;
      const common=months.filter(m=>unit[2025][m].complete&&unit[2026][m].complete);
      const volume=y=>common.reduce((n,m)=>n+unit[y][m].clients.reduce((a,r)=>a+r[3],0),0);
      const change=growth(volume(2026),volume(2025));
      retain=`Priorize ${diesel>.65?"frotas que precisam de diesel para rodar com regularidade":diesel<.3?"empresas com equipes em veículos leves":"contas com veículos leves e pesados"} e use o consumo mensal de ${dominant} para dimensionar a proposta.`;
      if(change!==null)retain+=` Nos meses completos comparáveis, o volume da carteira ${change<0?"caiu":"cresceu"} ${pp(Math.abs(change))} em 2026. ${change<0?"Comece pelos cadastros recorrentes que reduziram litros.":"Procure contas semelhantes às que ampliaram os pedidos."}`;
    }
    return portrait("Perfil Clientes/Frotistas",fleet,"")+portrait("Sugestões para esses clientes",retain,"")+passantePeriods(unit,year,weights,excluded);
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
    showQuarterPlans(get("plan"),"pista",s.units.map(u=>[u.slug,u.name]));
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
  function dailyP75(counts, dates) {
    const values=counts.concat(Array(dates-counts.length).fill(0)).sort((a,b)=>a-b);
    const rank=0.75*(dates-1);
    const lower=values[Math.floor(rank)], upper=values[Math.ceil(rank)];
    return lower+(upper-lower)*(rank-Math.floor(rank));
  }

  function drawTrocaMap(s,units,metric) {
    const map=get("trocas-p75"), scale=get("trocas-p75-scale");
    if(!units.length){
      map.textContent="Unidade sem Troca no recorte.";
      scale.replaceChildren();
      return;
    }
    const field=metric===-1?2:metric+2;
    const columns=units.map(({slug,name})=>{
      const applicable=slug!=="jaburuna"||metric===-1||metric===3;
      const days=sequence(7).map(()=>[]);
      for(const row of trocasDiarias[slug][s.year]){
        if(selectedMonths.has(row[0])&&selectedDays.has(row[1]))days[row[1]].push(row[field]);
      }
      const cells=days.map((counts,d)=>{
        const dates=detailDays(slug,s.year,d);
        const value=applicable&&dates?dailyP75(counts,dates):null;
        return {value,dates};
      });
      return {name,applicable,cells};
    });
    const peak=Math.max(0,...columns.flatMap(col=>col.cells.map(cell=>cell.value??0)));
    const body=shortDays.map((day,d)=>`<tr><th scope="row">${day}</th>${columns.map(col=>{
      const {value,dates}=col.cells[d];
      if(value===null)return `<td title="${col.applicable?"Sem datas observadas":"Jaburuna registra apenas filtros"}">—</td>`;
      const t=peak?value/peak:0;
      const color=[185+50*t,226-143*t,255-168*t].map(Math.round).join(" ");
      const label=`${col.name} · ${weekdays[d]} · P75: ${number.format(value)} transações por dia · ${dates} datas observadas`;
      return `<td style="background:rgb(${color});color:#101b2b" title="${html(label)}">${number.format(value)}</td>`;
    }).join("")}</tr>`).join("");
    map.innerHTML=`<table class="pista-heat troca-heat" aria-labelledby="pista-trocas-p75-title"><thead>${tableHead(["Dia",...columns.map(col=>col.name)])}</thead><tbody>${body}</tbody></table>`;
    const hasValues=columns.some(col=>col.cells.some(cell=>cell.value!==null));
    const legend=peak?`0 <span class="troca-gradient" aria-hidden="true"></span> ${number.format(peak)} transações por dia (maior P75 do recorte)`:hasValues?"P75 igual a zero nas células observadas.":"Sem observações para a seleção.";
    scale.innerHTML=legend+" · — sem datas ou categoria não aplicável";
  }

  function drawTrocas(s) {
    const record=(u,y)=>trocas.units[u.slug][y];
    const read=(u,y,category)=>record(u,y).rows.filter(([m,d,,g])=>selectedMonths.has(m)&&selectedDays.has(d)&&g===category);
    const amount=(u,y,category,field=6)=>read(u,y,category).reduce((n,r)=>n+r[field],0);
    const metric=Number(get("trocas-category").value);
    get("trocas-kpis").closest("section").querySelectorAll(".chart-pair, #pista-trocas-heat").forEach(node=>node.hidden=!s.units.some(u=>record(u,s.year).identified));
    const available=s.units.filter(u=>record(u,s.year).identified);
    drawTrocaMap(s,available,metric);
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
    const quantity=get("trocas-measure").value==="qty";
    const categories=[
      {group:1,field:7,label:"Lubrificantes (L)"},
      {group:2,field:4,label:"Automotivos (un.)"},
      {group:3,field:4,label:"Filtros (un.)"}
    ];
    const series=quantity?categories.filter(c=>metric===-1||c.group===metric):
      [{group:metric,field:6,label:"Transações"}];
    const hourLabels=sequence(24).map(h=>h+"h");
    const axes=["hours","week"];
    for(const axis of axes)get("trocas-"+axis).replaceChildren();
    const matrices=series.map(({group,field,label})=>{
      const grid=sequence(7).map(()=>Array(24).fill(0));
      const dates=sequence(7).map(d=>available.reduce((sum,u)=>sum+detailDays(u.slug,s.year,d),0));
      for(const u of available)for(const row of read(u,s.year,group)){
        if(row[2]>=0)grid[row[1]][row[2]]+=row[field];
      }
      const daily=grid.map((day,d)=>dates[d]?day.reduce((a,b)=>a+b,0)/dates[d]:null);
      const hourly=sequence(24).map(h=>totalDays?grid.reduce((a,day)=>a+day[h],0)/totalDays:null);
      for(const axis of axes){
        const container=get("trocas-"+axis);
        const title=document.createElement("p");title.textContent=label;container.append(title);
        const chart=document.createElement("div");container.append(chart);
        graphBox(chart,axis==="hours"?hourLabels:shortDays,axis==="hours"?hourly:daily,v=>number.format(v),axis==="week");
      }
      return '<table class="pista-table"><caption>'+html(label)+' por dia observado</caption><thead>'+tableHead(["Dia",...hourLabels])+'</thead><tbody>'+sequence(7).map(d=>tableRow(shortDays[d],grid[d].map(v=>dates[d]?number.format(v/dates[d]):"—"))).join("")+"</tbody></table>";
    });
    get("trocas-heat").innerHTML=matrices.join("");
    get("trocas-head").innerHTML=tableHead(["Mês","Transações · 2025","Transações · 2026","Δ 2026/25*","Lubrificantes · "+s.year,"Automotivos · "+s.year,"Filtros · "+s.year,"Total sem duplicar · "+s.year]);
    get("trocas-months").innerHTML=s.allMonths.map(m=>{
      const sum=(y,g,chosen=s.units)=>chosen.reduce((n,u)=>n+read(u,y,g).filter(r=>r[0]===m).reduce((a,r)=>a+r[6],0),0);
      const paired=s.units.filter(u=>record(u,2025).identified&&record(u,2026).identified&&u.common.includes(m));
      return tableRow(monthLabels[m],[integer.format(sum(2025,metric)),integer.format(sum(2026,metric)),paired.length?signed(growth(sum(2026,metric,paired),sum(2025,metric,paired)),pp):"—",...[1,2,3,-1].map(g=>integer.format(sum(s.year,g)))]);
    }).join("");

  }

  return {activate};
})();
