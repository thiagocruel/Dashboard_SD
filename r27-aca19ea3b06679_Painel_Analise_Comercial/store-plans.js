"use strict";

const portrait = (time,name,description,evidence)=>({time,name,description,evidence});
const storeProfiles = {
  all:{
    location:"Sete lojas da rede, com unidades no centro, em bairros e na rodovia.",
    note:"O consolidado reúne ocasiões de compra recorrentes. A intensidade e a hora do pico variam por unidade. Os retratos se referem às vendas registradas de janeiro a outubro de 2026.",
    items:[
      portrait("8h–10h e 16h–19h · alimentação","Quem quer sair com o lanche pronto","Chega para um salgado e café de manhã ou volta a ter oferta de Food no fim da tarde. No Glorimar e na Flash, o café da manhã merece atenção. No Jaburuna, o preparo da tarde tem mais peso.","Na rede, Food tem seus maiores horários às 17h, 16h, 9h e 18h. No detalhamento, soma R$ 378 mil de lucro bruto."),
      portrait("12h–15h · bebidas sem álcool","Quem passa para pegar uma bebida gelada","Procura água, refrigerante ou energético em uma compra rápida. O atendimento depende de ter as embalagens de maior giro geladas e fáceis de achar antes do almoço.","Bebidas sem álcool têm os três maiores horários às 13h, 12h e 14h e somam R$ 906 mil de lucro bruto observado."),
      portrait("Sexta a domingo · fim de tarde e noite","Quem leva cerveja, gelo e itens de mercearia","Procura geladas e itens para levar. O horário pede reposição antes do pico, sobretudo em Arco, Coração, Glorimar e Sinhá. O movimento de cervejas em Glorimar e Sinhá inclui os canais disponíveis.","Sábado lidera o faturamento médio registrado. A média diária de alcoólicas geladas no fim de semana é 2,65 vezes a dos dias úteis.")
    ]
  },
  arco:{
    location:"Loja no centro de Sobral, com venda forte à noite e na virada do dia.",
    note:"O horário e o mix ajudam a descrever a compra. O comprovante não informa se o cliente mora, trabalha ou circula no centro.",
    items:[
      portrait("16h–18h · lanche","Quem passa no meio da tarde para pegar um salgado","Busca algo pronto, como salgado ou pastel. Um lote pequeno abastecido antes das 16h atende melhor esse momento de compra.","16h e 17h são os dois maiores horários de Food. Salgados SDMais lideram o lucro bruto observado da categoria."),
      portrait("20h–23h · balcão","Quem acrescenta um item pequeno no caixa","Leva Trident, Baton ou Paçoquita entre os itens de balcão. É uma compra de pouca espera, que depende de itens visíveis e repostos.","Promoção Balcão tem 22h, 20h e 21h como maiores horários de faturamento."),
      portrait("22h–2h · fim de semana","Quem procura bebida gelada e gelo até tarde","É a pessoa que passa perto da virada do dia buscando geladas, gelo ou snacks para levar. A compra pede reposição antes das 22h.","Em alcoólicas geladas, 0h e 22h lideram. A média diária da categoria no fim de semana é cerca de 2,47 vezes a dos dias úteis.")
    ]
  },
  coracao:{
    location:"Loja em área urbana próxima ao centro, com uma academia nas imediações.",
    note:"A academia é uma referência de localização e uma hipótese para teste. A base não identifica quem treina lá.",
    items:[
      portrait("8h–10h e 17h–19h · Food","Quem encaixa um lanche na rotina","Pode passar cedo para levar um salgado e café ou procurar um lanche pronto às 17h. Vale testar quais combos existentes melhor atendem as duas faixas.","O maior horário de Food é 17h, seguido de 9h, 8h e 18h. A categoria caiu 5,1% em faturamento comercial."),
      portrait("Fim da tarde · hipótese de teste","Quem procura água gelada depois de circular pela região","Pode ser uma pessoa voltando do treino ou de outra atividade no bairro. Água gelada em destaque e um teste curto com itens adequados para esse público ajudam a verificar a hipótese.","Bebidas sem álcool cresceram 17,3% no faturamento comercial. O maior movimento da categoria aparece à noite, então a origem na academia precisa ser validada."),
      portrait("21h–1h · fim de semana","Quem passa tarde para pegar geladas e gelo","Busca bebidas resfriadas ou gelo. O sábado é forte, e a compra continua perto da meia-noite. É a ocasião que pede atenção a freezer e estoque no fim do dia.","A venda geral se destaca às 22h, 0h e 23h. A média do fim de semana fica cerca de 63% acima dos dias úteis.")
    ]
  },
  flash:{
    location:"Perto do shopping, de uma universidade com atividades até sexta pela manhã e de um mercantil concorrente.",
    note:"A universidade e o shopping ajudam a levantar hipóteses de circulação. A origem dos clientes precisa ser validada no atendimento.",
    items:[
      portrait("7h–10h · dias úteis","Quem toma um café rápido antes de seguir","Procura salgado e café pela manhã. Pode ser alguém na rotina de trabalho ou estudo. Um combo existente, servido rápido, se encaixa nessa parada.","9h é o maior horário de Food, com 8h e 7h entre os quatro principais. A média diária de Food cai cerca de 33% no fim de semana."),
      portrait("12h–16h · bebida gelada","Quem quer comprar uma bebida sem demorar","Passa para uma água ou energético e valoriza encontrar logo o tamanho que procura. É a ocasião para testar disponibilidade e preço dos itens mais comparáveis ao mercantil.","Bebidas sem álcool têm pico comercial às 13h e 12h e cresceram 11,3% no acumulado comercial."),
      portrait("17h–19h · saída da tarde","Quem pega um lanche ou snack no fim do dia","Chega na saída da tarde e pode escolher um salgado, Cheetos ou Ruffles. O estoque de snacks e um lote curto de salgados atendem diferentes tamanhos de compra.","17h e 18h são os dois maiores horários da loja, e também estão entre os dois principais de mercearia.")
    ]
  },
  sinha:{
    location:"Loja em bairro mais distante do centro, em uma região com movimento próprio. Opera balcão e Zé Delivery.",
    note:"Os dados gerais de bebidas misturam os canais. Promoção Balcão reúne itens vendidos no balcão.",
    items:[
      portrait("12h–15h · meio do dia","Quem resolve a compra de bebida perto de casa","Passa no horário do almoço e busca água, refrigerante ou gelo. Pode aproveitar para levar um item pequeno do caixa. Manter a geladeira abastecida antes do meio-dia atende esse movimento.","12h e 13h lideram bebidas sem álcool. Promoção Balcão concentra seus maiores horários em 13h, 14h e 12h."),
      portrait("9h–10h e 16h · lanche","Quem faz uma parada curta para comer","Procura salgado ou café. Atender bem essa compra exige lotes pequenos na manhã e antes das 16h, quando há mais consumo de Food.","16h é o maior horário de Food, com 9h e 10h entre os quatro principais. Food avançou 16,7% em receita comercial."),
      portrait("18h–22h · fim de semana","Quem encomenda ou busca cerveja e retornáveis","Procura cerveja gelada ou retornável. A compra pode chegar pelo aplicativo ou pelo balcão. Operacionalmente, vale garantir estoque e acompanhar o resultado por canal no fechamento.","Alcoólicas geladas vendem cerca de 2,89 vezes mais por dia no fim de semana. Pit Stop cresceu 83,3% em receita comercial.")
    ]
  },
  teresina:{
    location:"Loja com características de posto de rodovia e pontos comerciais nas proximidades.",
    note:"O padrão diurno é compatível com compras de rotina e de passagem. O dado de venda não identifica de onde cada cliente veio.",
    items:[
      portrait("12h–16h · dias úteis","Quem passa para pegar água e seguir","Procura água rápida, especialmente Viena 510 ml ou 1,25 L. A compra pede reposição antes do almoço e disponibilidade de garrafas geladas.","Bebidas sem álcool têm maiores horários entre 13h e 17h. A média diária da categoria cai cerca de 21% no fim de semana."),
      portrait("16h–18h · lanche","Quem procura um salgado no fim da tarde","Chega querendo algo pronto, como Salgado Bomba, salgado SDMais ou um café. Um lote curto antes das 16h permite testar giro sem carregar sobra até a noite.","Food tem seus dois maiores horários às 17h e 16h, mas caiu 16,2% em faturamento comercial."),
      portrait("17h–20h · cerveja gelada","Quem leva uma cerveja depois da tarde","Pode procurar Heineken, Stella ou Skol gelada no fim do dia. É uma compra com demanda própria, mesmo com o domingo mais fraco no total da loja.","Alcoólicas geladas têm pico às 18h. A categoria vende cerca de 33% mais por dia no fim de semana, enquanto a loja vende cerca de 14% menos.")
    ]
  }
};

const action = (when,title,description,indicator)=>({when,title,description,indicator});
const storeActions = {
  all:[
    action("1º trimestre","Programar produção e reposição pelos picos","Fixar dois horários de conferência por loja. Ajustar Food por faixa e abastecer geladeiras antes do pico local. Medir os combos existentes em vez de ampliar o cardápio de saída.","Lucro bruto de Food, bebidas sem álcool e combos. Ruptura e descarte por faixa."),
    action("1º trimestre","Revisar a classe A por loja e por canal","Usar a ABC de lucro bruto para escolher itens de reposição. Rever custos, preços e descontos nos itens de preço livre. Conciliar o Zé Delivery de Glorimar e Sinhá separadamente.","Lucro bruto, margem, ruptura dos itens A e contribuição do delivery após taxas."),
    action("2º trimestre","Replicar só os testes que deram resultado","Testar exposição e linha saudável em poucas lojas e em lotes pequenos. Comparar dias equivalentes antes e depois e ampliar apenas os testes que gerarem resultado.","Lucro bruto incremental, giro, perdas e inventário.")
  ],
  arco:[
    action("1º trimestre","Proteger o estoque antes das 22h","Conferir gelo, bebidas geladas e snacks antes da virada do dia, com reforço de sexta a domingo.","Ruptura e lucro bruto entre 22h e 2h."),
    action("1º trimestre","Recuperar Food às 16h","Programar um lote de salgados e pastéis antes das 16h e medir os combos existentes com a oferta no balcão.","Combos, lucro bruto de Food e descarte."),
    action("2º trimestre","Rever a exposição perto do caixa","Testar um conjunto pequeno de Trident, Baton e Paçoquita no pico noturno. Trocar a frente dos itens a partir de giro e contribuição.","Lucro bruto de Promoção Balcão entre 20h e 23h.")
  ],
  coracao:[
    action("1º trimestre","Repor geladas e gelo antes das 21h","Ajustar estoque para o pico de sexta a domingo e revisar rupturas de gelo e bebidas até a virada do dia.","Lucro bruto de bebidas e ruptura entre 21h e 1h."),
    action("1º trimestre","Reforçar os dois horários de Food","Preparar lotes para 8h–10h e 17h–19h. Testar a execução dos combos já cadastrados nessas duas faixas.","Combos vendidos, lucro bruto de Food e descarte."),
    action("2º trimestre","Testar uma oferta ligada à academia","Expor água gelada e poucos itens adequados à ocasião. Registrar a adesão na faixa testada antes de ampliar o mix.","Giro dos itens testados, lucro bruto incremental e perda.")
  ],
  flash:[
    action("1º trimestre","Recuperar o café da manhã nos dias úteis","Deixar salgados e cafés disponíveis antes das 8h. Medir as manhãs com atividade na universidade e ajustar o preparo nos fins de semana.","Lucro bruto de Food, combos e descarte de manhã."),
    action("1º trimestre","Blindar as bebidas de compra rápida","Comparar preços dos itens equivalentes ao mercantil e manter água e energéticos de maior giro gelados no almoço.","Lucro bruto de bebidas sem álcool e rupturas de 12h a 16h."),
    action("2º trimestre","Testar snacks no pico de saída","Reposicionar poucos itens de mercearia de maior contribuição próxima às bebidas entre 17h e 19h. Medir o conjunto exposto.","Lucro bruto de mercearia e giro do conjunto.")
  ],
  glorimar:[
    action("1º trimestre","Separar o resultado do Zé Delivery","Conciliar pedidos, taxas, descontos e embalagem do aplicativo e comparar a contribuição com o balcão. Revisar os SKUs de Pit Stop de maior peso.","Contribuição por canal e lucro bruto de Pit Stop."),
    action("1º trimestre","Recuperar Food entre 8h e 11h","Garantir o primeiro lote de salgados antes das 8h e acompanhar os combos existentes pela manhã nos dias úteis.","Lucro bruto de Food, combos vendidos e descarte."),
    action("2º trimestre","Preparar balcão e geladeiras em horários diferentes","Repor itens de Promoção Balcão antes do almoço e geladas e retornáveis antes do pico da noite, com reforço no sábado.","Ruptura e lucro bruto nas duas faixas.")
  ],
  jaburuna:[
    action("1º trimestre","Fazer a segunda rodada de Food antes das 16h","Testar lotes de Salgados SDMais e pastéis para o pico da tarde. Manter o café da manhã com os combos que já existem.","Lucro bruto de Food, combos vendidos e descarte por faixa."),
    action("1º trimestre","Garantir água gelada e snacks no pico","Ajustar estoque de Naturágua por tamanho e testar uma frente enxuta de mercearia perto das bebidas de 15h a 19h.","Ruptura de água e lucro bruto de bebidas sem álcool e mercearia."),
    action("2º trimestre","Diferenciar a reposição de sábado e domingo","Preparar sorvetes e dindins antes das 14h. Ajustar geladas e snacks por dia e testar a linha saudável em lotes pequenos após estabilizar Food.","Lucro bruto do fim de semana, giro e perdas do freezer e do piloto.")
  ],
  sinha:[
    action("1º trimestre","Conferir o que o Zé Delivery deixa","Separar aplicativo e balcão e conciliar taxas e descontos. Conferir a contribuição por SKU antes de ampliar ofertas de retornáveis.","Contribuição por canal, custo por pedido e margem de Pit Stop."),
    action("1º trimestre","Repor sem álcool antes do almoço","Abastecer gelo e as bebidas de maior giro antes das 12h. Conferir itens da Promoção Balcão no mesmo horário, como categoria da loja física.","Lucro bruto e ruptura entre 12h e 15h."),
    action("2º trimestre","Ajustar dois lotes de Food","Testar um lote cedo e outro antes das 16h. Acompanhar o giro dos combos existentes e adequar o volume para o fim de semana.","Lucro bruto de Food, combos e descarte por faixa.")
  ],
  teresina:[
    action("1º trimestre","Abastecer água antes do almoço","Priorizar Viena 510 ml e 1,25 L nos dias úteis. Ajustar pedido e espaço de geladeira ao giro observado entre 12h e 16h.","Lucro bruto de bebidas sem álcool e ruptura por tamanho."),
    action("1º trimestre","Testar um lote curto de Food para as 16h","Dar destaque ao Salgado Bomba e aos combos existentes. Reavaliar os itens que sobram, especialmente aos domingos.","Lucro bruto de Food, combos, ruptura e descarte."),
    action("2º trimestre","Repor cerveja por horário e dia","Revisar o estoque dos itens A da categoria para 17h–20h e ajustar o pedido dos fins de semana ao giro de alcoólicas.","Lucro bruto de alcoólicas geladas e excesso de estoque.")
  ]
};
