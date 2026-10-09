import React, { useState, useEffect } from 'react';

export default function GeradorPalpite() {
  const [concursoCaixa, setConcursoCaixa] = useState(null);
  const [totalDezenas, setTotalDezenas] = useState(25);
  const [dezenasParaMarcar, setDezenasParaMarcar] = useState(15);
  const [qtdAtrasados, setQtdAtrasados] = useState(3);
  const [minPares, setMinPares] = useState(7);
  const [maxPares, setMaxPares] = useState(8);
  const [minPrimos, setMinPrimos] = useState(5);
  const [maxPrimos, setMaxPrimos] = useState(6);

  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/caixa/ultimo')
      .then((res) => res.json())
      .then((data) => setConcursoCaixa(data))
      .catch(() => console.log('Servidor backend offline ou falha ao carregar Caixa.'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    setResultado(null);

    const payload = {
      totalDezenas: Number(totalDezenas),
      marcar: Number(dezenasParaMarcar),
      atrasados: Number(qtdAtrasados),
      minPares: Number(minPares),
      maxPares: Number(maxPares),
      minPrimos: Number(minPrimos),
      maxPrimos: Number(maxPrimos)
    };

    try {
      const response = await fetch('http://localhost:3001/api/palpite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok || !data.sucesso) throw new Error(data.mensagem || 'Erro ao gerar palpite.');
      setResultado(data);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={styles.container}>
      {concursoCaixa && (
        <div style={styles.caixaBox}>
          <h3>Último Concurso Caixa: #{concursoCaixa.concurso}</h3>
          <p>
            Status:{' '}
            <strong style={{ color: concursoCaixa.acumulado ? '#d32f2f' : '#2e7d32' }}>
              {concursoCaixa.acumulado ? 'ACUMULADO!' : 'Sorteado'}
            </strong>
          </p>
          <p>Prêmio Estimado: <strong>R$ {concursoCaixa.valorEstimadoProximoConcurso?.toLocaleString('pt-BR')}</strong></p>
        </div>
      )}

      <h2>Gerador de Palpites Estatístico</h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.gridGroup}>
          <div style={styles.field}>
            <label style={styles.label}>Dezenas no Volante:</label>
            <input type="number" value={totalDezenas} onChange={(e) => setTotalDezenas(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Dezenas a Marcar:</label>
            <input type="number" value={dezenasParaMarcar} onChange={(e) => setDezenasParaMarcar(e.target.value)} style={styles.input} />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            Forçar Nº Dezenas Atrasadas: <strong>{qtdAtrasados}</strong>
          </label>
          <input type="range" min="0" max="10" value={qtdAtrasados} onChange={(e) => setQtdAtrasados(e.target.value)} style={styles.slider} />
        </div>

        <div style={styles.gridGroup}>
          <div style={styles.field}>
            <label style={styles.label}>Mín. Pares:</label>
            <input type="number" value={minPares} onChange={(e) => setMinPares(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Máx. Pares:</label>
            <input type="number" value={maxPares} onChange={(e) => setMaxPares(e.target.value)} style={styles.input} />
          </div>
        </div>

        <div style={styles.gridGroup}>
          <div style={styles.field}>
            <label style={styles.label}>Mín. Primos:</label>
            <input type="number" value={minPrimos} onChange={(e) => setMinPrimos(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Máx. Primos:</label>
            <input type="number" value={maxPrimos} onChange={(e) => setMaxPrimos(e.target.value)} style={styles.input} />
          </div>
        </div>

        <button type="submit" disabled={carregando} style={styles.button}>
          {carregando ? 'Calculando Palpite...' : 'Gerar Palpite Filtrado'}
        </button>
      </form>

      {erro && <div style={styles.erroBox}>⚠️ {erro}</div>}

      {resultado && (
        <div style={styles.resultadoContainer}>
          <h3>Seu Palpite Gerado:</h3>
          <div style={styles.dezenasGrid}>
            {resultado.palpite.map((num) => {
              const eAtrasado = resultado.estatisticasPalpite.dezenasAtrasadasInclusas.includes(num);
              return (
                <div key={num} style={{ ...styles.bola, backgroundColor: eAtrasado ? '#d32f2f' : '#2e7d32' }}>
                  {num < 10 ? `0${num}` : num}
                </div>
              );
            })}
          </div>
          <div style={styles.resumoEstatistico}>
            <p><strong>Pares / Ímpares:</strong> {resultado.estatisticasPalpite.pares} pares / {resultado.estatisticasPalpite.impares} ímpares</p>
            <p><strong>Primos:</strong> {resultado.estatisticasPalpite.primos}</p>
            <p><strong>Dezenas Atrasadas:</strong> {resultado.estatisticasPalpite.dezenasAtrasadasInclusas.join(', ')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '550px', margin: '30px auto', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', backgroundColor: '#fff', fontFamily: 'Arial, sans-serif' },
  caixaBox: { backgroundColor: '#e3f2fd', padding: '12px', borderRadius: '8px', marginBottom: '20px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  gridGroup: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 'bold' },
  input: { padding: '8px', borderRadius: '6px', border: '1px solid #ccc' },
  slider: { width: '100%' },
  button: { padding: '12px', backgroundColor: '#0288d1', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  erroBox: { marginTop: '20px', padding: '12px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '6px' },
  resultadoContainer: { marginTop: '24px', paddingTop: '20px', borderTop: '2px dashed #eee' },
  dezenasGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '16px 0' },
  bola: { width: '40px', height: '40px', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  resumoEstatistico: { backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', fontSize: '13px' }
};
