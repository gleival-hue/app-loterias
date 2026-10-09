const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PRIMOS_LOTOFACIL = [2, 3, 5, 7, 11, 13, 17, 19, 23];

// Calcula atraso das dezenas no histórico
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

// Rota 1: Busca o último concurso diretamente da Caixa
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

// Rota 2: Geração de Palpites
app.post('/api/palpite', (req, res) => {
  const { totalDezenas, marcar, atrasados, minPares, maxPares, minPrimos, maxPrimos } = req.body;

  // Histórico de exemplo dos últimos concursos
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

// Serve o build do React em produção
app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
