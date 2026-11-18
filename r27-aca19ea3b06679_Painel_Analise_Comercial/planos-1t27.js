"use strict";
const quarterPlans={
  loja:{
    arco:[
      ["Aproveitar a passagem pelo caixa à noite","De segunda a sexta, cigarros aparecem em 38,6% dos cupons. Das 19h às 22h, teste a exposição de Baton no caixa e conte os cupons conjuntos e o lucro por cupom."],
      ["Abastecer a geladeira antes da virada","Prepare Heineken long neck antes da meia-noite de sexta e sábado para atender a faixa de 0h a 3h de sábado e domingo. Registre faltas e vendas por madrugada."],
      ["Medir o resultado da madrugada","Compare fins de semana com e sem a reposição antecipada. Mantenha o volume de reposição que ampliar o faturamento preservando a margem de referência de 39,2% das geladas nessa faixa."]
    ],
    coracao:[
      ["Acertar o lote de salgados da tarde","Prepare salgados antes das 16h nos dias úteis e faça uma segunda fornada conforme a saída até as 19h. Registre unidades vendidas, sobras e lucro do lote."],
      ["Testar o acompanhamento do lanche","Ofereça Delrio Guaraná de 250 ml com Food nos dias úteis. A bebida já aparece em 6,7% desses cupons. Compare adesão e margem antes e depois."],
      ["Cobrir a procura por geladas na virada","Antecipe a reposição de Brahma Chopp de 350 ml para a faixa de 0h a 3h do sábado e do domingo. Acompanhe faltas, faturamento e margem das geladas nessa faixa."]
    ],
    flash:[
      ["Servir o lanche antes das 7h","Prepare um primeiro lote de salgados para o pico das 7h às 10h, de segunda a sexta. Conte as vendas por lote e o descarte ao fim da manhã."],
      ["Testar bebida com o salgado","Nos dias úteis, Delrio Guaraná de 250 ml aparece em 12,9% dos cupons com Food. Exponha os dois juntos e compare o lucro bruto e o gasto médio por cupom com Food."],
      ["Repor geladas antes das 14h","Aos sábados e domingos, abasteça a geladeira de Skol de 350 ml antes do pico das 14h às 17h. Meça faturamento por tarde, ruptura e margem, cuja referência na faixa é 32,6%."]
    ],
    glorimar:[
      ["Dimensionar o balcão da manhã","Faça o primeiro lote de salgados antes das 7h nos dias úteis e ajuste a reposição até as 10h pelas vendas e sobras. Acompanhe a margem de Food frente aos 36,7% da faixa."],
      ["Preparar o estoque do início da noite","Aos sábados e domingos, geladas aparecem em 27,4% dos cupons. Reponha Budweiser de 350 ml antes das 18h e confira as faltas até as 21h."],
      ["Conferir o ganho por canal","No pico de geladas do fim de semana, registre separadamente balcão e delivery. Compare faturamento, margem bruta e contribuição após taxas antes de ampliar a oferta em cada canal."]
    ],
    jaburuna:[
      ["Preparar água para a parada da tarde","Na sexta, antecipe a reposição de água mineral de 500 ml para as 14h. Conte as vendas e as faltas até as 17h e compare com sextas equivalentes."],
      ["Testar o lanche com a bebida","Ofereça salgados SDMais a quem leva bebida sem álcool na sexta. Eles já aparecem em 27,0% desses cupons. Acompanhe venda conjunta, lucro por cupom e sobras."],
      ["Atender a compra para levar no fim de semana","Reponha Heineken long neck antes das 17h aos sábados e domingos. Até as 20h, acompanhe receita e margem das geladas e teste a sugestão de salgados, já presentes em 10,8% dos cupons da categoria nesse período da semana."]
    ],
    sinha:[
      ["Organizar o caixa no fim da tarde","Cigarros aparecem em 40,6% dos cupons de segunda a sexta. Confira a disponibilidade de Roth Blue Global antes das 17h e acompanhe faltas e lucro por cupom até as 20h."],
      ["Repor Brahma e gelo antes das 18h","Prepare a geladeira para o pico das 18h às 21h do fim de semana. Teste oferecer gelo com geladas e compare o resultado com os 2,4% de cupons conjuntos observados."],
      ["Proteger a margem das geladas por canal","A referência da faixa de fim de semana é 23,3% de margem bruta. Separe balcão e delivery no fechamento e revise a exposição dos itens que mais deixam contribuição após taxas."]
    ],
    teresina:[
      ["Garantir água gelada no início da tarde","Durante a semana, bebidas sem álcool entram em 42,3% dos cupons. Reponha Viena de 510 ml antes das 13h e registre faltas até as 16h."],
      ["Associar o lanche à compra de bebida","Teste a oferta de salgados SDMais com bebidas sem álcool nos dias úteis. Acompanhe o lucro por cupom e a adesão frente aos 4,8% observados."],
      ["Antecipar a reposição do almoço","Para sábado e domingo, deixe Heineken long neck pronta antes das 12h. Compare o faturamento das geladas entre 12h e 15h e preserve a margem de referência de 42,3%."]
    ]
  },
  pista:{
    arco:[
      ["Recuperar litros da carteira","O volume da carteira caiu 47,8% nos meses completos comparáveis. Ordene os cadastros pela perda em litros e visite primeiro os de maior queda. Meça os litros recuperados por conta."],
      ["Atender dois picos de gasolina comum","Ajuste a cobertura da pista para as 18h de segunda a sexta e para as 13h de sábado e domingo. Compare cupons por hora e litros por abastecimento em cada faixa."],
      ["Preparar a Troca para a terça à tarde","Confira filtros e lubrificantes antes das 17h de terça, pico médio de transações da Troca. Acompanhe transações por hora e litros de lubrificantes por atendimento."]
    ],
    coracao:[
      ["Reativar clientes de veículos leves","A aditivada representa 38,1% dos litros da carteira e o volume total caiu 14,1% nos meses comparáveis. Contate os cadastros desse combustível que reduziram compras e confira o retorno em litros."],
      ["Testar atendimento de comum à noite","A comum representa 76,5% dos litros estimados dos passantes no fim de semana. Prepare o atendimento antes das 21h e compare cupons de combustível com automotivos e lucro por cupom."],
      ["Cobrir a quarta na Troca","Revise a disponibilidade das referências mais vendidas antes das 17h de quarta. Compare filtros vendidos, litros de lubrificante e transações da Troca nessa faixa."]
    ],
    flash:[
      ["Recuperar a carteira de diesel","O S-10 responde por 75,0% dos litros cadastrados. Priorize as frotas com maior queda nos meses comparáveis e acompanhe litros reativados e margem por litro."],
      ["Trabalhar a aditivada no fim de semana","A participação estimada da aditivada entre os passantes sobe de 15,8% para 23,2%. Antes das 13h, prepare a equipe para apresentar a opção e acompanhe mix e lucro por litro."],
      ["Preparar o sábado da Troca","Sábado às 15h é a hora com maior média de transações. Confira disponibilidade de filtros e óleos antes do pico e registre atendimentos e vendas perdidas por falta."]
    ],
    glorimar:[
      ["Proteger as três maiores contas","Elas concentram 86,6% dos litros da carteira. Faça uma revisão mensal de volume e condições com cada conta e acompanhe a margem por litro nas renovações."],
      ["Acompanhar o mix no horário do almoço","Aditivada ganha participação estimada no fim de semana. Teste uma apresentação breve da opção antes das 13h e compare participação e lucro por litro entre fins de semana equivalentes."],
      ["Organizar cobertura da Troca no sábado","Distribua as tarefas para cobrir o pico das 10h. Avalie a operação consolidada por transações por hora, litros de lubrificantes e faltas de filtro."]
    ],
    jaburuna:[
      ["Reter frotas que compram S-10","O combustível reúne 95,5% dos litros cadastrados. Revise as rotas e condições das contas que perderam volume e acompanhe litros e margem recuperados."],
      ["Atender a parada de estrada no dia útil","Na pista, a compra de S-10 de segunda a sexta tem média de 130,37 L no recorte conciliado. Antecipe o atendimento das 18h e acompanhe litros por parada e cupons por hora."],
      ["Disponibilizar filtros na quarta","Todos os registros de filtros compõem a Troca da unidade. Reponha os códigos de maior saída antes das 17h de quarta e meça unidades e cupons com filtro."]
    ],
    sinha:[
      ["Reativar a carteira de diesel","O S-10 soma 76,3% do volume cadastrado. Liste as contas que reduziram compras e organize contato semanal. Meça os litros que retornarem por conta."],
      ["Separar as abordagens da manhã e do almoço","Nos dias úteis, prepare o atendimento de S-10 para as 8h. No fim de semana, teste a apresentação da aditivada às 13h. Compare litros e lucro por litro por combustível."],
      ["Repor a Troca antes do almoço de sábado","Prepare o estoque para o pico das 12h. Compare a média de transações no horário e registre faltas por código de filtro ou lubrificante."]
    ],
    teresina:[
      ["Reduzir a dependência de três cadastros","As três maiores contas somam 97,3% dos litros da carteira. Revise individualmente seu consumo e prospecte empresas de perfil semelhante. Meça retenção e litros de novas contas."],
      ["Atender o pico de comum no dia útil","Organize o atendimento para as 18h e compare cupons por hora, litros por compra e lucro por litro de gasolina comum em dias equivalentes."],
      ["Testar aditivada no fim de semana","Nos meses conciliados, a aditivada passa de 16,6% para 26,9% dos litros estimados dos passantes. Teste a abordagem às 18h e acompanhe mix e margem nas vendas de gasolina."]
    ],
    "boa-vizinhanca":[
      ["Reter e diversificar a carteira","Os três maiores cadastros concentram 85,4% dos litros. Revise o volume de cada um e prospecte contas de S-10 com padrão de consumo semelhante. Meça litros novos e retidos."],
      ["Preparar a manhã de diesel","Nos dias úteis conciliados, a compra de S-10 da pista tem média de 67,43 L e pico às 9h. Confira o atendimento da faixa e acompanhe litros por hora e lucro por litro."],
      ["Testar o mix de gasolina no fim de semana","A comum lidera os litros estimados dos passantes. No pico das 19h, teste apresentar a aditivada e compare sua participação e o lucro por litro com fins de semana equivalentes."]
    ]
  }
};
function showQuarterPlans(target,module,units){
  target.innerHTML=units.map(([slug,name])=>{
    const cards=quarterPlans[module][slug].map(([title,action],i)=>
      `<article class="portrait"><span class="tag">${["Janeiro","Fevereiro","Março"][i]}</span><h3>${html(title)}</h3><p>${html(action)}</p></article>`).join("");
    return `<details class="observ-unit" ${units.length===1?"open":""}><summary>${html(name)}</summary><div class="portraits">${cards}</div></details>`;
  }).join("");
}
