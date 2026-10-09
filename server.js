const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PRIMOS_LOTOFACIL = [2, 3, 5, 7, 11, 13, 17, 19, 23];

function calcularAtrasos(historicoConcursos, totalNumeros = 25) {
  const atrasos = {};
  for (let i = 1; i <= totalNumeros; i++) atrasos[i] = -1;

  historicoConcursos.forEach((dezenasSorteadas, index) => {
    for (let i = 1; i <= totalNumeros; i++) {
      if (dezenasSorteadas.includes(i) && atrasos[i] === -1) {
        atrasos[i] = index;
      }
    }
  });

  for (let i = 1; i <= totalNumeros; i++) {
    if (atrasos[i] === -1) atrasos[i] = historicoConcursos.length;
  }

  return Object.keys(atrasos)
    .map((num) => ({ numero: Number(num), atraso: atrasos[num] }))
    .sort((a, b) => b.atraso - a.atraso);
}

function validarCombinacao(comb, { minPares, maxPares, minPrimos, maxPrimos }) {
  const qtdPares = comb.filter((n) => n % 2 === 0).length;
  const qtdPrimos = comb.filter((n) => PRIMOS_LOTOFACIL.includes(n)).length;
  return qtdPares >= minPares && qtdPares <= maxPares && qtdPrimos >= minPrimos && qtdPrimos <= maxPrimos;
}

function gerarPalpiteEstatistico({
  historicoConcursos,
  totalDezenasJogo = 25,
  dezenasParaMarcar = 15,
  qtdAtrasadosIncluir = 3,
  regras = { minPares: 7, maxPares: 8, minPrimos: 5, maxPrimos: 6 },
  maxTentativas = 5000
}) {
  const listaAtrasados = calcularAtrasos(historicoConcursos, totalDezenasJogo);
  const dezenasAtrasadasForcadas = listaAtrasados.slice(0, qtdAtrasadosIncluir).map((item) => item.numero);
  const universoRestante = Array.from({ length: totalDezenasJogo }, (_, i) => i + 1)
    .filter((num) => !dezenasAtrasadasForcadas.includes(num));

  const quantidadeRestante = dezenasParaMarcar - dezenasAtrasadasForcadas.length;

  for (let tentativa = 0; tentativa < maxTentativas; tentativa++) {
    const embaralhado = [...universoRestante];
    for (let i = embaralhado.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [embaralhado[i], embaralhado[j]] = [embaralhado[j], embaralhado[i]];
    }

    const candidato = [...dezenasAtrasadasForcadas, ...embaralhado.slice(0, quantidadeRestante)].sort((a, b) => a - b);

    if (validarCombinacao(candidato, regras)) {
      const qtdPares = candidato.filter((n) => n % 2 === 0).length;
      const qtdPrimos = candidato.filter((n) => PRIMOS_LOTOFACIL.includes(n)).length;

      return {
        sucesso: true,
        tentativas: tentativa + 1,
        palpite: candidato,
        estatisticasPalpite: {
          pares: qtdPares,
          impares: candidato.length - qtdPares,
          primos: qtdPrimos,
          dezenasAtrasadasInclusas: dezenasAtrasadasForcadas
        }
      };
    }
  }

  return { sucesso: false, mensagem: 'Não foi possível encontrar uma combinação com esses filtros.' };
}

// API: Caixa Último Concurso
app.get('/api/caixa/ultimo', async (req, res) => {
  try {
    const { data } = await axios.get('https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    res.json({
      concurso: data.numero,
      dataApuracao: data.dataApuracao,
      dezenasSorteadas: data.dezenasSorteadasOrdemSorteio.map(Number),
      acumulado: data.acumulado,
      valorEstimadoProximoConcurso: data.valorEstimadoProximoConcurso,
      valorPremioAtual: data.valorArrecadado
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dados da Caixa' });
  }
});

// API: Gerar Palpite
app.post('/api/palpite', (req, res) => {
  const { totalDezenas, marcar, atrasados, minPares, maxPares, minPrimos, maxPrimos } = req.body;

  const historicoSimulado = [
    [1, 2, 4, 6, 8, 9, 10, 11, 13, 15, 17, 18, 20, 22, 25],
    [2, 3, 5, 7, 8, 10, 12, 14, 16, 17, 19, 21, 23, 24, 25],
    [1, 3, 4, 6, 9, 11, 12, 13, 15, 18, 19, 20, 22, 23, 24],
    [2, 5, 7, 8, 10, 14, 15, 16, 17, 18, 19, 21, 22, 24, 25],
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  ];

  const resultado = gerarPalpiteEstatistico({
    historicoConcursos: historicoSimulado,
    totalDezenasJogo: totalDezenas || 25,
    dezenasParaMarcar: marcar || 15,
    qtdAtrasadosIncluir: atrasados || 3,
    regras: {
      minPares: minPares || 7,
      maxPares: maxPares || 8,
      minPrimos: minPrimos || 5,
      maxPrimos: maxPrimos || 6
    }
  });

  res.json(resultado);
});

// Rota principal: Entrega a página web diretamente
app.get('*', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Palpites de Loterias</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 20px; }
        .card { max-width: 500px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .caixa { background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .field { margin-bottom: 12px; }
        label { display: block; font-weight: bold; font-size: 13px; margin-bottom: 4px; }
        input { width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 5px; }
        button { width: 100%; padding: 12px; background: #0288d1; color: white; border: none; border-radius: 5px; font-weight: bold; font-size: 16px; cursor: pointer; }
        .bola { display: inline-flex; width: 38px; height: 38px; border-radius: 50%; color: white; justify-content: center; align-items: center; font-weight: bold; margin: 3px; }
        .vermelho { background: #d32f2f; }
        .verde { background: #2e7d32; }
        .resultado { margin-top: 20px; border-top: 2px dashed #eee; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div id="caixa-info" class="caixa">A carregar dados da Caixa...</div>
        <h2>Gerador de Palpites</h2>
        <form id="form">
          <div class="field"><label>Dezenas a Marcar:</label><input type="number" id="marcar" value="15"></div>
          <div class="field"><label>Forçar Atrasados:</label><input type="number" id="atrasados" value="3"></div>
          <div class="field"><label>Mín. Pares:</label><input type="number" id="minPares" value="7"></div>
          <div class="field"><label>Máx. Pares:</label><input type="number" id="maxPares" value="8"></div>
          <div class="field"><label>Mín. Primos:</label><input type="number" id="minPrimos" value="5"></div>
          <div class="field"><label>Máx. Primos:</label><input type="number" id="maxPrimos" value="6"></div>
          <button type="submit">Gerar Palpite</button>
        </form>
        <div id="resultado" class="resultado" style="display:none;"></div>
      </div>

      <script>
        async function carregarCaixa() {
          try {
            const res = await fetch('/api/caixa/ultimo');
            const data = await res.json();
            document.getElementById('caixa-info').innerHTML = \`
              <strong>Último Concurso Caixa: #\${data.concurso}</strong><br>
              Status: <strong style="color: \${data.acumulado ? '#d32f2f' : '#2e7d32'}">\${data.acumulado ? 'ACUMULADO!' : 'Sorteado'}</strong><br>
              Prémio Estimado: <strong>R$ \${Number(data.valorEstimadoProximoConcurso).toLocaleString('pt-BR')}</strong>
            \`;
          } catch(e) {
            document.getElementById('caixa-info').innerHTML = 'Não foi possível carregar dados da Caixa agora.';
          }
        }
        carregarCaixa();

        document.getElementById('form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const body = {
            totalDezenas: 25,
            marcar: Number(document.getElementById('marcar').value),
            atrasados: Number(document.getElementById('atrasados').value),
            minPares: Number(document.getElementById('minPares').value),
            maxPares: Number(document.getElementById('maxPares').value),
            minPrimos: Number(document.getElementById('minPrimos').value),
            maxPrimos: Number(document.getElementById('maxPrimos').value)
          };

          const res = await fetch('/api/palpite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          const data = await res.json();

          const divRes = document.getElementById('resultado');
          if(!data.sucesso) {
            divRes.style.display = 'block';
            divRes.innerHTML = '<p style="color:red">'+data.mensagem+'</p>';
            return;
          }

          let bolasHtml = '';
          data.palpite.forEach(num => {
            const eAtrasado = data.estatisticasPalpite.dezenasAtrasadasInclusas.includes(num);
            const classe = eAtrasado ? 'vermelho' : 'verde';
            bolasHtml += \`<div class="bola \${classe}">\${num < 10 ? '0'+num : num}</div>\`;
          });

          divRes.style.display = 'block';
          divRes.innerHTML = \`
            <h3>Palpite Gerado:</h3>
            <div>\${bolasHtml}</div>
            <p><small>● Vermelho: Dezena atrasada incluída por regra</small></p>
            <p><strong>Pares:</strong> \${data.estatisticasPalpite.pares} | <strong>Primos:</strong> \${data.estatisticasPalpite.primos}</p>
          \`;
        });
      </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
