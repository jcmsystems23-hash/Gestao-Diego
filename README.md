# FrotaControl — Gestão de Frota e Financeiro

Sistema web para pequena frota (carros, caminhões e carretas) com espelho gerencial de
contas a receber e a pagar para conferência com a contabilidade terceirizada.

- **Front-end:** HTML + CSS + JavaScript (módulos ES), sem build. Publica direto no **GitHub Pages**.
- **Backend:** **Firebase** (Authentication por e-mail/senha + Firestore).

## Estrutura do repositório

```
/
├── index.html              Estrutura da página (login, menu, modais)
├── firestore.rules         Regras de segurança do Firestore
├── README.md
├── css/
│   └── styles.css          Todo o visual
└── js/
    ├── app.js              Login, menu, rotas (#/veiculos, #/receber...), alertas do menu
    ├── firebase.js         Configuração e conexão com o Firebase (único lugar com a config)
    ├── store.js            Dados em memória + criar/atualizar/excluir no Firestore
    ├── utils.js            Formatação, datas, status de prazo, validações
    ├── ui.js               Avisos, confirmação, modais e formulários genéricos
    ├── crud.js             Página de cadastro genérica (lista, busca, filtros, editar, excluir)
    └── modules/
        ├── dashboard.js    Painel: totais, gráfico, próximos vencimentos, alertas
        ├── veiculos.js     Frota + documentos/seguros de cada veículo
        ├── cadastros.js    Empresas, clientes, fornecedores e itens
        ├── contas.js       Contas a receber e a pagar (mesma base, dois usos)
        ├── nfe-parser.js   Lê o XML da NF-e (sem Firebase; fácil de testar)
        └── xml.js          Fluxo de importação do XML (conferência + gravação)
```

Para criar uma nova tela (ex.: combustível), basta criar um arquivo em `js/modules/`
com `crudPage({...})` e adicionar uma linha na lista `GRUPOS` do `app.js`.

## Estrutura do banco (Firestore)

Todas as coleções ficam na raiz. Todo documento recebe `criadoEm`, `criadoPor`
(e `atualizadoEm`, `atualizadoPor` quando editado).

| Coleção | Campos principais |
|---|---|
| `empresas` | nome, cnpj, cidade |
| `veiculos` | empresaId, tipo, marca, modelo, ano, placa |
| `documentos_veiculo` | veiculoId, tipo (CRLV, IPVA, Seguro...), vencimento, numero, obs |
| `clientes` | nome, documento, email, telefone, cidade, obs, origem (`manual` ou `xml`) |
| `fornecedores` | nome, documento, email, telefone, cidade, obs |
| `itens` | descricao, codigo, tipo (Serviço/Produto), uso (`ambos`/`receber`/`pagar`), unidade, valorPadrao |
| `contas_receber` | empresaId, pessoaId, pessoaNome, itemId, descricao, numeroNota, valor, emissao, vencimento, situacao (`pendente`/`quitado`), dataBaixa, origem (`manual`/`xml`), chaveNfe, itens[] |
| `contas_pagar` | empresaId, pessoaId, pessoaNome, itemId, descricao, numeroNota, valor, emissao, vencimento, situacao, dataBaixa, obs |

Observações de projeto:

- `pessoaId` aponta para `clientes` (a receber) ou `fornecedores` (a pagar); `pessoaNome` é uma cópia para listar rápido.
- Os documentos do veículo ficam em coleção própria para permitir vários por veículo (CRLV, IPVA, seguro, tacógrafo, ANTT...) sem mudar o cadastro do veículo.
- **Previsto para o futuro** (já combina com este modelo): `abastecimentos` e `manutencoes`, ambas com `veiculoId`, data, valor e quilometragem.

## Fluxos principais

**Importar XML de NF-e (contas a receber → Importar XML)**
1. Selecione um ou vários arquivos `.xml`.
2. Para cada nota o sistema mostra: número, emissão, total, parcelas, e se o cliente já existe ou será criado.
3. A empresa emitente é escolhida automaticamente pelo CNPJ do emitente (se houver empresa com esse CNPJ); senão você escolhe.
4. Ao confirmar, grava tudo de uma vez: cliente novo (origem `xml`, se não existir pelo CNPJ/CPF) e uma conta a receber por parcela (duplicatas do XML; sem duplicata, uma parcela única na data de emissão).
5. Nota com a mesma chave de acesso já importada é bloqueada.

**Controle da frota**
1. Cadastre a empresa proprietária.
2. Cadastre o veículo (placa validada e sem repetição).
3. Em "Documentos" do veículo, lance CRLV, IPVA, seguro etc. com o vencimento.
4. O painel e o contador vermelho do menu mostram o que está vencido ou vence em até 30 dias.

## Publicação

1. Suba esta pasta para o repositório e ative **Settings → Pages** (branch `main`, pasta raiz).
2. No Firebase: **Authentication → Sign-in method** com e-mail/senha ativo e usuários criados por você.
3. No Firebase: **Authentication → Settings → Authorized domains** inclua `SEU-USUARIO.github.io`.
4. No Firebase: **Firestore → Rules**, cole o conteúdo de `firestore.rules` e publique.
   Sem isso, qualquer pessoa com a chave pública do projeto (que aparece no código) pode ler e gravar no banco.
