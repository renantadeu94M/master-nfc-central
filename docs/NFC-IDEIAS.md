# NFC na operação de aluguel de férias — levantamento de casos de uso

Levantamento feito em 11/09/2026 pra decidir o escopo do projeto. Organizado por
retorno sobre esforço. O que já está implementado na central está marcado.

---

## 1. Ganhos rápidos — tag de ~R$2, instalação em minutos

| Caso | O que resolve | Status |
|---|---|---|
| **Wi-Fi sem digitar senha** | A pergunta nº 1 do hóspede, que chega por WhatsApp fora de hora | ✅ implementado — ver [`WIFI-TAG.md`](WIFI-TAG.md) |
| **Guia da casa por cômodo** | Tag na máquina de lavar, no termostato, na piscina → vídeo curto do que fazer. Cada tag aponta pro trecho específico, não pro manual de 40 páginas | tipo *Link* já grava |
| **Pedido de avaliação no check-out** | Tag na porta de saída → formulário do Airbnb/VRBO/Google. Volume de review é o que mais move ranking em plataforma | tipo *Link* já grava |
| **Instruções de emergência** | Saídas, hospital, contato 24h, disjuntor, registro de água | tipo *Link* já grava |

## 2. Receita extra

| Caso | Observação |
|---|---|
| **Cardápio de upsell** na geladeira | Late check-out, limpeza extra, aquecimento de piscina, cesta de chegada, passeios, transfer, berço. O ganho está no **momento**: o hóspede toca no dia 3, confortável e disposto a gastar — não no e-mail pré-chegada que ignorou |
| **Reserva direta na próxima vez** | Cartão NFC entregue no check-out com código de indicação. Uma reserva direta por mês, em ticket de casa grande, já paga o projeto NFC do ano |
| **Modo "saindo de casa"** | Tag na porta desliga ar e luzes. Numa casa de 8 quartos em clima quente, a conta de energia justifica sozinha |

## 3. Operação e antifraude — o maior ganho em escala

| Caso | Por que NFC e não outra coisa |
|---|---|
| **Checklist de limpeza com prova de presença** | Uma tag por cômodo. A camareira só marca "banheiro OK" se estiver fisicamente lá. QR dá pra fotografar e reusar do estacionamento; GPS erra 50 m e pega o vizinho |
| **Prova de visita de prestador** | Piscineiro, jardineiro, dedetizador. Para de pagar visita que não aconteceu |
| **Ficha técnica de equipamento** | Tag no boiler, bomba da piscina, ar-condicionado: modelo, série, última manutenção, garantia, botão de abrir chamado. O técnico chega sabendo o histórico |
| **Inventário de ativos** | Conferência pós-estadia vira passar o celular em vez de planilha |
| **Botão de problema contextual** | Tag por cômodo → o chamado chega pronto: *Casa 214 — banheiro suíte — vazamento*. Acaba o ping-pong de "qual casa mesmo?" |
| **ID físico do imóvel** | Tag no quadro de luz: endereço, senha do portão, onde fica o registro geral, histórico de chamados. Onboarding de equipe nova deixa de depender de alguém no telefone |
| **Check-out dispara a limpeza** | O toque na tag de saída é o sinal de que a casa vagou — a ordem de serviço sai automática |

## 4. Acesso e chaves — fase 2

Maior ganho (fim da logística de chave), maior custo e maior risco: mexe em
segurança física.

- **Fechadura com NFC** (Yale, Schlage, Nuki, TTLock) — cartão por estadia,
  revogável remotamente. Perdeu? Cancela no painel, não troca o miolo.
- **Apple Home Key / Google Wallet** em modelos compatíveis — o hóspede abre com
  o iPhone ou o relógio, sem app nenhum.
- **Áreas comuns** — piscina, academia, garagem, portaria, coleta de lixo.

## 5. Experiência do hóspede — diferenciação

- **Caça ao tesouro pras crianças**: tags escondidas, cada uma uma pista, a
  última libera um prêmio. Em casa de família perto de parque, é gerador de
  review de 5 estrelas — os pais escrevem sobre isso. Custo: R$15 em tags.
- **Livro de visitas digital**: mural acumulado daquela casa específica.
- **Vídeo de boas-vindas** do anfitrião na tag da entrada.
- **Streaming**: como entrar nas contas da casa e, principalmente, o lembrete de
  **sair da conta pessoal no check-out**.
- **Sala de jogos**: regras, senhas, o que fazer quando o console trava.
- **Roteiro local vivo**: restaurante fechou, você atualiza no servidor e todas
  as casas ficam corretas — sem reimprimir nada.

## 6. Segurança jurídica — subestimado, principalmente nos EUA

- **Termo de responsabilidade da piscina** assinado digitalmente na tag do
  portão. Registro com data, hora e nome é defesa real num processo, e costuma
  agradar a seguradora.
- **Prova de inspeção de segurança**: extintor, detector de fumaça, alarme de
  piscina. Histórico auditável pra vistoria, licença e sinistro.
- **Ficha de hospedagem** onde há exigência de registro de hóspede.

## 7. Dado — o ativo escondido

Todo toque é um evento medido. Depois de 60 dias existe um **mapa de calor de
confusão**: se 70% dos hóspedes tocam na tag do termostato, o problema não é a
tag — é o termostato. Troca o aparelho e para de receber a reclamação na review.

É feedback **antes** da avaliação pública, que é o único tipo em que ainda dá pra
agir.

---

## Notas técnicas que mudam a decisão

**Compatibilidade**

- iPhone XS ou mais novo lê NFC com a tela ligada, sem abrir app. iPhone 7/8/X
  precisam da Central de Controle. iPhone 6 não lê.
- Android lê nativo há anos.
- **Colocar QR na mesma plaquinha.** NFC é mais elegante, QR é universal, e a
  placa custa o mesmo com os dois.

**Hardware**

- NTAG213 (144 bytes) serve pra quase tudo. Tag **anti-metal** é obrigatória em
  geladeira, boiler e quadro de luz. Tag externa (piscina, portão) precisa ser
  encapsulada, IP67.

**Segurança — os dois pontos que a maioria erra**

1. Gravar apontando pro **nosso domínio** (`ferias.mastervh.com/t/a17`), nunca
   direto pro destino final. Assim o conteúdo muda sem trocar a tag, e dá pra
   medir toques por ponto.
2. **Travar a tag** depois de gravar. Tag destravada pode ser regravada por
   qualquer pessoa com um celular, inclusive apontando pra um site de phishing
   com a nossa marca. Pra checklist de limpeza e controle de acesso, vale
   **NTAG424 DNA**, que assina cada toque com um código criptográfico único —
   impossível de clonar.

---

## O que NÃO fazer

- **NFC não cobra do hóspede.** Encostar o celular não paga nada — pagamento é
  link ou maquininha. NFC aqui só leva ao checkout.
- **Não abandonar o QR.** iPhone 6 e anteriores não leem NFC, e tem hóspede que
  não sabe onde encostar.
- **NFC não rastreia ninguém a distância.** Alcance de 1 a 4 cm, por contato
  deliberado. Não serve pra saber se tem gente na casa nem pra detectar festa —
  pra isso são sensores de ruído (Minut, NoiseAware).
- **Tag comum não cola em metal.**

---

## Piloto recomendado

Uma casa, três coisas: **guia por cômodo, Wi-Fi e pedido de avaliação**. Menos de
R$100 em tags, uma tarde de trabalho, e 30 dias medindo toques por ponto. Com
esse dado real dá pra decidir se escala pro checklist de limpeza — que é onde
está o dinheiro grande, mas exige app e cadastro de equipe.

**Wi-Fi foi escolhida como a primeira tag do projeto.** É a que mais economiza
suporte por real gasto, e é a única em que o teste é binário: ou o celular
conecta, ou não.

### Perguntas abertas

1. Quantos imóveis, e onde (Brasil, Orlando, os dois)?
2. Qual PMS/channel manager (Guesty, Hostaway, Stays, Lodgify)? Com ele dá pra
   puxar a reserva ativa e personalizar a página por hóspede.
3. O foco imediato é experiência do hóspede ou controle de operação?
