# Master NFC — Central de NFC

Ferramenta interna pra criar, gravar e conferir as tags NFC que vão pras casas
de aluguel de férias. A tela segue o mesmo design system do **Master Lock
Automation** (React 18 + Vite + Tailwind 3, sidebar com item ativo em borda
amarela, título em Optima, abas com `border-b-2` preto) — quem já opera aquele
painel não precisa aprender nada novo aqui.

> **Convenção do projeto:** interface em inglês, comentários de código em
> português. É o mesmo padrão do Master Lock Automation.

---

## Rodando

```bash
npm install
npm run dev
```

Sobe em `http://localhost:5174`. No desktop dá pra cadastrar tags e montar o
conteúdo, mas **gravar só no celular** — ver a seção abaixo.

---

## O que dá pra fazer

A central tem três abas:

| Aba | Pra quê |
|---|---|
| **Tags** | Catálogo: cria, edita e apaga tags, e mostra quais já foram gravadas num chip. |
| **Wi-Fi** | A tag de teste do projeto. Monta a credencial da rede e grava. |
| **Reader** | Lê uma tag e mostra o serial e os registros — pra conferir o que ficou gravado de verdade. |

Tipos de conteúdo suportados hoje: **Wi-Fi**, **Link** e **Texto**. A lista
completa do que ainda vai entrar está em [`docs/NFC-IDEIAS.md`](docs/NFC-IDEIAS.md).

---

## Testando de verdade (Web NFC)

A gravação usa a **Web NFC API**, e ela tem duas restrições que não dá pra
contornar:

1. **Só existe no Chrome/Edge do Android** (89+). No iPhone não existe em
   navegador nenhum — nem no Chrome do iOS, que por baixo roda o motor do
   Safari. iPhone **lê** tag gravada, mas não grava.
2. **Exige origem segura** (HTTPS ou `localhost`). Abrir `http://192.168.x.x:5174`
   no celular **não funciona** — o navegador trata como inseguro e a API some.

O jeito mais barato de contornar o item 2, sem certificado nem túnel:

### Port forwarding do Chrome (USB)

1. No celular Android: **Opções do desenvolvedor → Depuração USB** ligada.
2. Liga o cabo USB no PC.
3. No Chrome do PC, abre `chrome://inspect/#devices`.
4. Clica em **Port forwarding…**, marca *Enable port forwarding* e adiciona:
   - Port: `5174`
   - IP address and port: `localhost:5174`
5. No Chrome do **celular**, abre `http://localhost:5174`.

O celular passa a ver o dev server do PC como se fosse local — e `localhost`
conta como origem segura, então o Web NFC liga.

> Alternativa: qualquer túnel HTTPS (Cloudflare Tunnel, ngrok). Funciona igual,
> só depende de internet e expõe a tela pra fora — pra bancada, o cabo é melhor.

### Na primeira gravação

O Chrome pede permissão de NFC pro site. Se recusar sem querer, o botão passa a
dar "Permission denied" pra sempre: limpa nas permissões do site no Chrome.
O NFC do aparelho também precisa estar ligado nas configurações do Android.

---

## Hardware

| Chip | Área NDEF | Uso |
|---|---|---|
| NTAG213 | 144 bytes | Padrão da operação — atende Wi-Fi e link curto. |
| NTAG215 | 504 bytes | Quando o conteúdo não cabe. |
| NTAG216 | 888 bytes | Folga grande, custo maior. |

A tela avisa **antes** de encostar no chip se o conteúdo não cabe — o erro do
navegador nesse caso é um `NotSupportedError` seco, que não distingue "não
coube" de "tag não formatada".

Dois cuidados de campo:

- **Tag anti-metal** é obrigatória em geladeira, máquina de lavar, boiler e
  quadro de luz. Tag comum simplesmente não lê em superfície metálica.
- **Travar a tag** (botão *Lock permanently* depois de gravar) impede que
  qualquer pessoa com um celular regrave o conteúdo — inclusive apontando pra
  um site falso com a nossa marca. É irreversível: só trava depois de testar.

---

## Estrutura

```
src/
  components/
    Layout.jsx           casca (sidebar + topbar), espelha o Master Lock
    nfc/
      shared.jsx         Field, TextInput, Card, Badge… o design system
      TagsTab.jsx        catálogo
      WifiTab.jsx        a tag de teste
      ReaderTab.jsx      conferência
      WriteTagModal.jsx  o único lugar que encosta no chip
  pages/NfcCentralPage.jsx
  services/
    tagStore.js          catálogo (localStorage hoje, API depois)
    nfcWriter.js         tag do catálogo → mensagem NDEF
  utils/ndef.js          codificação WSC (Wi-Fi), leitura de registros
docs/
  NFC-IDEIAS.md          o levantamento de casos de uso
  WIFI-TAG.md            a especificação da tag de teste
```

### Decisões que valem saber

- **`tagStore.js` é assíncrono de propósito.** Hoje grava em `localStorage`, mas
  a forma das funções é a de uma API. Trocar por Postgres + Express, como no
  Master Lock Automation, é mexer só nesse arquivo — nenhuma tela muda.
- **Sem login.** É ferramenta de bancada por enquanto. Antes de ir pro ar tem
  que herdar o `AuthContext` do Master Lock, senão qualquer um com o link grava
  tag com o nome da empresa.
- **O scan é amarrado a um `AbortController`.** Sem isso o navegador continua
  esperando uma tag depois que o modal fecha, e a *próxima* tag encostada seria
  sobrescrita sem ninguém ter pedido.

---

## Branches

Só duas, sem PR:

- **`master`** — o que está pronto.
- **`dev`** — onde o trabalho acontece.

Quando `dev` estiver estável, merge direto em `master`:

```bash
git checkout master
git merge dev
```
