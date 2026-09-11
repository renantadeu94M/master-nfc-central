# Tag de Wi-Fi — a primeira tag do projeto

Status: **implementada** na aba *Wi-Fi* da central.

## Por que essa foi a escolhida pra teste

- É a pergunta nº 1 do hóspede, e chega por WhatsApp fora de hora.
- A resposta é sempre a mesma, então automatizar não perde nada.
- O teste é **binário**: ou o celular conecta, ou não. Não tem "meio
  funcionando" pra interpretar.
- Custa ~R$2 em tag e não depende de nenhum sistema nosso estar no ar.

## O problema que não tem solução única

Nenhum formato de tag funciona nos dois sistemas. A central expõe os dois
caminhos como escolha explícita de quem grava, em vez de esconder um padrão no
código:

### Modo `wsc` — *Auto-join (Android)*

Grava um registro MIME `application/vnd.wfa.wsc` (Wi-Fi Simple Config).

- **Android:** encostou, aparece "conectar a `<rede>`?". Um toque e está online.
- **iPhone:** lê a tag, não reconhece o tipo e não faz nada. Pro hóspede parece
  que a tag está quebrada.

### Modo `url` — *Landing page*

Grava um registro de URL apontando pra uma página nossa que mostra o nome da
rede, a senha com botão de copiar, e o QR.

- **Funciona nos dois.** Custa um toque a mais no Android.
- A URL tem que ser do **nosso domínio**. A tag fica numa parede por anos; um
  encurtador de terceiro é uma dependência que um dia some.

### Recomendação de campo

A plaquinha leva os dois meios: **tag NFC em modo `wsc` + QR impresso ao lado**.
O Android resolve no toque, o iPhone resolve pela câmera, e nenhum dos dois
precisa digitar senha. A placa custa o mesmo com os dois.

---

## Detalhe técnico do payload WSC

Estrutura TLV big-endian (2 bytes de tipo, 2 de tamanho, N de valor), tudo
aninhado num Credential `0x100E`. Implementado em
[`src/utils/ndef.js`](../src/utils/ndef.js) → `buildWscPayload()`.

| Campo | Tipo | Valor |
|---|---|---|
| Credential | `0x100E` | envelope de tudo abaixo |
| Network Index | `0x1026` | `0x01` — legado, mas alguns leitores exigem |
| SSID | `0x1045` | até 32 bytes |
| Authentication Type | `0x1003` | `0x0020` WPA2-PSK · `0x0022` WPA/WPA2 misto · `0x0001` aberta |
| Encryption Type | `0x100F` | `0x0008` AES · `0x000C` AES+TKIP · `0x0001` nenhuma |
| Network Key | `0x1027` | 8 a 63 caracteres |
| MAC Address | `0x1020` | `00:00:00:00:00:00` = qualquer AP |

**A ordem importa.** Fora dela, alguns aparelhos Android ignoram o registro em
silêncio — sem erro, sem aviso, a tag só não faz nada.

### WPA3 não funciona

O padrão WSC é anterior ao WPA3-SAE e não tem código de autenticação pra ele.
Roteador em **WPA3 puro** não pode ser provisionado por tag. Saídas:

1. Deixar a rede de hóspedes em WPA2 (o normal em roteador de casa de aluguel).
2. Usar o modo `url`.

A central avisa isso na própria tela, junto do seletor de segurança — não
escondido na documentação.

---

## Tamanho

Uma credencial WPA2 típica dá cerca de **80 a 110 bytes** com o cabeçalho NDEF —
folgado numa NTAG213 (144 bytes úteis). SSID e senha longos apertam; a central
mostra o total em bytes e bloqueia a gravação antes de encostar no chip.

---

## Checklist de campo

1. Conferir SSID e senha **na etiqueta do roteador**, não de memória. Um typo
   aqui vira uma tag que falha em silêncio na casa.
2. Gravar com um Android.
3. Conferir na aba **Reader** — o SSID lido tem que bater.
4. Testar num celular que **não** é o que gravou.
5. Só então **travar** a tag (*Lock permanently*). É irreversível.
6. Colar. Se for em metal (geladeira), **tag anti-metal**.

---

## Limitação conhecida

A senha fica **em texto claro** na tag, como manda o padrão — qualquer pessoa com
um leitor NFC extrai. Isso é aceitável pra uma rede **de hóspedes**, que é
pública por natureza e já está impressa no guia da casa.

**Nunca gravar a senha da rede administrativa** (a das câmeras, fechaduras e do
computador do escritório) numa tag. Rede de hóspede e rede da operação têm que
ser separadas no roteador, o que já é boa prática independente de NFC.
